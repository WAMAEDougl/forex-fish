import { EconomicEventData, GraphRAGContext, KnowledgeGraphNode, KnowledgeGraphEdge } from '../common/interfaces/agent.interface';

export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeGraphNode> = new Map();
  private edges: KnowledgeGraphEdge[] = [];

  constructor() {
    this.initializeBaseKnowledge();
  }

  private initializeBaseKnowledge(): void {
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

  private categorizeImpact(eventType: string): string {
    const highImpact = ['INTEREST_RATE', 'GDP', 'EMPLOYMENT'];
    const mediumImpact = ['INFLATION', 'TRADE_BALANCE'];
    const lowImpact = ['CENTRAL_BANK'];
    
    if (highImpact.includes(eventType)) return 'high';
    if (mediumImpact.includes(eventType)) return 'medium';
    return 'low';
  }

  addNode(node: KnowledgeGraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: KnowledgeGraphEdge): void {
    this.edges.push(edge);
  }

  queryRelevantFactors(currencyPair: string, eventType: string): GraphRAGContext {
    const relevantNodes: KnowledgeGraphNode[] = [];
    const relevantEdges: KnowledgeGraphEdge[] = [];

    const currencyNode = this.nodes.get(`currency:${currencyPair}`);
    if (currencyNode) relevantNodes.push(currencyNode);

    const eventTypeNode = this.nodes.get(`event_type:${eventType}`);
    if (eventTypeNode) relevantNodes.push(eventTypeNode);

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

  private deriveRelevantFactors(currencyPair: string, eventType: string): string[] {
    const factors: string[] = [`${currencyPair} volatility`, eventType];
    
    if (eventType === 'INTEREST_RATE') {
      factors.push('central_bank_policy', 'yield_differential');
    } else if (eventType === 'EMPLOYMENT') {
      factors.push('labor_market_health', 'consumer_spending');
    } else if (eventType === 'GDP') {
      factors.push('economic_growth', 'trade_flows');
    } else if (eventType === 'INFLATION') {
      factors.push('purchasing_power', 'real_yields');
    }
    
    return factors;
  }

  getNode(id: string): KnowledgeGraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): KnowledgeGraphNode[] {
    return Array.from(this.nodes.values());
  }
}
