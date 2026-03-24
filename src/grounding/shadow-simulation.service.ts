import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { WorldStateService, WorldStateSnapshot, Entity, Relationship } from './world-state.service';
import { AccuracyMonitorService } from './accuracy-monitor.service';

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  riskAppetite: number;
  timeHorizon: 'short' | 'medium' | 'long';
}

export interface AgentThought {
  agentId: string;
  agentName: string;
  persona: string;
  thoughtProcess: string;
  predictedAction: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  confidence: number;
  reasoning: string;
  relevantEntities: string[];
  timestamp: Date;
}

export interface DebateRound {
  round: number;
  thoughts: AgentThought[];
  consensus?: string;
  disagreement?: string;
}

export interface SimulationResult {
  simulationId: string;
  worldStateVersion: number;
  debateRounds: DebateRound[];
  finalVerdict: string;
  swarmAgreement: number;
  agentOpinions: AgentThought[];
  timestamp: Date;
}

@Injectable()
export class ShadowSimulationService {
  private readonly logger = new Logger(ShadowSimulationService.name);

  private readonly AGENT_PERSONAS: AgentPersona[] = [
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

  constructor(
    private prisma: PrismaService,
    private worldState: WorldStateService,
    private accuracyMonitor: AccuracyMonitorService,
  ) {}

  async runShadowSimulation(
    symbol: string,
    worldState?: WorldStateSnapshot,
  ): Promise<SimulationResult> {
    const simulationId = `shadow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const state = worldState || await this.worldState.getLatestWorldState();
    
    if (!state) {
      throw new Error('No world state available for simulation');
    }

    this.logger.log(`Starting shadow simulation ${simulationId} for ${symbol}`);

    const debateRounds: DebateRound[] = [];
    
    let currentRoundThoughts = await this.generateAgentThoughts(symbol, state);
    
    debateRounds.push({
      round: 1,
      thoughts: currentRoundThoughts,
    });

    const agreement = this.calculateAgreement(currentRoundThoughts);
    
    if (agreement < 0.6) {
      const counterArguments = await this.generateCounterArguments(
        currentRoundThoughts,
        state,
      );
      
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

    const result: SimulationResult = {
      simulationId,
      worldStateVersion: state.version,
      debateRounds,
      finalVerdict,
      swarmAgreement,
      agentOpinions: currentRoundThoughts,
      timestamp: new Date(),
    };

    this.logger.log(
      `Simulation ${simulationId} complete: ${finalVerdict} (agreement: ${(swarmAgreement * 100).toFixed(1)}%)`
    );

    return result;
  }

  private async generateAgentThoughts(
    symbol: string,
    worldState: WorldStateSnapshot,
  ): Promise<AgentThought[]> {
    const thoughts: AgentThought[] = [];

    for (const persona of this.AGENT_PERSONAS) {
      const thought = await this.generateSingleThought(persona, symbol, worldState);
      thoughts.push(thought);
    }

    return thoughts;
  }

  private async generateSingleThought(
    persona: AgentPersona,
    symbol: string,
    worldState: WorldStateSnapshot,
  ): Promise<AgentThought> {
    const relevantEntities = this.getRelevantEntities(persona.id, worldState);
    const priceData = worldState.priceTicks.find(t => t.symbol === symbol);
    const relevantNews = worldState.newsItems.filter(
      n => n.currencies?.some(c => symbol.includes(c)),
    );

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

  private getRelevantEntities(
    agentId: string,
    worldState: WorldStateSnapshot,
  ): Entity[] {
    const relevantTypes: Map<string, string[]> = new Map([
      ['whale', ['CURRENCY_PAIR', 'MARKET_EVENT', 'HIGH_IMPACT_EVENT']],
      ['retail-scalper', ['CURRENCY_PAIR', 'MARKET_EVENT', 'ECONOMIC_INDICATOR']],
      ['fundamental-analyst', ['CENTRAL_BANK', 'ECONOMIC_INDICATOR', 'CURRENCY', 'HIGH_IMPACT_EVENT']],
    ]);

    const types = relevantTypes.get(agentId) || [];

    return worldState.entities.filter(e => types.includes(e.type));
  }

  private performAnalysis(
    persona: AgentPersona,
    context: {
      symbol: string;
      priceData?: { bid: number; ask: number; time: number };
      entities: Entity[];
      news: Array<{ title: string; sentiment?: string; impact?: string }>;
      relationships: Relationship[];
    },
  ): {
    thoughtProcess: string;
    action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
    confidence: number;
    reasoning: string;
  } {
    const lines: string[] = [];
    
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

    let action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
    let confidence: number;
    let reasoning: string;

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

  private calculateMarketSentiment(
    news: Array<{ sentiment?: string; impact?: string }>,
  ): 'bullish' | 'bearish' | 'neutral' {
    let score = 0;
    let weight = 0;

    for (const item of news) {
      const impactWeight = item.impact === 'high' ? 2 : item.impact === 'medium' ? 1 : 0.5;
      weight += impactWeight;

      if (item.sentiment === 'positive') score += impactWeight;
      else if (item.sentiment === 'negative') score -= impactWeight;
    }

    if (score > weight * 0.3) return 'bullish';
    if (score < -weight * 0.3) return 'bearish';
    return 'neutral';
  }

  private analyzeEntitySentiment(entities: Entity[]): Record<string, string> {
    const sentiment: Record<string, string> = {};

    for (const entity of entities) {
      const sentiments = entity.properties.sentiment as string[] | undefined;
      
      if (sentiments && sentiments.length > 0) {
        const positive = sentiments.filter(s => s === 'positive').length;
        const negative = sentiments.filter(s => s === 'negative').length;

        if (positive > negative) sentiment[entity.label] = 'positive';
        else if (negative > positive) sentiment[entity.label] = 'negative';
        else sentiment[entity.label] = 'neutral';
      }
    }

    return sentiment;
  }

  private whaleStrategy(
    context: { priceData?: { bid: number; ask: number } },
    sentiment: 'bullish' | 'bearish' | 'neutral',
    entitySentiment: Record<string, string>,
  ): { action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT'; confidence: number; reasoning: string } {
    if (!context.priceData) {
      return { action: 'WAIT', confidence: 0.2, reasoning: 'No price data available' };
    }

    const spread = context.priceData.ask - context.priceData.bid;
    const tightSpread = spread < 0.001;

    if (sentiment === 'bullish' && tightSpread) {
      return { action: 'BUY', confidence: 0.7, reasoning: 'Bullish with tight spread - favorable entry' };
    } else if (sentiment === 'bearish' && tightSpread) {
      return { action: 'SELL', confidence: 0.7, reasoning: 'Bearish with tight spread - favorable short' };
    }

    return { action: 'HOLD', confidence: 0.5, reasoning: 'Waiting for better spread or clearer signal' };
  }

  private scalperStrategy(
    context: { priceData?: { bid: number; ask: number } },
    sentiment: 'bullish' | 'bearish' | 'neutral',
  ): { action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT'; confidence: number; reasoning: string } {
    if (!context.priceData) {
      return { action: 'WAIT', confidence: 0.2, reasoning: 'No price data available' };
    }

    if (sentiment === 'bullish') {
      return { action: 'BUY', confidence: 0.65, reasoning: 'Short-term bullish momentum detected' };
    } else if (sentiment === 'bearish') {
      return { action: 'SELL', confidence: 0.65, reasoning: 'Short-term bearish momentum detected' };
    }

    return { action: 'WAIT', confidence: 0.4, reasoning: 'No clear short-term direction' };
  }

  private fundamentalStrategy(
    context: { entities: Entity[] },
    sentiment: 'bullish' | 'bearish' | 'neutral',
    entitySentiment: Record<string, string>,
  ): { action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT'; confidence: number; reasoning: string } {
    const hasCentralBank = context.entities.some(e => e.type === 'CENTRAL_BANK');
    const hasHighImpact = context.entities.some(e => e.type === 'HIGH_IMPACT_EVENT');

    if (hasCentralBank || hasHighImpact) {
      if (sentiment === 'bullish') {
        return { action: 'BUY', confidence: 0.75, reasoning: 'Macro support - bullish fundamentals' };
      } else if (sentiment === 'bearish') {
        return { action: 'SELL', confidence: 0.75, reasoning: 'Macro headwinds - bearish fundamentals' };
      }
    }

    return { action: 'HOLD', confidence: 0.6, reasoning: 'No clear fundamental catalyst' };
  }

  private async generateCounterArguments(
    thoughts: AgentThought[],
    worldState: WorldStateSnapshot,
  ): Promise<AgentThought[]> {
    const counterThoughts: AgentThought[] = [];

    for (const thought of thoughts) {
      const persona = this.AGENT_PERSONAS.find(p => p.id === thought.agentId);
      if (!persona) continue;

      const contraryAction = thought.predictedAction === 'BUY' ? 'SELL' : 
                            thought.predictedAction === 'SELL' ? 'BUY' : 'HOLD';

      const counterReasoning = this.generateCounterReasoning(thought, worldState);

      counterThoughts.push({
        ...thought,
        thoughtProcess: `Initial: ${thought.thoughtProcess}\n\nCounter-argument: ${counterReasoning}`,
        predictedAction: contraryAction as 'BUY' | 'SELL' | 'HOLD',
        confidence: thought.confidence * 0.8,
        reasoning: counterReasoning,
        timestamp: new Date(),
      });
    }

    return counterThoughts;
  }

  private generateCounterReasoning(
    thought: AgentThought,
    worldState: WorldStateSnapshot,
  ): string {
    const opposingView = thought.predictedAction === 'BUY' ? 'sell pressure' : 'buy pressure';
    
    return `Counter-point: While the initial analysis suggested ${thought.predictedAction}, 
consider ${opposingView}. Market conditions may have shifted. 
Entities: ${thought.relevantEntities.join(', ')}. 
World state version: ${worldState.version}`;
  }

  private identifyDisagreement(thoughts: AgentThought[]): string {
    const actions = thoughts.map(t => t.predictedAction);
    const unique = [...new Set(actions)];

    if (unique.length === 1) return 'No disagreement - all agents aligned';
    
    return `Disagreement: Agents divided between ${unique.join(' vs ')}`;
  }

  private calculateAgreement(thoughts: AgentThought[]): number {
    if (thoughts.length === 0) return 0;

    const actions = thoughts.map(t => t.predictedAction);
    const actionCounts = new Map<string, number>();

    for (const action of actions) {
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    }

    const maxCount = Math.max(...actionCounts.values());
    return maxCount / actions.length;
  }

  private determineVerdict(thoughts: AgentThought[]): string {
    const agreement = this.calculateAgreement(thoughts);
    
    if (agreement >= 0.8) {
      const dominantAction = thoughts[0].predictedAction;
      return `${String(dominantAction).toUpperCase()} - Strong swarm consensus`;
    } else if (agreement >= 0.5) {
      const votes = thoughts.reduce((acc, t) => {
        acc[t.predictedAction] = (acc[t.predictedAction] || 0) + t.confidence;
        return acc;
      }, {} as Record<string, number>);

      const bestAction = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
      return `${bestAction} - Weighted majority`;
    }

    return 'HOLD - No clear consensus';
  }
}