import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { PersistentMemoryService } from '../memory/memory.service';

export interface AgentWeight {
  agentId: string;
  persona: string;
  weight: number;          // 0.1 - 2.0, starts at 1.0
  winRate: number;
  totalTrades: number;
  consecutiveLosses: number;
  lastUpdated: Date;
}

export interface LearningState {
  confidenceThreshold: number;   // dynamic, starts at 0.65
  agreementThreshold: number;    // dynamic, starts at 0.66
  agentWeights: Record<string, AgentWeight>;
  overallWinRate: number;
  learningCycles: number;
  lastReflection: Date;
}

@Injectable()
export class SelfLearningService implements OnModuleInit {
  private readonly logger = new Logger(SelfLearningService.name);

  // In-memory learning state (persisted to DB periodically)
  private state: LearningState = {
    confidenceThreshold: 0.65,
    agreementThreshold: 0.66,
    agentWeights: {},
    overallWinRate: 0.5,
    learningCycles: 0,
    lastReflection: new Date(),
  };

  // Bounds for dynamic thresholds
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.55;
  private readonly MAX_CONFIDENCE_THRESHOLD = 0.85;
  private readonly MIN_AGREEMENT_THRESHOLD = 0.50;
  private readonly MAX_AGREEMENT_THRESHOLD = 0.90;
  private readonly MIN_AGENT_WEIGHT = 0.1;
  private readonly MAX_AGENT_WEIGHT = 2.0;

  constructor(
    private prisma: PrismaService,
    private memory: PersistentMemoryService,
  ) {}

  async onModuleInit() {
    await this.loadState();
    this.logger.log(
      `SelfLearning initialized — confidence=${this.state.confidenceThreshold.toFixed(2)}, ` +
      `agreement=${this.state.agreementThreshold.toFixed(2)}, ` +
      `cycles=${this.state.learningCycles}`
    );
  }

  // Run every 30 minutes — reflect on recent outcomes
  @Cron('0 */30 * * * *')
  async reflect(): Promise<void> {
    this.logger.log('Starting self-reflection cycle...');

    try {
      await this.updateOutcomeBasedWeights();
      await this.adjustDynamicThresholds();
      await this.writeTraumaMemories();
      await this.writeSuccessMemories();
      await this.saveState();

      this.state.learningCycles++;
      this.state.lastReflection = new Date();

      this.logger.log(
        `Reflection complete — cycle #${this.state.learningCycles} | ` +
        `winRate=${(this.state.overallWinRate * 100).toFixed(1)}% | ` +
        `confidence gate=${this.state.confidenceThreshold.toFixed(2)} | ` +
        `agreement gate=${this.state.agreementThreshold.toFixed(2)}`
      );
    } catch (error) {
      this.logger.error(`Reflection failed: ${error}`);
    }
  }

  // --- Core learning methods ---

  private async updateOutcomeBasedWeights(): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

    const logs = await this.prisma.shadowTradeLog.findMany({
      where: {
        created_at: { gte: since },
        outcome_15m: { not: 'PENDING' },
      },
    });

    if (logs.length === 0) return;

    // Group by persona
    const byPersona = new Map<string, { correct: number; total: number }>();
    for (const log of logs) {
      const key = log.agent_persona;
      const existing = byPersona.get(key) || { correct: 0, total: 0 };
      existing.total++;
      if (log.outcome_15m === 'CORRECT') existing.correct++;
      byPersona.set(key, existing);
    }

    // Update weights per persona
    for (const [persona, stats] of byPersona) {
      const winRate = stats.correct / stats.total;
      const existing = this.state.agentWeights[persona] || {
        agentId: persona.toLowerCase(),
        persona,
        weight: 1.0,
        winRate: 0.5,
        totalTrades: 0,
        consecutiveLosses: 0,
        lastUpdated: new Date(),
      };

      // Adjust weight: good performers get more influence, bad ones less
      let newWeight = existing.weight;
      if (winRate > 0.6) {
        newWeight = Math.min(this.MAX_AGENT_WEIGHT, existing.weight * 1.1);
      } else if (winRate < 0.4) {
        newWeight = Math.max(this.MIN_AGENT_WEIGHT, existing.weight * 0.85);
      }

      // Track consecutive losses
      const recentLogs = logs
        .filter(l => l.agent_persona === persona)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .slice(0, 5);

      const consecutiveLosses = recentLogs.findIndex(l => l.outcome_15m === 'CORRECT');
      const actualConsecutiveLosses = consecutiveLosses === -1 ? recentLogs.length : consecutiveLosses;

      this.state.agentWeights[persona] = {
        ...existing,
        weight: newWeight,
        winRate,
        totalTrades: existing.totalTrades + stats.total,
        consecutiveLosses: actualConsecutiveLosses,
        lastUpdated: new Date(),
      };

      this.logger.log(
        `Agent weight update: ${persona} | winRate=${(winRate * 100).toFixed(0)}% | weight=${newWeight.toFixed(2)}`
      );
    }

