import { PrismaService } from '../common/prisma.service';
export interface MemoryEntry {
    id: string;
    agentId: string;
    eventType: string;
    content: string;
    sentiment: string;
    outcome: string;
    timestamp: Date;
}
export interface AgentMemoryState {
    agentId: string;
    traumaEvents: MemoryEntry[];
    successEvents: MemoryEntry[];
    recentInteractions: MemoryEntry[];
    decisionBias: Record<string, number>;
}
export interface ZepMemoryPayload {
    content: string;
    metadata?: Record<string, any>;
    sentiment?: string;
    outcome?: string;
}
export declare class PersistentMemoryService {
    private prisma;
    private zepApiKey;
    private zepApiUrl;
    constructor(prisma: PrismaService);
    addMemory(agentId: string, payload: ZepMemoryPayload, eventType?: string): Promise<MemoryEntry>;
    addSuccessMemory(agentId: string, content: string, details: Record<string, any>): Promise<MemoryEntry>;
    addTraumaMemory(agentId: string, content: string, details: Record<string, any>): Promise<MemoryEntry>;
    getAgentMemoryState(agentId: string): Promise<AgentMemoryState>;
    searchSimilarMemories(agentId: string, query: string, limit?: number): Promise<MemoryEntry[]>;
    updateAgentLongTermMemory(agentId: string): Promise<void>;
    private syncToZepCloud;
    private deriveDecisionBias;
    private generateMemorySummary;
    private calculateTextSimilarity;
    private getAgentMemoryMemoryState;
}
