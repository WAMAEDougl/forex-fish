export declare class AgentProfile {
    id: string;
    name: string;
    persona: string;
    risk_appetite: number;
    strategy_type: string;
    capital: number;
    created_at: Date;
    updated_at: Date;
}
export declare class EconomicEvent {
    id: string;
    title: string;
    description?: string;
    impact_score: number;
    currency_pair: string;
    event_type: string;
    timestamp: Date;
    source?: string;
}
export declare class SimulationRun {
    id: string;
    name?: string;
    status: string;
    started_at?: Date;
    completed_at?: Date;
    created_at: Date;
}
export declare class SimulationResult {
    id: string;
    agent: AgentProfile;
    event: EconomicEvent;
    emergent_sentiment: string;
    price_bias: number;
    trade_action?: string;
    confidence: number;
    reasoning?: string;
    created_at: Date;
}
export declare class CurrencySentiment {
    currency_pair: string;
    bias: number;
    volume_estimate: number;
}
export declare class MarketSentiment {
    overall_bias: number;
    sentiment_score: number;
    agent_count: number;
    dominant_persona: string;
    currency_pairs: CurrencySentiment[];
}
export declare class SimulationLog {
    simulation_id: string;
    agent_id: string;
    agent_name: string;
    action: string;
    reasoning: string;
    timestamp: string;
}
