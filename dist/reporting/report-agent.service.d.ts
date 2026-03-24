import { PrismaService } from '../common/prisma.service';
export interface MarketNarrative {
    summary: string;
    herdBehavior: HerdBehaviorAnalysis;
    contrarianCoalitions: ContrarianAnalysis[];
    volatilityTriggers: VolatilityTrigger[];
    keyEvents: KeyEvent[];
    timestamp: Date;
}
export interface HerdBehaviorAnalysis {
    detected: boolean;
    dominantPersona: string;
    sentiment: string;
    strength: number;
    affectedAgents: number;
}
export interface ContrarianAnalysis {
    coalitionSize: number;
    targetPosition: string;
    confidence: number;
    supportingPersonas: string[];
    reasoning: string;
}
export interface VolatilityTrigger {
    event: string;
    impact: number;
    affectedCurrency: string;
    confidence: number;
    timestamp: Date;
}
export interface KeyEvent {
    type: string;
    description: string;
    impact: number;
    agentsAffected: number;
}
export declare class ReportAgent {
    private prisma;
    constructor(prisma: PrismaService);
    generateMarketNarrative(simulationId: string): Promise<MarketNarrative>;
    private analyzeHerdBehavior;
    private detectContrarianCoalitions;
    private identifyVolatilityTriggers;
    private extractKeyEvents;
    private generateSummary;
    private groupBySentiment;
    private getMostCommonSentiment;
    private detectSentimentShifts;
    getNarrative(simulationId: string): Promise<MarketNarrative | null>;
}
