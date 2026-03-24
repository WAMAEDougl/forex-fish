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
var SimulationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const agent_inference_engine_1 = require("../agents/agent-inference.engine");
const persona_factory_1 = require("../agents/persona.factory");
const enums_1 = require("../common/types/enums");
let SimulationService = SimulationService_1 = class SimulationService {
    constructor() {
        this.logger = new common_1.Logger(SimulationService_1.name);
        this.activeAgents = new Map();
        this.prisma = new client_1.PrismaClient();
        this.inferenceEngine = new agent_inference_engine_1.AgentInferenceEngine();
    }
    async onModuleInit() {
        await this.prisma.$connect();
        this.logger.log('SimulationService initialized with Prisma');
    }
    async createAgentProfile(data) {
        return this.prisma.agentProfile.create({
            data: {
                name: data.name,
                persona: data.persona,
                risk_appetite: data.risk_appetite,
                strategy_type: data.strategy_type,
                capital: data.capital,
            },
        });
    }
    async createEconomicEvent(data) {
        return this.prisma.economicEvent.create({
            data: {
                title: data.title,
                description: data.description,
                impact_score: data.impact_score,
                currency_pair: data.currency_pair,
                event_type: data.event_type,
                source: data.source,
            },
        });
    }
    async startSimulation(eventId) {
        const event = await this.prisma.economicEvent.findUnique({
            where: { id: eventId },
        });
        if (!event) {
            throw new Error(`EconomicEvent with id ${eventId} not found`);
        }
        const simulation = await this.prisma.simulationRun.create({
            data: {
                id: (0, uuid_1.v4)(),
                status: enums_1.SimulationStatus.RUNNING,
                started_at: new Date(),
                name: `Sim-${event.title}-${Date.now()}`,
            },
        });
        const swarm = await this.initializeSwarm(eventId);
        const results = await this.runSwarmInference(simulation.id, swarm, event);
        await this.prisma.simulationRun.update({
            where: { id: simulation.id },
            data: {
                status: enums_1.SimulationStatus.COMPLETED,
                completed_at: new Date(),
            },
        });
        return {
            simulation,
            results,
        };
    }
    async initializeSwarm(eventId) {
        const personaTypes = Object.values(enums_1.PersonaType);
        const swarmSize = 20;
        const swarm = [];
        const whaleCount = Math.ceil(swarmSize * 0.1);
        const panicSellerCount = Math.ceil(swarmSize * 0.15);
        const scalperCount = Math.floor(swarmSize * 0.25);
        const momentumCount = Math.floor(swarmSize * 0.2);
        const contrarianCount = Math.floor(swarmSize * 0.1);
        const newsTraderCount = Math.floor(swarmSize * 0.1);
        const algorithmicCount = swarmSize - (whaleCount + panicSellerCount + scalperCount + momentumCount + contrarianCount + newsTraderCount);
        const distribution = [
            { persona: enums_1.PersonaType.WHALE, count: whaleCount, capital: 1000000 },
            { persona: enums_1.PersonaType.PANIC_SELLER, count: panicSellerCount, capital: 50000 },
            { persona: enums_1.PersonaType.SCALPER, count: scalperCount, capital: 10000 },
            { persona: enums_1.PersonaType.MOMENTUM_TRADER, count: momentumCount, capital: 100000 },
            { persona: enums_1.PersonaType.CONTRARIAN, count: contrarianCount, capital: 250000 },
            { persona: enums_1.PersonaType.NEWS_TRADER, count: newsTraderCount, capital: 75000 },
            { persona: enums_1.PersonaType.ALGORITHMIC, count: algorithmicCount, capital: 500000 },
        ];
        for (const group of distribution) {
            for (let i = 0; i < group.count; i++) {
                const agent = persona_factory_1.PersonaFactory.getPersona((0, uuid_1.v4)(), {
                    persona: group.persona,
                    capital: group.capital * (0.8 + Math.random() * 0.4),
                });
                swarm.push(agent);
                this.activeAgents.set(agent.id, agent);
            }
        }
        this.logger.log(`Initialized swarm with ${swarm.length} agents`);
        return swarm;
    }
    async runSwarmInference(simulationId, swarm, event) {
        const eventData = {
            id: event.id,
            title: event.title,
            description: event.description,
            impact_score: event.impact_score,
            currency_pair: event.currency_pair,
            event_type: event.event_type,
            timestamp: event.timestamp,
            source: event.source,
        };
        const results = [];
        for (const agent of swarm) {
            const inferenceResult = await this.inferenceEngine.infer(agent, eventData);
            inferenceResult.simulation_id = simulationId;
            const savedResult = await this.prisma.simulationResult.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    agent_id: agent.id,
                    event_id: event.id,
                    simulation_id: simulationId,
                    emergent_sentiment: inferenceResult.emergent_sentiment,
                    price_bias: inferenceResult.price_bias,
                    trade_action: inferenceResult.trade_action,
                    confidence: inferenceResult.confidence,
                    reasoning: inferenceResult.reasoning,
                },
            });
            results.push({ ...inferenceResult, id: savedResult.id });
            if (!this.activeAgents.has(agent.id)) {
                await this.prisma.agentProfile.create({
                    data: {
                        id: agent.id,
                        name: agent.name,
                        persona: agent.persona,
                        risk_appetite: agent.risk_appetite,
                        strategy_type: agent.strategy_type,
                        capital: agent.capital,
                    },
                });
            }
        }
        return results;
    }
    async getAgentActivity(simId) {
        return this.prisma.simulationResult.findMany({
            where: { simulation_id: simId },
            include: {
                agent: true,
                event: true,
            },
        });
    }
    async getMarketSentiment() {
        const recentResults = await this.prisma.simulationResult.findMany({
            where: {
                created_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
            include: {
                agent: true,
            },
        });
        if (recentResults.length === 0) {
            return {
                overall_bias: 0,
                sentiment_score: 0,
                agent_count: 0,
                dominant_persona: 'NONE',
                currency_pairs: new Map(),
            };
        }
        const personaCounts = new Map();
        const currencyPairs = new Map();
        let totalBias = 0;
        let bullishCount = 0;
        let bearishCount = 0;
        for (const result of recentResults) {
            totalBias += result.price_bias;
            if (result.emergent_sentiment === enums_1.SentimentType.BULLISH)
                bullishCount++;
            if (result.emergent_sentiment === enums_1.SentimentType.BEARISH)
                bearishCount++;
            const persona = result.agent.persona;
            personaCounts.set(persona, (personaCounts.get(persona) || 0) + 1);
            const pair = result.event.currency_pair;
            const current = currencyPairs.get(pair) || { bias: 0, count: 0 };
            currencyPairs.set(pair, {
                bias: current.bias + result.price_bias,
                count: current.count + 1,
            });
        }
        const agentCount = recentResults.length;
        const overallBias = totalBias / agentCount;
        const sentimentScore = (bullishCount - bearishCount) / agentCount;
        let dominantPersona = 'NONE';
        let maxCount = 0;
        for (const [persona, count] of personaCounts) {
            if (count > maxCount) {
                maxCount = count;
                dominantPersona = persona;
            }
        }
        const currencySentiments = new Map();
        for (const [pair, data] of currencyPairs) {
            currencySentiments.set(pair, {
                bias: data.bias / data.count,
                volume_estimate: data.count,
            });
        }
        return {
            overall_bias: overallBias,
            sentiment_score: sentimentScore,
            agent_count: agentCount,
            dominant_persona: dominantPersona,
            currency_pairs: currencySentiments,
        };
    }
    async getSimulationRun(id) {
        return this.prisma.simulationRun.findUnique({
            where: { id },
            include: {
                results: {
                    include: {
                        agent: true,
                        event: true,
                    },
                },
            },
        });
    }
    async getAllSimulationRuns() {
        return this.prisma.simulationRun.findMany({
            orderBy: { created_at: 'desc' },
            take: 50,
        });
    }
    getActiveAgents() {
        return Array.from(this.activeAgents.values());
    }
    getInferenceEngine() {
        return this.inferenceEngine;
    }
};
exports.SimulationService = SimulationService;
exports.SimulationService = SimulationService = SimulationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SimulationService);
//# sourceMappingURL=simulation.service.js.map