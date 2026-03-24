"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const pubsub_service_1 = require("../common/pubsub.service");
const simulation_service_1 = require("../simulation/simulation.service");
const graphql_types_1 = require("../common/types/graphql.types");
const god_mode_controller_1 = require("../eventsourcing/god-mode.controller");
const interaction_types_1 = require("../interaction/interaction.types");
const report_agent_service_1 = require("../reporting/report-agent.service");
const graphrag_service_1 = require("../graphrag/graphrag.service");
const memory_service_1 = require("../memory/memory.service");
const event_sourcing_service_1 = require("../eventsourcing/event-sourcing.service");
const PUB_SUB = 'PUB_SUB';
let SimulationResolver = class SimulationResolver {
    constructor(simulationService, godModeController, interactionEngine, reportAgent, graphRAG, memoryService, eventSourcing, pubSub) {
        this.simulationService = simulationService;
        this.godModeController = godModeController;
        this.interactionEngine = interactionEngine;
        this.reportAgent = reportAgent;
        this.graphRAG = graphRAG;
        this.memoryService = memoryService;
        this.eventSourcing = eventSourcing;
        this.pubSub = pubSub;
    }
    async getAgentProfiles() {
        const agents = await this.simulationService.getActiveAgents();
        return agents.map(a => ({
            id: a.id,
            name: a.name,
            persona: a.persona,
            risk_appetite: a.risk_appetite,
            strategy_type: a.strategy_type,
            capital: a.capital,
            long_term_memory: a.long_term_memory ? JSON.stringify(a.long_term_memory) : null,
            memory_embedding: a.memory_embedding,
            created_at: new Date(),
            updated_at: new Date(),
        }));
    }
    async getAgentProfile(id) {
        const agents = await this.simulationService.getActiveAgents();
        const agent = agents.find(a => a.id === id);
        if (!agent)
            return null;
        return {
            id: agent.id,
            name: agent.name,
            persona: agent.persona,
            risk_appetite: agent.risk_appetite,
            strategy_type: agent.strategy_type,
            capital: agent.capital,
            long_term_memory: agent.long_term_memory ? JSON.stringify(agent.long_term_memory) : null,
            memory_embedding: agent.memory_embedding,
            created_at: new Date(),
            updated_at: new Date(),
        };
    }
    async getEconomicEvents() {
        return [];
    }
    async getEconomicEvent(id) {
        return null;
    }
    async getSimulationRun(id) {
        return this.simulationService.getSimulationRun(id);
    }
    async getSimulationRuns() {
        return this.simulationService.getAllSimulationRuns();
    }
    async getAgentActivity(simId) {
        const results = await this.simulationService.getAgentActivity(simId);
        return results.map(r => ({
            id: r.id,
            agent: {
                id: r.agent.id,
                name: r.agent.name,
                persona: r.agent.persona,
                risk_appetite: r.agent.risk_appetite,
                strategy_type: r.agent.strategy_type,
                capital: r.agent.capital,
                created_at: r.agent.created_at,
                updated_at: r.agent.updated_at,
            },
            event: {
                id: r.event.id,
                title: r.event.title,
                description: r.event.description,
                impact_score: r.event.impact_score,
                currency_pair: r.event.currency_pair,
                event_type: r.event.event_type,
                timestamp: r.event.timestamp,
                source: r.event.source,
            },
            emergent_sentiment: r.emergent_sentiment,
            price_bias: r.price_bias,
            trade_action: r.trade_action,
            confidence: r.confidence,
            reasoning: r.reasoning,
            created_at: r.created_at,
        }));
    }
    async getMarketSentiment() {
        const sentiment = await this.simulationService.getMarketSentiment();
        const currencyPairs = Array.from(sentiment.currency_pairs.entries()).map(([pair, data]) => ({
            currency_pair: pair,
            bias: data.bias,
            volume_estimate: data.volume_estimate,
        }));
        return {
            overall_bias: sentiment.overall_bias,
            sentiment_score: sentiment.sentiment_score,
            agent_count: sentiment.agent_count,
            dominant_persona: sentiment.dominant_persona,
            currency_pairs: currencyPairs,
        };
    }
    async getInteractions(simulationId) {
        const interactions = await this.interactionEngine.getInteractionStats(simulationId);
        return [];
    }
    async getMarketNarrative(simulationId) {
        return this.reportAgent.getNarrative(simulationId);
    }
    async getKnowledgeGraphState() {
        return this.graphRAG.getFullGraph();
    }
    async getAgentMemoryState(agentId) {
        const state = await this.memoryService.getAgentMemoryState(agentId);
        return {
            agent_id: state.agentId,
            trauma_count: state.traumaEvents.length,
            success_count: state.successEvents.length,
            primary_biases: Object.entries(state.decisionBias)
                .filter(([_, v]) => v > 0.3)
                .map(([k, _]) => k),
        };
    }
    async createAgentProfile(name, persona, risk_appetite, strategy_type, capital) {
        return this.simulationService.createAgentProfile({
            name,
            persona,
            risk_appetite,
            strategy_type,
            capital,
        });
    }
    async createEconomicEvent(title, description, impact_score, currency_pair, event_type, source) {
        return this.simulationService.createEconomicEvent({
            title,
            description,
            impact_score,
            currency_pair,
            event_type,
            source,
        });
    }
    async startSimulation(eventId) {
        const result = await this.simulationService.startSimulation(eventId);
        this.pubSub.publish('simulationCompleted', {
            simulationLog: result.results.map(r => ({
                simulation_id: result.simulation.id,
                agent_id: r.agent_id,
                agent_name: 'Agent',
                action: r.trade_action,
                reasoning: r.reasoning,
                timestamp: new Date().toISOString(),
            })),
        });
        return result.simulation;
    }
    async runAgentInference(agentId, eventId, simulationId) {
        return null;
    }
    async injectGlobalEvent(simulationId, eventData) {
        return this.godModeController.injectGlobalEvent(simulationId, eventData);
    }
    async addAgentInteraction(simulationId, agentId, targetAgentId, action, content, reasoning) {
        const data = {
            simulationId,
            agentId,
            targetAgentId: targetAgentId || undefined,
            action: action,
            content,
            reasoning: reasoning || undefined,
        };
        await this.interactionEngine.enqueueInteraction(data);
        return { success: true };
    }
    async generateMarketNarrative(simulationId) {
        return this.reportAgent.generateMarketNarrative(simulationId);
    }
    async addMemoryEntry(agentId, content, eventType, sentiment, outcome) {
        await this.memoryService.addMemory(agentId, {
            content,
            sentiment: sentiment || undefined,
            outcome: outcome || undefined,
        }, eventType);
        return { success: true };
    }
    async updateKnowledgeGraph(eventType, currencyPair, impact) {
        await this.graphRAG.linkEventToCurrencies({ event_type: eventType, currency_pair: currencyPair, impact_score: impact });
        return this.graphRAG.getFullGraph();
    }
    async replaySimulation(simulationId) {
        const events = await this.eventSourcing.replaySimulation(simulationId);
        return events;
    }
    simulationLog(simId) {
        return this.pubSub.asyncIterator('simulationLog');
    }
    marketBiasUpdate() {
        return this.pubSub.asyncIterator('marketBiasUpdate');
    }
};
exports.SimulationResolver = SimulationResolver;
__decorate([
    (0, graphql_1.Query)(() => [graphql_types_1.AgentProfile]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getAgentProfiles", null);
__decorate([
    (0, graphql_1.Query)(() => graphql_types_1.AgentProfile, { nullable: true }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getAgentProfile", null);
__decorate([
    (0, graphql_1.Query)(() => [graphql_types_1.EconomicEvent]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getEconomicEvents", null);
__decorate([
    (0, graphql_1.Query)(() => graphql_types_1.EconomicEvent, { nullable: true }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getEconomicEvent", null);
__decorate([
    (0, graphql_1.Query)(() => graphql_types_1.SimulationRun, { nullable: true }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getSimulationRun", null);
__decorate([
    (0, graphql_1.Query)(() => [graphql_types_1.SimulationRun]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getSimulationRuns", null);
__decorate([
    (0, graphql_1.Query)(() => [graphql_types_1.SimulationResult]),
    __param(0, (0, graphql_1.Args)('simId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getAgentActivity", null);
__decorate([
    (0, graphql_1.Query)(() => graphql_types_1.MarketSentiment),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getMarketSentiment", null);
__decorate([
    (0, graphql_1.Query)(() => [Object]),
    __param(0, (0, graphql_1.Args)('simulationId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getInteractions", null);
__decorate([
    (0, graphql_1.Query)(() => Object, { nullable: true }),
    __param(0, (0, graphql_1.Args)('simulationId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getMarketNarrative", null);
__decorate([
    (0, graphql_1.Query)(() => Object),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getKnowledgeGraphState", null);
__decorate([
    (0, graphql_1.Query)(() => Object),
    __param(0, (0, graphql_1.Args)('agentId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "getAgentMemoryState", null);
__decorate([
    (0, graphql_1.Mutation)(() => graphql_types_1.AgentProfile),
    __param(0, (0, graphql_1.Args)('name')),
    __param(1, (0, graphql_1.Args)('persona')),
    __param(2, (0, graphql_1.Args)('risk_appetite')),
    __param(3, (0, graphql_1.Args)('strategy_type')),
    __param(4, (0, graphql_1.Args)('capital')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String, Number]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "createAgentProfile", null);
__decorate([
    (0, graphql_1.Mutation)(() => graphql_types_1.EconomicEvent),
    __param(0, (0, graphql_1.Args)('title')),
    __param(1, (0, graphql_1.Args)('description', { nullable: true })),
    __param(2, (0, graphql_1.Args)('impact_score')),
    __param(3, (0, graphql_1.Args)('currency_pair')),
    __param(4, (0, graphql_1.Args)('event_type')),
    __param(5, (0, graphql_1.Args)('source', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "createEconomicEvent", null);
__decorate([
    (0, graphql_1.Mutation)(() => graphql_types_1.SimulationRun),
    __param(0, (0, graphql_1.Args)('eventId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "startSimulation", null);
__decorate([
    (0, graphql_1.Mutation)(() => graphql_types_1.SimulationResult),
    __param(0, (0, graphql_1.Args)('agentId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('eventId', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('simulationId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "runAgentInference", null);
__decorate([
    (0, graphql_1.Mutation)(() => Object),
    __param(0, (0, graphql_1.Args)('simulationId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('eventData')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "injectGlobalEvent", null);
__decorate([
    (0, graphql_1.Mutation)(() => Object),
    __param(0, (0, graphql_1.Args)('simulationId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('agentId', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('targetAgentId', { type: () => graphql_1.ID, nullable: true })),
    __param(3, (0, graphql_1.Args)('action')),
    __param(4, (0, graphql_1.Args)('content')),
    __param(5, (0, graphql_1.Args)('reasoning', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "addAgentInteraction", null);
__decorate([
    (0, graphql_1.Mutation)(() => Object),
    __param(0, (0, graphql_1.Args)('simulationId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "generateMarketNarrative", null);
__decorate([
    (0, graphql_1.Mutation)(() => Object),
    __param(0, (0, graphql_1.Args)('agentId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('content')),
    __param(2, (0, graphql_1.Args)('eventType')),
    __param(3, (0, graphql_1.Args)('sentiment', { nullable: true })),
    __param(4, (0, graphql_1.Args)('outcome', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "addMemoryEntry", null);
__decorate([
    (0, graphql_1.Mutation)(() => Object),
    __param(0, (0, graphql_1.Args)('eventType')),
    __param(1, (0, graphql_1.Args)('currencyPair')),
    __param(2, (0, graphql_1.Args)('impact')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "updateKnowledgeGraph", null);
__decorate([
    (0, graphql_1.Query)(() => [Object]),
    __param(0, (0, graphql_1.Args)('simulationId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulationResolver.prototype, "replaySimulation", null);
__decorate([
    (0, graphql_1.Subscription)(() => graphql_types_1.SimulationLog, {
        filter: (payload, variables) => {
            return payload.simulationLog.simulation_id === variables.simId;
        },
    }),
    __param(0, (0, graphql_1.Args)('simId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SimulationResolver.prototype, "simulationLog", null);
__decorate([
    (0, graphql_1.Subscription)(() => graphql_types_1.MarketSentiment),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SimulationResolver.prototype, "marketBiasUpdate", null);
exports.SimulationResolver = SimulationResolver = __decorate([
    (0, graphql_1.Resolver)(() => graphql_types_1.AgentProfile),
    __param(7, (0, common_1.Inject)(PUB_SUB)),
    __metadata("design:paramtypes", [simulation_service_1.SimulationService,
        god_mode_controller_1.GodModeController,
        interaction_types_1.InteractionEngine,
        report_agent_service_1.ReportAgent,
        graphrag_service_1.GraphRAGService,
        memory_service_1.PersistentMemoryService,
        event_sourcing_service_1.EventSourcingService,
        pubsub_service_1.PubSub])
], SimulationResolver);
//# sourceMappingURL=simulation.resolver.js.map