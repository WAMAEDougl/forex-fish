import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type PredictionActionType = 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
type ShadowOutcomeType = 'PENDING' | 'CORRECT' | 'INCORRECT' | 'PARTIAL';

export interface PredictionLogInput {
  simulationId: string;
  agentId: string;
  agentPersona: string;
  predictedAction: PredictionActionType;
  predictedDirection: string;
  confidence: number;
  reasoning?: string;
  thoughtProcess?: {
    reasoning: string;
    relevantEntities: string[];
  };
  entryPrice: number;
  symbol: string;
}

export interface AccuracyMetrics {
  totalPredictions: number;
  correct5m: number;
  correct15m: number;
  correct60m: number;
  accuracy5m: number;
  accuracy15m: number;
  accuracy60m: number;
  byPersona: Record<string, {
    predictions: number;
    accuracy: number;
  }>;
  swarmAccuracy: number;
}

@Injectable()
export class AccuracyMonitorService implements OnModuleInit {
  private readonly logger = new Logger(AccuracyMonitorService.name);
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.startOutcomeUpdater();
  }

  async logPrediction(input: PredictionLogInput): Promise<string> {
    const log = await this.prisma.shadowTradeLog.create({
      data: {
        agent_id: input.agentId,
        agent_persona: input.agentPersona,
        simulation_id: input.simulationId,
        predicted_action: input.predictedAction,
        predicted_direction: input.predictedDirection,
        confidence: input.confidence,
        reasoning: input.reasoning,
        thought_process: input.thoughtProcess as any,
        entry_price: input.entryPrice,
        outcome_5m: 'PENDING',
        outcome_15m: 'PENDING',
        outcome_60m: 'PENDING',
      },
    });

    this.logger.log(
      `Logged prediction: ${input.agentPersona} -> ${input.predictedAction} at ${input.entryPrice}`
    );

    return log.id;
  }

  async updateOutcomes(): Promise<void> {
    const pendingLogs = await this.prisma.shadowTradeLog.findMany({
      where: {
        OR: [
          { outcome_5m: 'PENDING' as ShadowOutcomeType },
          { outcome_15m: 'PENDING' as ShadowOutcomeType },
          { outcome_60m: 'PENDING' as ShadowOutcomeType },
        ],
      },
      orderBy: { entry_time: 'asc' },
    });

    const now = new Date();

    for (const log of pendingLogs) {
      const entryTime = new Date(log.entry_time);
      const minutesElapsed = (now.getTime() - entryTime.getTime()) / 60000;

      const currentPrice = await this.getCurrentPrice(log.entry_price, log.agent_persona);
      
      if (!currentPrice) continue;

      const priceChange = (currentPrice - log.entry_price) / log.entry_price;
      const predictedDirection = log.predicted_direction;
      const actualDirection = priceChange > 0.0005 ? 'up' : priceChange < -0.0005 ? 'down' : 'neutral';
      const wasCorrect = predictedDirection === actualDirection || 
        (log.predicted_action === 'HOLD' && actualDirection === 'neutral');

      const updateData: Record<string, string> = {};

      if (minutesElapsed >= 5 && log.outcome_5m === 'PENDING') {
        updateData.outcome_5m = wasCorrect ? 'CORRECT' : 'INCORRECT';
      }

      if (minutesElapsed >= 15 && log.outcome_15m === 'PENDING') {
        updateData.outcome_15m = wasCorrect ? 'CORRECT' : 'INCORRECT';
      }

      if (minutesElapsed >= 60 && log.outcome_60m === 'PENDING') {
        updateData.outcome_60m = wasCorrect ? 'CORRECT' : 'INCORRECT';
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.shadowTradeLog.update({
          where: { id: log.id },
          data: updateData as never,
        });
      }
    }

    if (pendingLogs.length > 0) {
      this.logger.log(`Updated outcomes for ${pendingLogs.length} predictions`);
    }
  }

  private async getCurrentPrice(
    _originalPrice: number,
    _persona: string,
  ): Promise<number | null> {
    const variation = (Math.random() - 0.5) * 0.002;
    return _originalPrice * (1 + variation);
  }

  async getAccuracyMetrics(
    hoursBack: number = 24,
  ): Promise<AccuracyMetrics> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const logs = await this.prisma.shadowTradeLog.findMany({
      where: {
        created_at: { gte: since },
      },
    });

    if (logs.length === 0) {
      return {
        totalPredictions: 0,
        correct5m: 0,
        correct15m: 0,
        correct60m: 0,
        accuracy5m: 0,
        accuracy15m: 0,
        accuracy60m: 0,
        byPersona: {},
        swarmAccuracy: 0,
      };
    }

    const completed5m = logs.filter(l => l.outcome_5m !== 'PENDING');
    const completed15m = logs.filter(l => l.outcome_15m !== 'PENDING');
    const completed60m = logs.filter(l => l.outcome_60m !== 'PENDING');

    const correct5m = completed5m.filter(l => l.outcome_5m === 'CORRECT').length;
    const correct15m = completed15m.filter(l => l.outcome_15m === 'CORRECT').length;
    const correct60m = completed60m.filter(l => l.outcome_60m === 'CORRECT').length;

    const byPersona: Record<string, { predictions: number; accuracy: number }> = {};
    
    const personaGroups = new Map<string, typeof logs>();
    for (const log of logs) {
      const existing = personaGroups.get(log.agent_persona) || [];
      existing.push(log);
      personaGroups.set(log.agent_persona, existing);
    }

    for (const [persona, personaLogs] of personaGroups) {
      const completed = personaLogs.filter(l => l.outcome_15m !== 'PENDING');
      const correct = completed.filter(l => l.outcome_15m === 'CORRECT').length;
      
      byPersona[persona] = {
        predictions: personaLogs.length,
        accuracy: completed.length > 0 ? correct / completed.length : 0,
      };
    }

    const swarmVerdicts = await this.getSwarmVerdicts(since);
    const swarmCorrect = Object.values(swarmVerdicts).filter(v => v.wasCorrect).length;
    const swarmTotal = Object.keys(swarmVerdicts).length;

    return {
      totalPredictions: logs.length,
      correct5m,
      correct15m,
      correct60m,
      accuracy5m: completed5m.length > 0 ? correct5m / completed5m.length : 0,
      accuracy15m: completed15m.length > 0 ? correct15m / completed15m.length : 0,
      accuracy60m: completed60m.length > 0 ? correct60m / completed60m.length : 0,
      byPersona,
      swarmAccuracy: swarmTotal > 0 ? swarmCorrect / swarmTotal : 0,
    };
  }

  private async getSwarmVerdicts(
    since: Date,
  ): Promise<Record<string, { verdict: string; wasCorrect: boolean }>> {
    const simulations = await this.prisma.shadowTradeLog.groupBy({
      by: ['simulation_id'],
      where: {
        created_at: { gte: since },
      },
    });

    const verdicts: Record<string, { verdict: string; wasCorrect: boolean }> = {};

    for (const sim of simulations) {
      const logs = await this.prisma.shadowTradeLog.findMany({
        where: { simulation_id: sim.simulation_id },
      });

      const actions = logs.map(l => ({ action: l.predicted_action, confidence: l.confidence }));
      
      const actionWeights = actions.reduce((acc, a) => {
        acc[a.action] = (acc[a.action] || 0) + a.confidence;
        return acc;
      }, {} as Record<string, number>);

      const verdict = Object.entries(actionWeights).sort((a, b) => Number(b[1]) - Number(a[1]))[0][0];
      const completed = logs.filter(l => l.outcome_15m !== 'PENDING');
      
      if (completed.length > 0) {
        const correct = completed.filter(l => l.predicted_action === verdict).length;
        verdicts[sim.simulation_id] = {
          verdict,
          wasCorrect: correct > completed.length / 2,
        };
      }
    }

    return verdicts;
  }

  async generateSentimentVsRealityReport(): Promise<{
    generatedAt: Date;
    metrics: AccuracyMetrics;
    recentPredictions: Array<{
      agent: string;
      action: string;
      confidence: number;
      outcome5m: string;
      outcome15m: string;
      outcome60m: string;
    }>;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const metrics = await this.getAccuracyMetrics(168);

    const recentPredictions = await this.prisma.shadowTradeLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        agent_persona: true,
        predicted_action: true,
        confidence: true,
        outcome_5m: true,
        outcome_15m: true,
        outcome_60m: true,
      },
    });

    const recentAccuracy = recentPredictions.filter(p => p.outcome_15m === 'CORRECT').length / 
      recentPredictions.filter(p => p.outcome_15m !== 'PENDING').length || 0;
    
    const olderPredictions = await this.prisma.shadowTradeLog.findMany({
      where: {
        created_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        outcome_15m: { not: 'PENDING' as ShadowOutcomeType },
      },
      take: 50,
      select: { outcome_15m: true },
    });

    const olderAccuracy = olderPredictions.filter(p => p.outcome_15m === 'CORRECT').length / 
      olderPredictions.length || 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAccuracy > olderAccuracy + 0.1) trend = 'improving';
    else if (recentAccuracy < olderAccuracy - 0.1) trend = 'declining';

    return {
      generatedAt: new Date(),
      metrics,
      recentPredictions: recentPredictions.map(p => ({
        agent: p.agent_persona,
        action: p.predicted_action,
        confidence: p.confidence,
        outcome5m: p.outcome_5m,
        outcome15m: p.outcome_15m,
        outcome60m: p.outcome_60m,
      })),
      trend,
    };
  }

  private startOutcomeUpdater(): void {
    this.updateInterval = setInterval(() => {
      this.updateOutcomes().catch(error => {
        this.logger.error(`Failed to update outcomes: ${error}`);
      });
    }, 60000);
  }

  async onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}