import { 
  AgentPersona, 
  EconomicEventData, 
  AgentInferenceResult, 
  GraphRAGContext 
} from '../common/interfaces/agent.interface';
import { TradeAction, SentimentType, PersonaType } from '../common/types/enums';
import { KnowledgeGraph } from './knowledge-graph';

export class AgentInferenceEngine {
  private knowledgeGraph: KnowledgeGraph;

  constructor() {
    this.knowledgeGraph = new KnowledgeGraph();
  }

  async infer(
    agent: AgentPersona,
    event: EconomicEventData
  ): Promise<AgentInferenceResult> {
    const context = this.knowledgeGraph.queryRelevantFactors(
      event.currency_pair,
      event.event_type
    );

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

  private determineSentiment(
    agent: AgentPersona,
    event: EconomicEventData,
    context: GraphRAGContext
  ): SentimentType {
    const baseSentiment = this.getBaseSentimentFromEvent(event);
    const personaModifier = this.getPersonaSentimentModifier(agent.persona, baseSentiment, event);
    const impactModifier = event.impact_score * 0.3;

    const score = baseSentiment + personaModifier + impactModifier;

    if (score > 0.5) return SentimentType.BULLISH;
    if (score < -0.5) return SentimentType.BEARISH;
    if (Math.abs(score) > 0.8) return SentimentType.VOLATILE;
    return SentimentType.NEUTRAL;
  }

  private getBaseSentimentFromEvent(event: EconomicEventData): number {
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

  private getPersonaSentimentModifier(persona: string, baseSentiment: number, event?: EconomicEventData): number {
    switch (persona) {
      case PersonaType.WHALE:
        return baseSentiment > 0 ? 0.3 : 0.1;
      case PersonaType.PANIC_SELLER:
        return baseSentiment < 0 ? 0.4 : -0.2;
      case PersonaType.SCALPER:
        return Math.random() * 0.2 - 0.1;
      case PersonaType.MOMENTUM_TRADER:
        return baseSentiment * 0.8;
      case PersonaType.CONTRARIAN:
        return -baseSentiment * 0.6;
      case PersonaType.NEWS_TRADER:
        return event && event.impact_score > 0.7 ? baseSentiment : -baseSentiment * 0.3;
      case PersonaType.ALGORITHMIC:
        return 0;
      default:
        return 0;
    }
  }

  private calculatePriceBias(
    agent: AgentPersona,
    event: EconomicEventData,
    context: GraphRAGContext
  ): number {
    const impactBias = event.impact_score * (agent.risk_appetite * 2 - 1);
    const capitalFactor = Math.log10(agent.capital + 1) / 7;
    const randomFactor = (Math.random() - 0.5) * 0.1;

    return Math.max(-1, Math.min(1, impactBias * capitalFactor + randomFactor));
  }

  private determineTradeAction(
    agent: AgentPersona,
    event: EconomicEventData,
    sentiment: SentimentType,
    priceBias: number
  ): TradeAction {
    if (sentiment === SentimentType.VOLATILE) {
      return Math.random() > 0.5 ? TradeAction.HOLD : (priceBias > 0 ? TradeAction.BUY : TradeAction.SELL);
    }

    switch (sentiment) {
      case SentimentType.BULLISH:
        return TradeAction.BUY;
      case SentimentType.BEARISH:
        return TradeAction.SELL;
      default:
        return TradeAction.HOLD;
    }
  }

  private calculateConfidence(
    agent: AgentPersona,
    event: EconomicEventData,
    context: GraphRAGContext
  ): number {
    let confidence = context.confidence;
    
    confidence *= (0.5 + agent.risk_appetite * 0.5);
    confidence *= (0.7 + event.impact_score * 0.3);
    
    if (agent.persona === PersonaType.ALGORITHMIC) {
      confidence *= 1.2;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  private generateReasoning(
    agent: AgentPersona,
    event: EconomicEventData,
    sentiment: SentimentType,
    priceBias: number,
    context: GraphRAGContext
  ): string {
    const sentimentStr = sentiment.toString().toLowerCase();
    const biasDirection = priceBias > 0 ? 'upward' : 'downward';
    const factors = context.relevant_factors.join(', ');

    return `[${agent.name}/${agent.persona}] Based on ${event.event_type} event for ${event.currency_pair} ` +
      `(impact: ${event.impact_score}). ` +
      `Sentiment: ${sentimentStr}, Price Bias: ${biasDirection} (${priceBias.toFixed(2)}). ` +
      `Key factors: ${factors}. ` +
      `Strategy: ${agent.strategy_type}, Risk Appetite: ${agent.risk_appetite}`;
  }

  getKnowledgeGraph(): KnowledgeGraph {
    return this.knowledgeGraph;
  }
}
