"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraph = void 0;
class KnowledgeGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.initializeBaseKnowledge();
    }
    initializeBaseKnowledge() {
        const currencies = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD'];
        currencies.forEach(pair => {
            this.addNode({
                id: `currency:${pair}`,
                type: 'currency',
                properties: { pair, base_currency: pair.split('/')[0], quote_currency: pair.split('/')[1] },
            });
        });
        const eventTypes = ['EMPLOYMENT', 'GDP', 'INTEREST_RATE', 'INFLATION', 'TRADE_BALANCE', 'CENTRAL_BANK'];
        eventTypes.forEach(type => {
            this.addNode({
                id: `event_type:${type}`,
                type: 'event',
                properties: { type, impact_category: this.categorizeImpact(type) },
            });
        });
        const indicators = ['RSI', 'MACD', 'MOVING_AVERAGE', 'BOLLINGER_BANDS', 'VOLUME'];
        indicators.forEach(indicator => {
            this.addNode({
                id: `indicator:${indicator}`,
                type: 'indicator',
                properties: { name: indicator },
            });
        });
    }
    categorizeImpact(eventType) {
        const highImpact = ['INTEREST_RATE', 'GDP', 'EMPLOYMENT'];
        const mediumImpact = ['INFLATION', 'TRADE_BALANCE'];
        const lowImpact = ['CENTRAL_BANK'];
        if (highImpact.includes(eventType))
            return 'high';
        if (mediumImpact.includes(eventType))
            return 'medium';
        return 'low';
    }
    addNode(node) {
        this.nodes.set(node.id, node);
    }
    addEdge(edge) {
        this.edges.push(edge);
    }
    queryRelevantFactors(currencyPair, eventType) {
        const relevantNodes = [];
        const relevantEdges = [];
        const currencyNode = this.nodes.get(`currency:${currencyPair}`);
        if (currencyNode)
            relevantNodes.push(currencyNode);
        const eventTypeNode = this.nodes.get(`event_type:${eventType}`);
        if (eventTypeNode)
            relevantNodes.push(eventTypeNode);
        this.edges.forEach(edge => {
            if (edge.source.includes(currencyPair.split('/')[0]) || edge.target.includes(currencyPair.split('/')[0])) {
                relevantEdges.push(edge);
            }
        });
        const relevantFactors = this.deriveRelevantFactors(currencyPair, eventType);
        return {
            nodes: relevantNodes,
            edges: relevantEdges,
            relevant_factors: relevantFactors,
            confidence: 0.75,
        };
    }
    deriveRelevantFactors(currencyPair, eventType) {
        const factors = [`${currencyPair} volatility`, eventType];
        if (eventType === 'INTEREST_RATE') {
            factors.push('central_bank_policy', 'yield_differential');
        }
        else if (eventType === 'EMPLOYMENT') {
            factors.push('labor_market_health', 'consumer_spending');
        }
        else if (eventType === 'GDP') {
            factors.push('economic_growth', 'trade_flows');
        }
        else if (eventType === 'INFLATION') {
            factors.push('purchasing_power', 'real_yields');
        }
        return factors;
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
}
exports.KnowledgeGraph = KnowledgeGraph;
//# sourceMappingURL=knowledge-graph.js.map