    // Overall win rate
    const totalCorrect = logs.filter(l => l.outcome_15m === 'CORRECT').length;
    this.state.overallWinRate = totalCorrect / logs.length;
  }

  private async adjustDynamicThresholds(): Promise<void> {
    const winRate = this.state.overallWinRate;

    // If losing more than winning — raise the bar
    if (winRate < 0.40) {
      this.state.confidenceThreshold = Math.min(
        this.MAX_CONFIDENCE_THRESHOLD,
        this.state.confidenceThreshold + 0.03,
      );
      this.state.agreementThreshold = Math.min(
        this.MAX_AGREEMENT_THRESHOLD,
        this.state.agreementThreshold + 0.03,
      );
      this.logger.warn(
        `Win rate low (${(winRate * 100).toFixed(0)}%) — raising thresholds: ` +
        `confidence=${this.state.confidenceThreshold.toFixed(2)}, ` +
        `agreement=${this.state.agreementThreshold.toFixed(2)}`
      );
    }

    // If winning consistently — can relax thresholds slightly
    if (winRate > 0.65) {
      this.state.confidenceThreshold = Math.max(
        this.MIN_CONFIDENCE_THRESHOLD,
        this.state.confidenceThreshold - 0.01,
      );
      this.state.agreementThreshold = Math.max(
        this.MIN_AGREEMENT_THRESHOLD,
        this.state.agreementThreshold - 0.01,
      );
      this.logger.log(
        `Win rate strong (${(winRate * 100).toFixed(0)}%) — relaxing thresholds slightly`
      );
    }

    // Emergency brake — if any agent has 5+ consecutive losses, pause that persona
    for (const [persona, weight] of Object.entries(this.state.agentWeights)) {
      if (weight.consecutiveLosses >= 5) {
        this.state.agentWeights[persona].weight = this.MIN_AGENT_WEIGHT;
        this.logger.warn(`${persona} has ${weight.consecutiveLosses} consecutive losses — weight floored`);
      }
    }
  }

  private async writeTraumaMemories(): Promise<void> {
    // Find recent incorrect predictions and write trauma to those agents
    const incorrectLogs = await this.prisma.shadowTradeLog.findMany({
      where: {
        outcome_15m: 'INCORRECT',
        created_at: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
      },
    });

    for (const log of incorrectLogs) {
      try {
        await this.memory.addTraumaMemory(
          log.agent_id,
          `Wrong prediction: ${log.predicted_action} on ${log.agent_persona} at price ${log.entry_price}. ` +
          `Outcome was INCORRECT at 15m. Confidence was ${(log.confidence * 100).toFixed(0)}%.`,
          {
            predictedAction: log.predicted_action,
            entryPrice: log.entry_price,
            outcome: log.outcome_15m,
            simulationId: log.simulation_id,
          },
        );
      } catch {
        // agent may not exist in profile table
      }
    }

    if (incorrectLogs.length > 0) {
      this.logger.log(`Wrote ${incorrectLogs.length} trauma memories`);
    }
  }

  private async writeSuccessMemories(): Promise<void> {
    const correctLogs = await this.prisma.shadowTradeLog.findMany({
      where: {
        outcome_15m: 'CORRECT',
        created_at: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });

    for (const log of correctLogs) {
      try {
        await this.memory.addSuccessMemory(
          log.agent_id,
          `Correct prediction: ${log.predicted_action} on ${log.agent_persona} at price ${log.entry_price}. ` +
          `Outcome was CORRECT at 15m. Confidence was ${(log.confidence * 100).toFixed(0)}%.`,
          {
            predictedAction: log.predicted_action,
            entryPrice: log.entry_price,
            outcome: log.outcome_15m,
            simulationId: log.simulation_id,
          },
        );
      } catch {
        // agent may not exist in profile table
      }
    }

    if (correctLogs.length > 0) {
      this.logger.log(`Wrote ${correctLogs.length} success memories`);
    }
  }

  // --- State persistence ---

  private async saveState(): Promise<void> {
    // Delete old state and insert fresh (simpler than upsert on non-unique field)
    await this.prisma.contextFragment.deleteMany({
      where: { entity_type: 'LEARNING_STATE', entity_label: 'self-learning' },
    });
    await this.prisma.contextFragment.create({
      data: {
        entity_type: 'LEARNING_STATE',
        entity_label: 'self-learning',
        content: JSON.stringify(this.state),
        source_type: 'SELF_LEARNING',
      },
    });
  }

  private async loadState(): Promise<void> {
    try {
      const saved = await this.prisma.contextFragment.findFirst({
        where: { entity_type: 'LEARNING_STATE', entity_label: 'self-learning' },
        orderBy: { created_at: 'desc' },
      });
      if (saved) {
        this.state = JSON.parse(saved.content);
        this.logger.log('Loaded previous learning state from DB');
      }
    } catch {
      this.logger.log('No previous learning state — starting fresh');
    }
  }

  // --- Public API for TradeExecutor ---

  getConfidenceThreshold(): number {
    return this.state.confidenceThreshold;
  }

  getAgreementThreshold(): number {
    return this.state.agreementThreshold;
  }

  getAgentWeight(persona: string): number {
    return this.state.agentWeights[persona]?.weight ?? 1.0;
  }

  getLearningState(): LearningState {
    return { ...this.state };
  }
}
