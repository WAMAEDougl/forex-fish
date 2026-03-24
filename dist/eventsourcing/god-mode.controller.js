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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GodModeController = void 0;
const common_1 = require("@nestjs/common");
const event_sourcing_service_1 = require("./event-sourcing.service");
const graphrag_service_1 = require("../graphrag/graphrag.service");
const agent_inference_engine_1 = require("../agents/agent-inference.engine");
const prisma_service_1 = require("../common/prisma.service");
const uuid_1 = require("uuid");
let GodModeController = class GodModeController {
    constructor(eventSourcing, graphRAG, inferenceEngine, prisma) {
        this.eventSourcing = eventSourcing;
        this.graphRAG = graphRAG;
        this.inferenceEngine = inferenceEngine;
        this.prisma = prisma;
    }
    async injectGlobalEvent(simulationId, eventData) {
        const eventId = (0, uuid_1.v4)();
        const timestamp = new Date();
        const event = await this.prisma.economicEvent.create({
            data: {
                id: eventId,
                title: eventData.title,
                description: eventData.description,
                event_type: eventData.event_type,
                currency_pair: eventData.currency_pair,
                impact_score: eventData.impact_score,
                source: eventData.source || 'GOD_MODE',
                timestamp,
            },
        });
        await this.eventSourcing.appendEvent(simulationId, {
            type: 'GLOBAL_EVENT_INJECTED',
            aggregateId: eventId,
            payload: eventData,
            metadata: { injectedBy: 'GOD_MODE', simulationId },
        });
        await this.graphRAG.linkEventToCurrencies(eventData);
        const reflectionResult = await this.triggerReflectionLoop(simulationId, eventData);
        return reflectionResult;
    }
    async triggerReflectionLoop(simulationId, eventData) {
        const agents = await this.prisma.agentProfile.findMany({
            include: {
                simulations: {
                    where: { simulation_id: simulationId },
                    take: 1,
                },
            },
        });
        const agentsToUpdate = [];
        let consensusShift = 0;
        let originalConsensus = 0;
        let newConsensus = 0;
        for (const agent of agents) {
            const priorPosition = agent.simulations[0]?.price_bias || 0;
            originalConsensus += priorPosition;
            const inferenceResult = await this.inferenceEngine.infer({
                id: agent.id,
                name: agent.name,
                persona: agent.persona,
                risk_appetite: agent.risk_appetite,
                strategy_type: agent.strategy_type,
                capital: agent.capital,
            }, {
                id: eventData.event_type,
                title: eventData.title,
                event_type: eventData.event_type,
                currency_pair: eventData.currency_pair,
                impact_score: eventData.impact_score,
                timestamp: new Date(),
            });
            await this.prisma.simulationResult.create({
                data: {
                    agent_id: agent.id,
                    event_id: eventData.event_type,
                    simulation_id: simulationId,
                    emergent_sentiment: inferenceResult.emergent_sentiment,
                    price_bias: inferenceResult.price_bias,
                    trade_action: inferenceResult.trade_action,
                    confidence: inferenceResult.confidence,
                    reasoning: inferenceResult.reasoning,
                },
            });
            agentsToUpdate.push({
                agentId: agent.id,
                newPosition: inferenceResult.price_bias,
            });
            newConsensus += inferenceResult.price_bias;
        }
        consensusShift = Math.abs(newConsensus - originalConsensus) / Math.max(agents.length, 1);
        await this.eventSourcing.appendEvent(simulationId, {
            type: 'REFLECTION_LOOP_COMPLETED',
            aggregateId: 'reflection-loop',
            payload: {
                agentsCount: agents.length,
                eventType: eventData.event_type,
                consensusShift,
            },
            metadata: { triggeredBy: 'GOD_MODE' },
        });
        return {
            affectedAgents: agents.length,
            newPositions: agentsToUpdate.length,
            consensusShift,
            timestamp: new Date(),
        };
    }
    async getKnowledgeGraphState() {
        return this.graphRAG.getFullGraph();
    }
};
exports.GodModeController = GodModeController;
exports.GodModeController = GodModeController = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_sourcing_service_1.EventSourcingService,
        graphrag_service_1.GraphRAGService,
        agent_inference_engine_1.AgentInferenceEngine,
        prisma_service_1.PrismaService])
], GodModeController);
//# sourceMappingURL=god-mode.controller.js.map