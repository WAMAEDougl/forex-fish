"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentInferenceEngine = void 0;
const enums_1 = require("../common/types/enums");
const knowledge_graph_1 = require("./knowledge-graph");
class AgentInferenceEngine {
    constructor() {
        this.knowledgeGraph = new knowledge_graph_1.KnowledgeGraph();
    }
    async infer(agent, event) {
        const context = this.knowledgeGraph.queryRelevantFactors(event.currency_pair, event.event_type);
        const sentiment = this.determineSentiment(agent, event, context);
        const priceBias = this.calculatePriceBias(agent, event, context);
        const tradeAction = this.determineTradeAction(agent, event, sentiment, priceBias);
        const confidence = this.calculateConfidence(agent, event, context);
        const reasoning = this.generateReasoning(agent, event, sentiment, priceBias, context);
        return {
            agent_id: agent.id,
            event_id: event.id,
            simulation_id: '',
            emergent_sentiment: sentiment,
            price_bias: priceBias,
            trade_action: tradeAction,
            confidence,
            reasoning,
        };
    }
    determineSentiment(agent, event, context) {
        const baseSentiment = this.getBaseSentimentFromEvent(event);
        const personaModifier = this.getPersonaSentimentModifier(agent.persona, baseSentiment, event);
        const impactModifier = event.impact_score * 0.3;
        const score = baseSentiment + personaModifier + impactModifier;
        if (score > 0.5)
            return enums_1.SentimentType.BULLISH;
        if (score < -0.5)
            return enums_1.SentimentType.BEARISH;
        if (Math.abs(score) > 0.8)
            return enums_1.SentimentType.VOLATILE;
        return enums_1.SentimentType.NEUTRAL;
    }
    getBaseSentimentFromEvent(event) {
        const positiveEvents = ['INTEREST_RATE', 'EMPLOYMENT', 'GDP', 'TRADE_BALANCE'];
        const negativeEvents = ['INFLATION'];
        if (positiveEvents.includes(event.event_type)) {
            return event.impact_score * 0.5;
        }
        if (negativeEvents.includes(event.event_type)) {
            return -event.impact_score * 0.5;
        }
        return 0;
    }
    getPersonaSentimentModifier(persona, baseSentiment, event) {
        switch (persona) {
            case enums_1.PersonaType.WHALE:
                return baseSentiment > 0 ? 0.3 : 0.1;
            case enums_1.PersonaType.PANIC_SELLER:
                return baseSentiment < 0 ? 0.4 : -0.2;
            case enums_1.PersonaType.SCALPER:
                return Math.random() * 0.2 - 0.1;
            case enums_1.PersonaType.MOMENTUM_TRADER:
                return baseSentiment * 0.8;
            case enums_1.PersonaType.CONTRARIAN:
                return -baseSentiment * 0.6;
            case enums_1.PersonaType.NEWS_TRADER:
                return event && event.impact_score > 0.7 ? baseSentiment : -baseSentiment * 0.3;
            case enums_1.PersonaType.ALGORITHMIC:
                return 0;
            default:
                return 0;
        }
    }
    calculatePriceBias(agent, event, context) {
        const impactBias = event.impact_score * (agent.risk_appetite * 2 - 1);
        const capitalFactor = Math.log10(agent.capital + 1) / 7;
        const randomFactor = (Math.random() - 0.5) * 0.1;
        return Math.max(-1, Math.min(1, impactBias * capitalFactor + randomFactor));
    }
    determineTradeAction(agent, event, sentiment, priceBias) {
        if (sentiment === enums_1.SentimentType.VOLATILE) {
            return Math.random() > 0.5 ? enums_1.TradeAction.HOLD : (priceBias > 0 ? enums_1.TradeAction.BUY : enums_1.TradeAction.SELL);
        }
        switch (sentiment) {
            case enums_1.SentimentType.BULLISH:
                return enums_1.TradeAction.BUY;
            case enums_1.SentimentType.BEARISH:
                return enums_1.TradeAction.SELL;
            default:
                return enums_1.TradeAction.HOLD;
        }
    }
    calculateConfidence(agent, event, context) {
        let confidence = context.confidence;
        confidence *= (0.5 + agent.risk_appetite * 0.5);
        confidence *= (0.7 + event.impact_score * 0.3);
        if (agent.persona === enums_1.PersonaType.ALGORITHMIC) {
            confidence *= 1.2;
        }
        return Math.min(1, Math.max(0, confidence));
    }
    generateReasoning(agent, event, sentiment, priceBias, context) {
        const sentimentStr = sentiment.toString().toLowerCase();
        const biasDirection = priceBias > 0 ? 'upward' : 'downward';
        const factors = context.relevant_factors.join(', ');
        return `[${agent.name}/${agent.persona}] Based on ${event.event_type} event for ${event.currency_pair} ` +
            `(impact: ${event.impact_score}). ` +
            `Sentiment: ${sentimentStr}, Price Bias: ${biasDirection} (${priceBias.toFixed(2)}). ` +
            `Key factors: ${factors}. ` +
            `Strategy: ${agent.strategy_type}, Risk Appetite: ${agent.risk_appetite}`;
    }
    getKnowledgeGraph() {
        return this.knowledgeGraph;
    }
}
exports.AgentInferenceEngine = AgentInferenceEngine;
//# sourceMappingURL=agent-inference.engine.js.map