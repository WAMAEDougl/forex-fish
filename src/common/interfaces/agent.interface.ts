import { TradeAction, SentimentType } from '../types/enums';

export interface AgentPersona {
  id: string;
  name: string;
  persona: string;
  risk_appetite: number;
  strategy_type: string;
  capital: number;
  long_term_memory?: Record<string, any>;
  memory_embedding?: string;
}

export interface EconomicEventData {
  id: string;
  title: string;
  description?: string;
  impact_score: number;
  currency_pair: string;
  event_type: string;
  timestamp: Date;
  source?: string;
}

export interface AgentInferenceResult {
  id?: string;
  agent_id: string;
  event_id: string;
  simulation_id: string;
  emergent_sentiment: SentimentType;
  price_bias: number;
  trade_action: TradeAction;
  confidence: number;
  reasoning: string;
}

export interface MarketBiasSignal {
  overall_bias: number;
  sentiment_score: number;
  agent_count: number;
  dominant_persona: string;
  currency_pairs: Map<string, { bias: number; volume_estimate: number }>;
}

export interface KnowledgeGraphNode {
  id: string;
  type: 'currency' | 'event' | 'indicator' | 'sentiment';
  properties: Record<string, any>;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface GraphRAGContext {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  relevant_factors: string[];
  confidence: number;
}
