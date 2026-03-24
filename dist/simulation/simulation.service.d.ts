import { OnModuleInit } from '@nestjs/common';
import { AgentInferenceEngine } from '../agents/agent-inference.engine';
import { AgentPersona, AgentInferenceResult, MarketBiasSignal } from '../common/interfaces/agent.interface';
export declare class SimulationService implements OnModuleInit {
    private readonly logger;
    private prisma;
    private inferenceEngine;
    private activeAgents;
    constructor();
    onModuleInit(): Promise<void>;
    createAgentProfile(data: {
        name: string;
        persona: string;
        risk_appetite: number;
        strategy_type: string;
        capital: number;
    }): Promise<any>;
    createEconomicEvent(data: {
        title: string;
        description?: string;
        impact_score: number;
        currency_pair: string;
        event_type: string;
        source?: string;
    }): Promise<any>;
    startSimulation(eventId: string): Promise<any>;
    initializeSwarm(eventId: string): Promise<AgentPersona[]>;
    runSwarmInference(simulationId: string, swarm: AgentPersona[], event: any): Promise<AgentInferenceResult[]>;
    getAgentActivity(simId: string): Promise<any>;
    getMarketSentiment(): Promise<MarketBiasSignal>;
    getSimulationRun(id: string): Promise<any>;
    getAllSimulationRuns(): Promise<any>;
    getActiveAgents(): AgentPersona[];
    getInferenceEngine(): AgentInferenceEngine;
}
