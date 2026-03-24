import { PrismaService } from '../common/prisma.service';
import { WorldStateService, WorldStateSnapshot } from './world-state.service';
import { AccuracyMonitorService } from './accuracy-monitor.service';
export interface AgentPersona {
    id: string;
    name: string;
    role: string;
    systemPrompt: string;
    riskAppetite: number;
    timeHorizon: 'short' | 'medium' | 'long';
}
export interface AgentThought {
    agentId: string;
    agentName: string;
    persona: string;
    thoughtProcess: string;
    predictedAction: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
    confidence: number;
    reasoning: string;
    relevantEntities: string[];
    timestamp: Date;
}
export interface DebateRound {
    round: number;
    thoughts: AgentThought[];
    consensus?: string;
    disagreement?: string;
}
export interface SimulationResult {
    simulationId: string;
    worldStateVersion: number;
    debateRounds: DebateRound[];
    finalVerdict: string;
    swarmAgreement: number;
    agentOpinions: AgentThought[];
    timestamp: Date;
}
export declare class ShadowSimulationService {
    private prisma;
    private worldState;
    private accuracyMonitor;
    private readonly logger;
    private readonly AGENT_PERSONAS;
    constructor(prisma: PrismaService, worldState: WorldStateService, accuracyMonitor: AccuracyMonitorService);
    runShadowSimulation(symbol: string, worldState?: WorldStateSnapshot): Promise<SimulationResult>;
    private generateAgentThoughts;
    private generateSingleThought;
    private getRelevantEntities;
    private performAnalysis;
    private calculateMarketSentiment;
    private analyzeEntitySentiment;
    private whaleStrategy;
    private scalperStrategy;
    private fundamentalStrategy;
    private generateCounterArguments;
    private generateCounterReasoning;
    private identifyDisagreement;
    private calculateAgreement;
    private determineVerdict;
}
