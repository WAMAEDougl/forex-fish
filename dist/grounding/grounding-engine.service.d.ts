import { OnModuleInit } from '@nestjs/common';
import { NewsIngestorService } from './news-ingestor.service';
import { WorldStateService, WorldStateSnapshot } from './world-state.service';
import { ShadowSimulationService, SimulationResult } from './shadow-simulation.service';
import { AccuracyMonitorService, AccuracyMetrics } from './accuracy-monitor.service';
import { MetaTraderService, TickData } from '../mt5/meta-trader.service';
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
export declare class GroundingEngineService implements OnModuleInit {
    private newsIngestor;
    private worldState;
    private shadowSimulation;
    private accuracyMonitor;
    private metaTrader;
    private readonly logger;
    private lastWorldState;
    private lastTickData;
    private groundingInterval;
    constructor(newsIngestor: NewsIngestorService, worldState: WorldStateService, shadowSimulation: ShadowSimulationService, accuracyMonitor: AccuracyMonitorService, metaTrader: MetaTraderService);
    onModuleInit(): Promise<void>;
    scheduledGrounding(): Promise<void>;
    private startGroundingLoop;
    runGroundingCycle(): Promise<GroundingCycleResult>;
    private getRelevantTicks;
    getWorldState(): Promise<WorldStateSnapshot | null>;
    getContextForQuery(query: string): Promise<{
        entities: Array<{
            type: string;
            label: string;
        }>;
        relationships: Array<{
            source: string;
            target: string;
            type: string;
        }>;
        context: string;
    }>;
    runManualSimulation(symbol: string): Promise<SimulationResult>;
    getAccuracyMetrics(hoursBack?: number): Promise<AccuracyMetrics>;
    getSentimentVsRealityReport(): Promise<SentimentVsRealityReport>;
    getLatestTicks(): Promise<TickData[]>;
}
