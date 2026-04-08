import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NewsIngestorService, SeedMaterial } from './news-ingestor.service';
import { WorldStateService, WorldStateSnapshot } from './world-state.service';
import { ShadowSimulationService, SimulationResult } from './shadow-simulation.service';
import { AccuracyMonitorService, AccuracyMetrics } from './accuracy-monitor.service';
import { MetaTraderService, TickData } from '../mt5/meta-trader.service';
import { TradeExecutorService } from '../trading/trade-executor.service';

export interface GroundingCycleResult {
  timestamp: Date;
  newsIngested: number;
  worldStateVersion: number;
  simulationResult?: SimulationResult;
  accuracyMetrics?: AccuracyMetrics;
}

export interface SentimentVsRealityReport {
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
}

@Injectable()
export class GroundingEngineService implements OnModuleInit {
  private readonly logger = new Logger(GroundingEngineService.name);
  private lastWorldState: WorldStateSnapshot | null = null;
  private lastTickData: TickData[] = [];
  private groundingInterval: NodeJS.Timeout | null = null;

  constructor(
    private newsIngestor: NewsIngestorService,
    private worldState: WorldStateService,
    private shadowSimulation: ShadowSimulationService,
    private accuracyMonitor: AccuracyMonitorService,
    private metaTrader: MetaTraderService,
    private tradeExecutor: TradeExecutorService,
  ) {}

  async onModuleInit() {
    this.metaTrader.onTick((tick) => {
      this.lastTickData.push(tick);
      if (this.lastTickData.length > 100) {
        this.lastTickData = this.lastTickData.slice(-100);
      }
    });

    this.logger.log('Grounding Engine initialized');
    await this.runGroundingCycle();
    this.startGroundingLoop();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledGrounding(): Promise<void> {
    await this.runGroundingCycle();
  }

  private startGroundingLoop(): void {
    this.groundingInterval = setInterval(() => {
      this.runGroundingCycle().catch(error => {
        this.logger.error(`Grounding cycle failed: ${error}`);
      });
    }, 5 * 60 * 1000);
  }

  async runGroundingCycle(): Promise<GroundingCycleResult> {
    const timestamp = new Date();
    this.logger.log('Starting grounding cycle...');

    let newsMaterial: SeedMaterial;
    try {
      newsMaterial = await this.newsIngestor.ingestNews();
      this.logger.log(`Ingested ${newsMaterial.newsItems.length} news items`);
    } catch (error) {
      this.logger.error(`News ingestion failed: ${error}`);
      newsMaterial = { newsItems: [], timestamp: new Date(), source: 'fallback' };
    }

    const combinedTicks = this.getRelevantTicks(newsMaterial);

    let worldState: WorldStateSnapshot;
    try {
      worldState = await this.worldState.buildWorldState(newsMaterial, combinedTicks);
      this.lastWorldState = worldState;
      this.logger.log(`Built world state v${worldState.version}`);
    } catch (error) {
      this.logger.error(`World state build failed: ${error}`);
      worldState = this.lastWorldState!;
    }

    let simulationResult: SimulationResult | undefined;
    try {
      simulationResult = await this.shadowSimulation.runShadowSimulation('EURUSD', worldState);
      this.logger.log(
        `Simulation complete: ${simulationResult.finalVerdict} (agreement: ${(simulationResult.swarmAgreement * 100).toFixed(1)}%)`
      );

      // Execute trade if autonomous trading is enabled
      const trade = await this.tradeExecutor.evaluateAndExecute(simulationResult, 'EURUSD');
      if (trade) {
        this.logger.log(
          `Autonomous trade: ${trade.success ? 'SUCCESS' : 'FAILED'} | ${trade.action} ${trade.volume} ${trade.symbol}`
        );
      }
    } catch (error) {
      this.logger.error(`Shadow simulation failed: ${error}`);
    }

    let accuracyMetrics: AccuracyMetrics | undefined;
    try {
      accuracyMetrics = await this.accuracyMonitor.getAccuracyMetrics(24);
    } catch (error) {
      this.logger.error(`Accuracy metrics failed: ${error}`);
    }

    return {
      timestamp,
      newsIngested: newsMaterial.newsItems.length,
      worldStateVersion: worldState?.version || 0,
      simulationResult,
      accuracyMetrics,
    };
  }

  private getRelevantTicks(newsMaterial: SeedMaterial): TickData[] {
    const relevantPairs = new Set<string>();
    
    for (const item of newsMaterial.newsItems) {
      if (item.currencies) {
        for (const currency of item.currencies) {
          if (currency.length === 6) {
            relevantPairs.add(currency);
          }
        }
      }
    }

    return this.lastTickData.filter(tick => 
      relevantPairs.has(tick.symbol)
    );
  }

  async getWorldState(): Promise<WorldStateSnapshot | null> {
    return this.lastWorldState || await this.worldState.getLatestWorldState();
  }

  async getContextForQuery(query: string): Promise<{
    entities: Array<{ type: string; label: string }>;
    relationships: Array<{ source: string; target: string; type: string }>;
    context: string;
  }> {
    const result = await this.worldState.getContextForQuery(query);
    
    return {
      entities: result.entities.map(e => ({ type: e.type, label: e.label })),
      relationships: result.relationships.map(r => ({
        source: r.sourceLabel,
        target: r.targetLabel,
        type: r.relationship,
      })),
      context: result.context,
    };
  }

  async runManualSimulation(symbol: string): Promise<SimulationResult> {
    const worldState = await this.getWorldState();
    return this.shadowSimulation.runShadowSimulation(symbol, worldState || undefined);
  }

  async getAccuracyMetrics(hoursBack: number = 24): Promise<AccuracyMetrics> {
    return this.accuracyMonitor.getAccuracyMetrics(hoursBack);
  }

  async getSentimentVsRealityReport(): Promise<SentimentVsRealityReport> {
    return this.accuracyMonitor.generateSentimentVsRealityReport();
  }

  async getLatestTicks(): Promise<TickData[]> {
    return this.lastTickData.slice(-20);
  }
}