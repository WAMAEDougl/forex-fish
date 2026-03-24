import { PrismaService } from '../common/prisma.service';
export interface AgentInteractionData {
    simulationId: string;
    agentId: string;
    targetAgentId?: string;
    action: 'POST_ANALYSIS' | 'COUNTER_ARGUMENT' | 'FOLLOW_LEADER';
    content: string;
    reasoning?: string;
}
export interface InteractionResult {
    id: string;
    simulationId: string;
    agentId: string;
    action: string;
    content: string;
    sentiment: string;
    timestamp: Date;
}
export declare class InteractionEngine {
    private prisma;
    constructor(prisma: PrismaService);
    enqueueInteraction(data: AgentInteractionData): Promise<string>;
    enqueueBulkInteractions(interactions: AgentInteractionData[]): Promise<string[]>;
    getInteractionStats(simulationId: string): Promise<{
        total: any;
        byAction: Record<string, number>;
        uniqueAgents: number;
    }>;
    processInteraction(job: {
        data: AgentInteractionData;
    }): Promise<InteractionResult>;
    private analyzeInteractionSentiment;
}
