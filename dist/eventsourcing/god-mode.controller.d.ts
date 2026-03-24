import { EventSourcingService } from './event-sourcing.service';
import { GraphRAGService } from '../graphrag/graphrag.service';
import { AgentInferenceEngine } from '../agents/agent-inference.engine';
import { PrismaService } from '../common/prisma.service';
export interface GlobalEventInput {
    title: string;
    description?: string;
    event_type: string;
    currency_pair: string;
    impact_score: number;
    source?: string;
}
export interface ReflectionResult {
    affectedAgents: number;
    newPositions: number;
    consensusShift: number;
    timestamp: Date;
}
export declare class GodModeController {
    private eventSourcing;
    private graphRAG;
    private inferenceEngine;
    private prisma;
    constructor(eventSourcing: EventSourcingService, graphRAG: GraphRAGService, inferenceEngine: AgentInferenceEngine, prisma: PrismaService);
    injectGlobalEvent(simulationId: string, eventData: GlobalEventInput): Promise<ReflectionResult>;
    private triggerReflectionLoop;
    getKnowledgeGraphState(): Promise<any>;
}
