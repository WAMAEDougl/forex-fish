import { Resolver, Query, Mutation, Args, ID, Subscription } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { PubSub } from '../common/pubsub.service';
import { SimulationService } from '../simulation/simulation.service';
import { 
  AgentProfile, 
  EconomicEvent, 
  SimulationRun, 
  SimulationResult,
  MarketSentiment,
  SimulationLog,
  MarketBias,
  SimulationRunExtended,
  AgentProfileExtended
} from '../common/types/graphql.types';
import { GodModeController, GlobalEventInput } from '../eventsourcing/god-mode.controller';
import { SimulationGateway } from '../gateway/simulation.gateway';
import { InputType, Field } from '@nestjs/graphql';
import { InteractionEngine, AgentInteractionData } from '../interaction/interaction.types';
import { ReportAgent } from '../reporting/report-agent.service';
import { GraphRAGService } from '../graphrag/graphrag.service';
import { PersistentMemoryService } from '../memory/memory.service';
import { EventSourcingService } from '../eventsourcing/event-sourcing.service';
import { GroundingEngineService, GroundingCycleResult } from '../grounding/grounding-engine.service';

@InputType()
export class SimulationInput {
  @Field()
  pair: string;

  @Field()
  eventType: string;
}

@InputType()
export class EventInput {
  @Field()
  type: string;

  @Field({ nullable: true })
  description?: string;
}

@Resolver(() => AgentProfile)
export class SimulationResolver {
  constructor(
    private readonly simulationService: SimulationService,
    private readonly godModeController: GodModeController,
    private readonly interactionEngine: InteractionEngine,
    private readonly reportAgent: ReportAgent,
    private readonly graphRAG: GraphRAGService,
    private readonly memoryService: PersistentMemoryService,
    private readonly eventSourcing: EventSourcingService,
    private readonly pubSub: PubSub,
    private readonly groundingEngine: GroundingEngineService,
    private readonly simulationGateway: SimulationGateway,
  ) {}

  @Query(() => [AgentProfile])
  async getAgentProfiles() {
    const agents = await this.simulationService.getActiveAgents();
    return agents.map(a => ({
      id: a.id,
      name: a.name,
      persona: a.persona,
      risk_appetite: a.risk_appetite,
      strategy_type: a.strategy_type,
      capital: a.capital,
      long_term_memory: a.long_term_memory ? JSON.stringify(a.long_term_memory) : null,
      memory_embedding: a.memory_embedding,
      created_at: new Date(),
      updated_at: new Date(),
    }));
  }

