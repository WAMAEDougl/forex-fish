import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZeromqService } from '../zeromq/zeromq.service';
import { PrismaService } from '../common/prisma.service';
import { SimulationResult } from '../grounding/shadow-simulation.service';
import { SelfLearningService } from '../learning/self-learning.service';

export interface TradeDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  volume: number;
  confidence: number;
  swarmAgreement: number;
  reasoning: string;
  simulationId: string;
}

export interface ExecutedTrade {
  id: string;
  symbol: string;
  action: string;
  volume: number;
  confidence: number;
  swarmAgreement: number;
  ticket?: number;
  success: boolean;
  error?: string;
  executedAt: Date;
}

@Injectable()
export class TradeExecutorService implements OnModuleInit {
  private readonly logger = new Logger(TradeExecutorService.name);

  // Risk management config
  private readonly MIN_CONFIDENCE = 0.65;       // min agent confidence
  private readonly MIN_AGREEMENT = 0.66;         // min swarm agreement (2/3)
  private readonly BASE_VOLUME = 0.01;           // base lot size
  private readonly MAX_VOLUME = 0.1;             // max lot size
  private readonly MAX_OPEN_TRADES = 3;          // max concurrent positions
  private readonly MAGIC_NUMBER = 888999;        // identifies our trades in MT5
  private autonomousEnabled: boolean;

  constructor(
    private zeromq: ZeromqService,
    private prisma: PrismaService,
    private config: ConfigService,
    private learning: SelfLearningService,
  ) {
    this.autonomousEnabled = this.config.get('AUTONOMOUS_TRADING_ENABLED') === 'true';
  }

  async onModuleInit() {
    this.logger.log(
      `TradeExecutor initialized — autonomous trading: ${this.autonomousEnabled ? 'ENABLED' : 'DISABLED'}`
    );
  }

  async evaluateAndExecute(
    simulationResult: SimulationResult,
    symbol: string,
  ): Promise<ExecutedTrade | null> {
    if (!this.autonomousEnabled) {
      this.logger.debug('Autonomous trading disabled — skipping execution');
      return null;
    }

    const decision = this.buildDecision(simulationResult, symbol);

    if (!decision) return null;

    this.logger.log(
      `Trade signal: ${decision.action} ${decision.symbol} | ` +
      `confidence=${(decision.confidence * 100).toFixed(0)}% | ` +
      `agreement=${(decision.swarmAgreement * 100).toFixed(0)}%`
    );

    // Check open positions limit
    const openCount = await this.getOpenTradeCount();
    if (openCount >= this.MAX_OPEN_TRADES) {
      this.logger.warn(`Max open trades (${this.MAX_OPEN_TRADES}) reached — skipping`);
      return null;
    }

    return this.executeTrade(decision);
  }

  private buildDecision(
    result: SimulationResult,
    symbol: string,
  ): TradeDecision | null {
    // Parse verdict — format is "BUY - Strong swarm consensus" or "HOLD - ..."
    const verdictParts = result.finalVerdict.split(' - ');
    const action = verdictParts[0].trim().toUpperCase() as 'BUY' | 'SELL' | 'HOLD';

    if (action === 'HOLD' || action === 'WAIT' as any) return null;
    if (!['BUY', 'SELL'].includes(action)) return null;

    // Gate on confidence and agreement — use dynamic thresholds from self-learning
    const minConfidence = this.learning.getConfidenceThreshold();
    const minAgreement = this.learning.getAgreementThreshold();

    // Weight agent opinions by their learned performance
    const weightedConfidence =
      result.agentOpinions.reduce((sum, a) => {
        const w = this.learning.getAgentWeight(a.persona);
        return sum + a.confidence * w;
      }, 0) /
      Math.max(
        result.agentOpinions.reduce((sum, a) => sum + this.learning.getAgentWeight(a.persona), 0),
        1,
      );

    if (weightedConfidence < minConfidence) {
      this.logger.debug(`Weighted confidence too low: ${weightedConfidence.toFixed(2)} < ${minConfidence}`);
      return null;
    }

    if (result.swarmAgreement < minAgreement) {
      this.logger.debug(`Agreement too low: ${result.swarmAgreement.toFixed(2)} < ${minAgreement}`);
      return null;
    }

    const volume = Math.min(
      this.MAX_VOLUME,
      parseFloat((this.BASE_VOLUME * (weightedConfidence / minConfidence)).toFixed(2)),
    );

    return {
      symbol,
      action,
      volume,
      confidence: weightedConfidence,
      swarmAgreement: result.swarmAgreement,
      reasoning: result.finalVerdict,
      simulationId: result.simulationId,
    };
  }

  private async executeTrade(decision: TradeDecision): Promise<ExecutedTrade> {
    const executedAt = new Date();

    try {
      const result =
        decision.action === 'BUY'
          ? await this.zeromq.buy(decision.symbol, decision.volume, 0, this.MAGIC_NUMBER)
          : await this.zeromq.sell(decision.symbol, decision.volume, 0, this.MAGIC_NUMBER);

      const trade: ExecutedTrade = {
        id: decision.simulationId,
        symbol: decision.symbol,
        action: decision.action,
        volume: decision.volume,
        confidence: decision.confidence,
        swarmAgreement: decision.swarmAgreement,
        ticket: (result.data as any)?.ticket,
        success: result.success,
        error: result.error,
        executedAt,
      };

      if (result.success) {
        this.logger.log(
          `Trade executed: ${decision.action} ${decision.volume} ${decision.symbol} | ticket=${trade.ticket}`
        );
      } else {
        this.logger.error(`Trade failed: ${result.error}`);
      }

      await this.logTrade(trade, decision);
      return trade;
    } catch (error) {
      this.logger.error(`Trade execution error: ${error}`);
      return {
        id: decision.simulationId,
        symbol: decision.symbol,
        action: decision.action,
        volume: decision.volume,
        confidence: decision.confidence,
        swarmAgreement: decision.swarmAgreement,
        success: false,
        error: String(error),
        executedAt,
      };
    }
  }

  private async logTrade(trade: ExecutedTrade, decision: TradeDecision): Promise<void> {
    try {
      await this.prisma.shadowTradeLog.create({
        data: {
          agent_id: 'swarm-executor',
          agent_persona: 'SWARM',
          simulation_id: decision.simulationId,
          predicted_action: decision.action as any,
          predicted_direction: decision.action === 'BUY' ? 'up' : 'down',
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          thought_process: {
            swarmAgreement: decision.swarmAgreement,
            ticket: trade.ticket,
            success: trade.success,
            error: trade.error,
          } as any,
          entry_price: 0,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log trade: ${error}`);
    }
  }

  private async getOpenTradeCount(): Promise<number> {
    try {
      const result = await this.zeromq.getOpenPositions();
      const positions = result.data as any[];
      if (Array.isArray(positions)) {
        return positions.filter(p => p.magic === this.MAGIC_NUMBER).length;
      }
    } catch {
      // ZeroMQ not available
    }
    return 0;
  }

  isEnabled(): boolean {
    return this.autonomousEnabled;
  }

  enable(): void {
    this.autonomousEnabled = true;
    this.logger.log('Autonomous trading ENABLED');
  }

  disable(): void {
    this.autonomousEnabled = false;
    this.logger.log('Autonomous trading DISABLED');
  }
}
