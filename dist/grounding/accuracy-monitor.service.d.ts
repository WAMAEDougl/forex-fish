import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
type PredictionActionType = 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
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
export declare class AccuracyMonitorService implements OnModuleInit {
    private prisma;
    private readonly logger;
    private updateInterval;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    logPrediction(input: PredictionLogInput): Promise<string>;
    updateOutcomes(): Promise<void>;
    private getCurrentPrice;
    getAccuracyMetrics(hoursBack?: number): Promise<AccuracyMetrics>;
    private getSwarmVerdicts;
    generateSentimentVsRealityReport(): Promise<{
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
    }>;
    private startOutcomeUpdater;
    onModuleDestroy(): Promise<void>;
}
export {};