  @Query(() => AgentProfile, { nullable: true })
  async getAgentProfile(@Args('id', { type: () => ID }) id: string) {
    const agents = await this.simulationService.getActiveAgents();
    const agent = agents.find(a => a.id === id);
    if (!agent) return null;
    return {
      id: agent.id,
      name: agent.name,
      persona: agent.persona,
      risk_appetite: agent.risk_appetite,
      strategy_type: agent.strategy_type,
      capital: agent.capital,
      long_term_memory: agent.long_term_memory ? JSON.stringify(agent.long_term_memory) : null,
      memory_embedding: agent.memory_embedding,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  @Query(() => [EconomicEvent])
  async getEconomicEvents() {
    return [];
  }

  @Query(() => EconomicEvent, { nullable: true })
  async getEconomicEvent(@Args('id', { type: () => ID }) id: string) {
    return null;
  }

  @Query(() => SimulationRun, { nullable: true })
  async getSimulationRun(@Args('id', { type: () => ID }) id: string) {
    return this.simulationService.getSimulationRun(id);
  }

  @Query(() => [SimulationRun])
  async getSimulationRuns() {
    return this.simulationService.getAllSimulationRuns();
  }

  @Query(() => [SimulationResult])
  async getAgentActivity(@Args('simId', { type: () => ID }) simId: string) {
    const results = await this.simulationService.getAgentActivity(simId);
    return results.map(r => ({
      id: r.id,
      agent: {
        id: r.agent.id,
        name: r.agent.name,
        persona: r.agent.persona,
        risk_appetite: r.agent.risk_appetite,
        strategy_type: r.agent.strategy_type,
        capital: r.agent.capital,
        created_at: r.agent.created_at,
        updated_at: r.agent.updated_at,
      },
      event: {
        id: r.event.id,
        title: r.event.title,
        description: r.event.description,
        impact_score: r.event.impact_score,
        currency_pair: r.event.currency_pair,
        event_type: r.event.event_type,
        timestamp: r.event.timestamp,
        source: r.event.source,
      },
      emergent_sentiment: r.emergent_sentiment,
      price_bias: r.price_bias,
      trade_action: r.trade_action,
      confidence: r.confidence,
      reasoning: r.reasoning,
      created_at: r.created_at,
    }));
  }

  @Query(() => MarketSentiment)
  async getMarketSentiment() {
    const sentiment = await this.simulationService.getMarketSentiment();
    const currencyPairs = Array.from(sentiment.currency_pairs.entries()).map(([pair, data]) => ({
      currency_pair: pair,
      bias: data.bias,
      volume_estimate: data.volume_estimate,
    }));
    
    return {
      overall_bias: sentiment.overall_bias,
      sentiment_score: sentiment.sentiment_score,
      agent_count: sentiment.agent_count,
      dominant_persona: sentiment.dominant_persona,
      currency_pairs: currencyPairs,
    };
  }

  @Query(() => [MarketBias])
  async getMarketBias() {
    const sentiment = await this.simulationService.getMarketSentiment();
    const pairs = Array.from(sentiment.currency_pairs.keys());
    if (pairs.length === 0) {
      return [{
        pair: 'EURUSD',
        bias: 'NEUTRAL',
        confidence: 0.5,
        dominantPersona: 'NONE',
        agentCount: 0,
        timestamp: new Date().toISOString(),
      }];
    }
    return pairs.map(pair => {
      const pairData = sentiment.currency_pairs.get(pair);
      const bias = pairData && pairData.bias > 0.1 ? 'BULLISH' : pairData && pairData.bias < -0.1 ? 'BEARISH' : 'NEUTRAL';
      return {
        pair,
        bias,
        confidence: Math.abs(pairData?.bias || 0),
        dominantPersona: sentiment.dominant_persona,
        agentCount: sentiment.agent_count,
        timestamp: new Date().toISOString(),
      };
    });
  }

  @Query(() => [AgentProfileExtended])
  async getAgents() {
    const agents = await this.simulationService.getActiveAgents();
    return agents.map(a => ({
      id: a.id,
      name: a.name,
      persona: a.persona,
      capital: a.capital,
      riskAppetite: a.risk_appetite,
      confidence: 0.5,
      lastAction: null,
      pnl: 0,
      isActive: true,
    }));
  }

  @Query(() => [SimulationRunExtended])
  async getSimulations() {
    const runs = await this.simulationService.getAllSimulationRuns();
    return runs.map(r => ({
      id: r.id,
      status: r.status,
      pair: 'EURUSD',
      eventType: 'UNKNOWN',
      startedAt: r.started_at?.toISOString(),
      completedAt: r.completed_at?.toISOString(),
      createdAt: r.created_at.toISOString(),
    }));
  }

  @Query(() => [GraphQLJSON])
  async getInteractions(@Args('simulationId', { type: () => ID }) simulationId: string) {
    const interactions = await this.interactionEngine.getInteractionStats(simulationId);
    return [];
  }

  @Query(() => GraphQLJSON, { nullable: true })
  async getMarketNarrative(@Args('simulationId', { type: () => ID }) simulationId: string) {
    return this.reportAgent.getNarrative(simulationId);
  }

  @Query(() => GraphQLJSON)
  async getKnowledgeGraphState() {
    return this.graphRAG.getFullGraph();
  }

  @Query(() => GraphQLJSON)
  async getAccuracy() {
    const metrics = await this.groundingEngine.getAccuracyMetrics(24);
    return {
      overall: (metrics.accuracy15m * 100).toFixed(1),
      byPair: Object.entries(metrics.byPersona).map(([pair, data]) => ({
        pair,
        accuracy: (data.accuracy * 100).toFixed(1),
        totalPredictions: data.predictions,
        correctPredictions: Math.round(data.predictions * data.accuracy),
      })),
      byAgent: Object.entries(metrics.byPersona).map(([agentId, data]) => ({
        agentId,
        agentName: agentId,
        accuracy: (data.accuracy * 100).toFixed(1),
      })),
    };
  }

  @Query(() => GraphQLJSON)
  async getGrounding() {
    const activePairs = this.groundingEngine.getActivePairs();
    return { activePairs };
  }

  @Query(() => GraphQLJSON)
  async getAgentMemoryState(@Args('agentId', { type: () => ID }) agentId: string) {
    const state = await this.memoryService.getAgentMemoryState(agentId);
    return {
      agent_id: state.agentId,
      trauma_count: state.traumaEvents.length,
      success_count: state.successEvents.length,
      primary_biases: Object.entries(state.decisionBias)
        .filter(([_, v]) => v > 0.3)
        .map(([k, _]) => k),
    };
  }

  @Mutation(() => AgentProfile)
  async createAgentProfile(
    @Args('name') name: string,
    @Args('persona') persona: string,
    @Args('risk_appetite') risk_appetite: number,
    @Args('strategy_type') strategy_type: string,
    @Args('capital') capital: number,
  ) {
    return this.simulationService.createAgentProfile({
      name,
      persona,
      risk_appetite,
      strategy_type,
      capital,
    });
  }

  @Mutation(() => EconomicEvent)
  async createEconomicEvent(
    @Args('title') title: string,
    @Args('description', { nullable: true }) description: string,
    @Args('impact_score') impact_score: number,
    @Args('currency_pair') currency_pair: string,
    @Args('event_type') event_type: string,
    @Args('source', { nullable: true }) source: string,
  ) {
    return this.simulationService.createEconomicEvent({
      title,
      description,
      impact_score,
      currency_pair,
      event_type,
      source,
    });
  }

  @Mutation(() => SimulationRunExtended)
  async createSimulation(@Args('input', { type: () => SimulationInput }) input: SimulationInput) {
    const event = await this.simulationService.createEconomicEvent({
      title: `${input.eventType} on ${input.pair}`,
      currency_pair: input.pair,
      event_type: input.eventType,
      impact_score: 5.0,
    });
    
    const simulation = await this.simulationService.startSimulation(event.id);
    
    this.simulationGateway.emitSimulationComplete(simulation.id, 0);
    
    return {
      id: simulation.id,
      status: simulation.status,
      pair: input.pair,
      eventType: input.eventType,
      startedAt: simulation.started_at?.toISOString(),
      completedAt: simulation.completed_at?.toISOString(),
      createdAt: simulation.created_at.toISOString(),
    };
  }

  @Mutation(() => SimulationRunExtended)
async startSimulation(@Args('simId', { type: () => ID }) simId: string) {
    const run = await this.simulationService.getSimulationRun(simId);
    this.simulationGateway.emitSimulationComplete(simId, 0);
    return {
      id: run?.id,
      status: run?.status,
      pair: 'EURUSD',
      eventType: 'UNKNOWN',
      startedAt: run?.started_at?.toISOString(),
      completedAt: run?.completed_at?.toISOString(),
      createdAt: run?.created_at?.toISOString(),
    };
  }

  @Mutation(() => SimulationResult)
  async runAgentInference(
    @Args('agentId', { type: () => ID }) agentId: string,
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('simulationId', { type: () => ID }) simulationId: string,
  ) {
    return null;
  }

  @Mutation(() => GraphQLJSON)
  async injectGlobalEvent(
    @Args('simulationId', { type: () => ID }) simulationId: string,
    @Args('eventData', { type: () => GlobalEventInput }) eventData: GlobalEventInput,
  ) {
    return this.godModeController.injectGlobalEvent(simulationId, eventData);
  }

  @Mutation(() => GraphQLJSON)
  async injectEvent(
    @Args('simId', { type: () => ID }) simId: string,
    @Args('event', { type: () => EventInput }) event: EventInput,
  ) {
    this.simulationGateway.emitAgentAction(
      simId,
      'GOD_MODE',
      event.type,
      event.description || 'Injected event',
    );
    return { success: true };
  }

  @Mutation(() => GraphQLJSON)
  async addAgentInteraction(
    @Args('simulationId', { type: () => ID }) simulationId: string,
    @Args('agentId', { type: () => ID }) agentId: string,
    @Args('targetAgentId', { type: () => ID, nullable: true }) targetAgentId: string | null,
    @Args('action') action: string,
    @Args('content') content: string,
    @Args('reasoning', { nullable: true }) reasoning: string | null,
  ) {
    const data: AgentInteractionData = {
      simulationId,
      agentId,
      targetAgentId: targetAgentId || undefined,
      action: action as any,
      content,
      reasoning: reasoning || undefined,
    };
    await this.interactionEngine.enqueueInteraction(data);
    return { success: true };
  }

  @Mutation(() => GraphQLJSON)
  async generateMarketNarrative(
    @Args('simulationId', { type: () => ID }) simulationId: string,
  ) {
    return this.reportAgent.generateMarketNarrative(simulationId);
  }

  @Mutation(() => GraphQLJSON)
  async addMemoryEntry(
    @Args('agentId', { type: () => ID }) agentId: string,
    @Args('content') content: string,
    @Args('eventType') eventType: string,
    @Args('sentiment', { nullable: true }) sentiment: string | null,
    @Args('outcome', { nullable: true }) outcome: string | null,
  ) {
    await this.memoryService.addMemory(agentId, {
      content,
      sentiment: sentiment || undefined,
      outcome: outcome || undefined,
    }, eventType);
    return { success: true };
  }

  @Mutation(() => GraphQLJSON)
  async updateKnowledgeGraph(
    @Args('eventType') eventType: string,
    @Args('currencyPair') currencyPair: string,
    @Args('impact') impact: number,
  ) {
    await this.graphRAG.linkEventToCurrencies({ event_type: eventType, currency_pair: currencyPair, impact_score: impact });
    return this.graphRAG.getFullGraph();
  }

  @Mutation(() => GraphQLJSON)
  async setActivePairs(
    @Args('pairs', { type: () => [String] }) pairs: string[],
  ) {
    this.groundingEngine.setActivePairs(pairs);
    return { activePairs: this.groundingEngine.getActivePairs() };
  }

  @Query(() => GraphQLJSON)
  async getActivePairs() {
    return { activePairs: this.groundingEngine.getActivePairs() };
  }

  @Query(() => [GraphQLJSON])
  async replaySimulation(
    @Args('simulationId', { type: () => ID }) simulationId: string,
  ) {
    const events = await this.eventSourcing.replaySimulation(simulationId);
    return events;
  }

  @Subscription(() => SimulationLog, {
    filter: (payload, variables) => {
      return payload.simulationLog.simulation_id === variables.simId;
    },
  })
  simulationLog(@Args('simId', { type: () => ID }) simId: string) {
    return this.pubSub.asyncIterator('simulationLog');
  }

  @Subscription(() => MarketSentiment)
  marketBiasUpdate() {
    return this.pubSub.asyncIterator('marketBiasUpdate');
  }
}