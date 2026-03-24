import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class AgentProfile {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  persona: string;

  @Field(() => Float)
  risk_appetite: number;

  @Field()
  strategy_type: string;

  @Field(() => Float)
  capital: number;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;
}

@ObjectType()
export class EconomicEvent {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float)
  impact_score: number;

  @Field()
  currency_pair: string;

  @Field()
  event_type: string;

  @Field()
  timestamp: Date;

  @Field({ nullable: true })
  source?: string;
}

@ObjectType()
export class SimulationRun {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  started_at?: Date;

  @Field({ nullable: true })
  completed_at?: Date;

  @Field()
  created_at: Date;
}

@ObjectType()
export class SimulationResult {
  @Field(() => ID)
  id: string;

  @Field(() => AgentProfile)
  agent: AgentProfile;

  @Field(() => EconomicEvent)
  event: EconomicEvent;

  @Field()
  emergent_sentiment: string;

  @Field(() => Float)
  price_bias: number;

  @Field({ nullable: true })
  trade_action?: string;

  @Field(() => Float)
  confidence: number;

  @Field({ nullable: true })
  reasoning?: string;

  @Field()
  created_at: Date;
}

@ObjectType()
export class CurrencySentiment {
  @Field()
  currency_pair: string;

  @Field(() => Float)
  bias: number;

  @Field(() => Float)
  volume_estimate: number;
}

@ObjectType()
export class MarketSentiment {
  @Field(() => Float)
  overall_bias: number;

  @Field(() => Float)
  sentiment_score: number;

  @Field(() => Int)
  agent_count: number;

  @Field()
  dominant_persona: string;

  @Field(() => [CurrencySentiment])
  currency_pairs: CurrencySentiment[];
}

@ObjectType()
export class SimulationLog {
  @Field()
  simulation_id: string;

  @Field()
  agent_id: string;

  @Field()
  agent_name: string;

  @Field()
  action: string;

  @Field()
  reasoning: string;

  @Field()
  timestamp: string;
}
