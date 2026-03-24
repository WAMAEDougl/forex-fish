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
var ShadowSimulationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowSimulationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const world_state_service_1 = require("./world-state.service");
const accuracy_monitor_service_1 = require("./accuracy-monitor.service");
let ShadowSimulationService = ShadowSimulationService_1 = class ShadowSimulationService {
    constructor(prisma, worldState, accuracyMonitor) {
        this.prisma = prisma;
        this.worldState = worldState;
        this.accuracyMonitor = accuracyMonitor;
        this.logger = new common_1.Logger(ShadowSimulationService_1.name);
        this.AGENT_PERSONAS = [
            {
                id: 'whale',
                name: 'The Whale',
                role: 'Institutional Trader',
                systemPrompt: `You are "The Whale" - a large institutional trader with significant capital.
You think in terms of order flow, market microstructure, and liquidity.
You care about filling large orders without moving the market.
Your decisions are based on:
- Order book imbalance
- Institutional flow indicators
- Support/resistance levels
- Market maker positioning`,
                riskAppetite: 0.3,
                timeHorizon: 'medium',
            },
            {
                id: 'retail-scalper',
                name: 'The Retail Scalper',
                role: 'Day Trader',
                systemPrompt: `You are "The Retail Scalper" - a fast-paced day trader who seeks small profits from rapid price movements.
You trade on technical indicators and short-term patterns.
Your decisions are based on:
- Chart patterns (5m, 15m, 1h)
- Moving average crossovers
- RSI overbought/oversold
- News catalyst timing
- Tight stop losses`,
                riskAppetite: 0.8,
                timeHorizon: 'short',
            },
            {
                id: 'fundamental-analyst',
                name: 'The Fundamental Analyst',
                role: 'Macro Economist',
                systemPrompt: `You are "The Fundamental Analyst" - an economist who trades based on macroeconomic data and central bank policy.
You analyze:
- Interest rate differentials
- GDP growth trajectories
- Inflation trends (CPI, PCE)
- Central bank rhetoric
- Currency valuations (PPP, carry trade)
- Geopolitical risk`,
                riskAppetite: 0.5,
                timeHorizon: 'long',
            },
        ];
    }
    async runShadowSimulation(symbol, worldState) {
        const simulationId = `shadow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const state = worldState || await this.worldState.getLatestWorldState();
        if (!state) {
            throw new Error('No world state available for simulation');
        }
        this.logger.log(`Starting shadow simulation ${simulationId} for ${symbol}`);
        const debateRounds = [];
        let currentRoundThoughts = await this.generateAgentThoughts(symbol, state);
        debateRounds.push({
            round: 1,
            thoughts: currentRoundThoughts,
        });
        const agreement = this.calculateAgreement(currentRoundThoughts);
        if (agreement < 0.6) {
            const counterArguments = await this.generateCounterArguments(currentRoundThoughts, state);
            debateRounds.push({
                round: 2,
                thoughts: counterArguments,
                disagreement: this.identifyDisagreement(currentRoundThoughts),
            });
            currentRoundThoughts = counterArguments;
        }
        const finalVerdict = this.determineVerdict(currentRoundThoughts);
        const swarmAgreement = this.calculateAgreement(currentRoundThoughts);
        for (const thought of currentRoundThoughts) {
            const entryPrice = state.priceTicks.find(t => t.symbol === symbol);
            if (entryPrice) {
                await this.accuracyMonitor.logPrediction({
                    simulationId,
                    agentId: thought.agentId,
                    agentPersona: thought.persona,
                    predictedAction: thought.predictedAction,
                    predictedDirection: thought.predictedAction === 'HOLD' ? 'neutral' :
                        (entryPrice.bid > entryPrice.ask ? 'up' : 'down'),
                    confidence: thought.confidence,
                    reasoning: thought.reasoning,
                    thoughtProcess: {
                        reasoning: thought.thoughtProcess,
                        relevantEntities: thought.relevantEntities,
                    },
                    entryPrice: entryPrice.bid,
                    symbol,
                });
            }
        }
        const result = {
            simulationId,
            worldStateVersion: state.version,
            debateRounds,
            finalVerdict,
            swarmAgreement,
            agentOpinions: currentRoundThoughts,
            timestamp: new Date(),
        };
        this.logger.log(`Simulation ${simulationId} complete: ${finalVerdict} (agreement: ${(swarmAgreement * 100).toFixed(1)}%)`);
        return result;
    }
    async generateAgentThoughts(symbol, worldState) {
        const thoughts = [];
        for (const persona of this.AGENT_PERSONAS) {
            const thought = await this.generateSingleThought(persona, symbol, worldState);
            thoughts.push(thought);
        }
        return thoughts;
    }
    async generateSingleThought(persona, symbol, worldState) {
        const relevantEntities = this.getRelevantEntities(persona.id, worldState);
        const priceData = worldState.priceTicks.find(t => t.symbol === symbol);
        const relevantNews = worldState.newsItems.filter(n => n.currencies?.some(c => symbol.includes(c)));
        const analysis = this.performAnalysis(persona, {
            symbol,
            priceData,
            entities: relevantEntities,
            news: relevantNews,
            relationships: worldState.relationships,
        });
        return {
            agentId: persona.id,
            agentName: persona.name,
            persona: persona.role,
            thoughtProcess: analysis.thoughtProcess,
            predictedAction: analysis.action,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            relevantEntities: relevantEntities.map(e => e.label),
            timestamp: new Date(),
        };
    }
    getRelevantEntities(agentId, worldState) {
        const relevantTypes = new Map([
            ['whale', ['CURRENCY_PAIR', 'MARKET_EVENT', 'HIGH_IMPACT_EVENT']],
            ['retail-scalper', ['CURRENCY_PAIR', 'MARKET_EVENT', 'ECONOMIC_INDICATOR']],
            ['fundamental-analyst', ['CENTRAL_BANK', 'ECONOMIC_INDICATOR', 'CURRENCY', 'HIGH_IMPACT_EVENT']],
        ]);
        const types = relevantTypes.get(agentId) || [];
        return worldState.entities.filter(e => types.includes(e.type));
    }
    performAnalysis(persona, context) {
        const lines = [];
        lines.push(`Analyzing ${context.symbol} from ${persona.role} perspective...`);
        if (context.priceData) {
            const spread = (context.priceData.ask - context.priceData.bid).toFixed(5);
            lines.push(`Current: bid=${context.priceData.bid}, ask=${context.priceData.ask}, spread=${spread}`);
        }
        lines.push(`Relevant entities: ${context.entities.map(e => e.label).join(', ')}`);
        const sentiment = this.calculateMarketSentiment(context.news);
        lines.push(`News sentiment: ${sentiment}`);
        const entitySentiment = this.analyzeEntitySentiment(context.entities);
        lines.push(`Entity sentiment: ${JSON.stringify(entitySentiment)}`);
        let action;
        let confidence;
        let reasoning;
        switch (persona.id) {
            case 'whale':
                ({ action, confidence, reasoning } = this.whaleStrategy(context, sentiment, entitySentiment));
                break;
            case 'retail-scalper':
                ({ action, confidence, reasoning } = this.scalperStrategy(context, sentiment));
                break;
            case 'fundamental-analyst':
                ({ action, confidence, reasoning } = this.fundamentalStrategy(context, sentiment, entitySentiment));
                break;
            default:
                action = 'HOLD';
                confidence = 0.3;
                reasoning = 'Unknown persona';
        }
        lines.push(`Decision: ${action} (confidence: ${(confidence * 100).toFixed(0)}%)`);
        lines.push(`Reasoning: ${reasoning}`);
        return {
            thoughtProcess: lines.join('\n'),
            action,
            confidence,
            reasoning,
        };
    }
    calculateMarketSentiment(news) {
        let score = 0;
        let weight = 0;
        for (const item of news) {
            const impactWeight = item.impact === 'high' ? 2 : item.impact === 'medium' ? 1 : 0.5;
            weight += impactWeight;
            if (item.sentiment === 'positive')
                score += impactWeight;
            else if (item.sentiment === 'negative')
                score -= impactWeight;
        }
        if (score > weight * 0.3)
            return 'bullish';
        if (score < -weight * 0.3)
            return 'bearish';
        return 'neutral';
    }
    analyzeEntitySentiment(entities) {
        const sentiment = {};
        for (const entity of entities) {
            const sentiments = entity.properties.sentiment;
            if (sentiments && sentiments.length > 0) {
                const positive = sentiments.filter(s => s === 'positive').length;
                const negative = sentiments.filter(s => s === 'negative').length;
                if (positive > negative)
                    sentiment[entity.label] = 'positive';
                else if (negative > positive)
                    sentiment[entity.label] = 'negative';
                else
                    sentiment[entity.label] = 'neutral';
            }
        }
        return sentiment;
    }
    whaleStrategy(context, sentiment, entitySentiment) {
        if (!context.priceData) {
            return { action: 'WAIT', confidence: 0.2, reasoning: 'No price data available' };
        }
        const spread = context.priceData.ask - context.priceData.bid;
        const tightSpread = spread < 0.001;
        if (sentiment === 'bullish' && tightSpread) {
            return { action: 'BUY', confidence: 0.7, reasoning: 'Bullish with tight spread - favorable entry' };
        }
        else if (sentiment === 'bearish' && tightSpread) {
            return { action: 'SELL', confidence: 0.7, reasoning: 'Bearish with tight spread - favorable short' };
        }
        return { action: 'HOLD', confidence: 0.5, reasoning: 'Waiting for better spread or clearer signal' };
    }
    scalperStrategy(context, sentiment) {
        if (!context.priceData) {
            return { action: 'WAIT', confidence: 0.2, reasoning: 'No price data available' };
        }
        if (sentiment === 'bullish') {
            return { action: 'BUY', confidence: 0.65, reasoning: 'Short-term bullish momentum detected' };
        }
        else if (sentiment === 'bearish') {
            return { action: 'SELL', confidence: 0.65, reasoning: 'Short-term bearish momentum detected' };
        }
        return { action: 'WAIT', confidence: 0.4, reasoning: 'No clear short-term direction' };
    }
    fundamentalStrategy(context, sentiment, entitySentiment) {
        const hasCentralBank = context.entities.some(e => e.type === 'CENTRAL_BANK');
        const hasHighImpact = context.entities.some(e => e.type === 'HIGH_IMPACT_EVENT');
        if (hasCentralBank || hasHighImpact) {
            if (sentiment === 'bullish') {
                return { action: 'BUY', confidence: 0.75, reasoning: 'Macro support - bullish fundamentals' };
            }
            else if (sentiment === 'bearish') {
                return { action: 'SELL', confidence: 0.75, reasoning: 'Macro headwinds - bearish fundamentals' };
            }
        }
        return { action: 'HOLD', confidence: 0.6, reasoning: 'No clear fundamental catalyst' };
    }
    async generateCounterArguments(thoughts, worldState) {
        const counterThoughts = [];
        for (const thought of thoughts) {
            const persona = this.AGENT_PERSONAS.find(p => p.id === thought.agentId);
            if (!persona)
                continue;
            const contraryAction = thought.predictedAction === 'BUY' ? 'SELL' :
                thought.predictedAction === 'SELL' ? 'BUY' : 'HOLD';
            const counterReasoning = this.generateCounterReasoning(thought, worldState);
            counterThoughts.push({
                ...thought,
                thoughtProcess: `Initial: ${thought.thoughtProcess}\n\nCounter-argument: ${counterReasoning}`,
                predictedAction: contraryAction,
                confidence: thought.confidence * 0.8,
                reasoning: counterReasoning,
                timestamp: new Date(),
            });
        }
        return counterThoughts;
    }
    generateCounterReasoning(thought, worldState) {
        const opposingView = thought.predictedAction === 'BUY' ? 'sell pressure' : 'buy pressure';
        return `Counter-point: While the initial analysis suggested ${thought.predictedAction}, 
consider ${opposingView}. Market conditions may have shifted. 
Entities: ${thought.relevantEntities.join(', ')}. 
World state version: ${worldState.version}`;
    }
    identifyDisagreement(thoughts) {
        const actions = thoughts.map(t => t.predictedAction);
        const unique = [...new Set(actions)];
        if (unique.length === 1)
            return 'No disagreement - all agents aligned';
        return `Disagreement: Agents divided between ${unique.join(' vs ')}`;
    }
    calculateAgreement(thoughts) {
        if (thoughts.length === 0)
            return 0;
        const actions = thoughts.map(t => t.predictedAction);
        const actionCounts = new Map();
        for (const action of actions) {
            actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
        }
        const maxCount = Math.max(...actionCounts.values());
        return maxCount / actions.length;
    }
    determineVerdict(thoughts) {
        const agreement = this.calculateAgreement(thoughts);
        if (agreement >= 0.8) {
            const dominantAction = thoughts[0].predictedAction;
            return `${String(dominantAction).toUpperCase()} - Strong swarm consensus`;
        }
        else if (agreement >= 0.5) {
            const votes = thoughts.reduce((acc, t) => {
                acc[t.predictedAction] = (acc[t.predictedAction] || 0) + t.confidence;
                return acc;
            }, {});
            const bestAction = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
            return `${bestAction} - Weighted majority`;
        }
        return 'HOLD - No clear consensus';
    }
};
exports.ShadowSimulationService = ShadowSimulationService;
exports.ShadowSimulationService = ShadowSimulationService = ShadowSimulationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        world_state_service_1.WorldStateService,
        accuracy_monitor_service_1.AccuracyMonitorService])
], ShadowSimulationService);
//# sourceMappingURL=shadow-simulation.service.js.map