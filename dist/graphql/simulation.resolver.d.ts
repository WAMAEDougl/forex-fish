import { PubSub } from '../common/pubsub.service';
import { SimulationService } from '../simulation/simulation.service';
import { GodModeController, GlobalEventInput } from '../eventsourcing/god-mode.controller';
import { InteractionEngine } from '../interaction/interaction.types';
import { ReportAgent } from '../reporting/report-agent.service';
import { GraphRAGService } from '../graphrag/graphrag.service';
import { PersistentMemoryService } from '../memory/memory.service';
import { EventSourcingService } from '../eventsourcing/event-sourcing.service';
export declare class SimulationResolver {
    private readonly simulationService;
    private readonly godModeController;
    private readonly interactionEngine;
    private readonly reportAgent;
    private readonly graphRAG;
    private readonly memoryService;
    private readonly eventSourcing;
    private readonly pubSub;
    constructor(simulationService: SimulationService, godModeController: GodModeController, interactionEngine: InteractionEngine, reportAgent: ReportAgent, graphRAG: GraphRAGService, memoryService: PersistentMemoryService, eventSourcing: EventSourcingService, pubSub: PubSub);
    getAgentProfiles(): Promise<{
        id: string;
        name: string;
        persona: string;
        risk_appetite: number;
        strategy_type: string;
        capital: number;
        long_term_memory: string;
        memory_embedding: string;
        created_at: Date;
        updated_at: Date;
    }[]>;
    getAgentProfile(id: string): Promise<{
        id: string;
        name: string;
        persona: string;
        risk_appetite: number;
        strategy_type: string;
        capital: number;
        long_term_memory: string;
        memory_embedding: string;
        created_at: Date;
        updated_at: Date;
    }>;
    getEconomicEvents(): Promise<any[]>;
    getEconomicEvent(id: string): Promise<any>;
    getSimulationRun(id: string): Promise<any>;
    getSimulationRuns(): Promise<any>;
    getAgentActivity(simId: string): Promise<any>;
    getMarketSentiment(): Promise<{
        overall_bias: number;
        sentiment_score: number;
        agent_count: number;
        dominant_persona: string;
        currency_pairs: {
            currency_pair: string;
            bias: number;
            volume_estimate: number;
        }[];
    }>;
    getInteractions(simulationId: string): Promise<any[]>;
    getMarketNarrative(simulationId: string): Promise<import("../reporting/report-agent.service").MarketNarrative>;
    getKnowledgeGraphState(): Promise<import("../graphrag/graphrag.service").GraphQueryResult>;
    getAgentMemoryState(agentId: string): Promise<{
        agent_id: string;
        trauma_count: number;
        success_count: number;
        primary_biases: string[];
    }>;
    createAgentProfile(name: string, persona: string, risk_appetite: number, strategy_type: string, capital: number): Promise<any>;
    createEconomicEvent(title: string, description: string, impact_score: number, currency_pair: string, event_type: string, source: string): Promise<any>;
    startSimulation(eventId: string): Promise<any>;
    runAgentInference(agentId: string, eventId: string, simulationId: string): Promise<any>;
    injectGlobalEvent(simulationId: string, eventData: GlobalEventInput): Promise<import("../eventsourcing/god-mode.controller").ReflectionResult>;
    addAgentInteraction(simulationId: string, agentId: string, targetAgentId: string | null, action: string, content: string, reasoning: string | null): Promise<{
        success: boolean;
    }>;
    generateMarketNarrative(simulationId: string): Promise<import("../reporting/report-agent.service").MarketNarrative>;
    addMemoryEntry(agentId: string, content: string, eventType: string, sentiment: string | null, outcome: string | null): Promise<{
        success: boolean;
    }>;
    updateKnowledgeGraph(eventType: string, currencyPair: string, impact: number): Promise<import("../graphrag/graphrag.service").GraphQueryResult>;
    replaySimulation(simulationId: string): Promise<import("../eventsourcing/event-sourcing.service").SimulationEvent[]>;
    simulationLog(simId: string): AsyncIterator<any, any, any>;
    marketBiasUpdate(): AsyncIterator<any, any, any>;
}
