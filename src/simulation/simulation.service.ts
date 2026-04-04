import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AgentInferenceEngine } from '../agents/agent-inference.engine';
import { PersonaFactory } from '../agents/persona.factory';
import { AgentPersona, EconomicEventData, AgentInferenceResult, MarketBiasSignal } from '../common/interfaces/agent.interface';
import { SimulationStatus, SentimentType, TradeAction, StrategyType, PersonaType } from '../common/types/enums';
import { LLMService } from '../common/llm.service';
import { OASISService, OASISMarketData } from '../common/oasis.service';

@Injectable()
export class SimulationService implements OnModuleInit {
  private readonly logger = new Logger(SimulationService.name);
  private prisma: PrismaClient;
  private inferenceEngine: AgentInferenceEngine;
  private activeAgents: Map<string, AgentPersona> = new Map();

  constructor(
    private llmService: LLMService,
    private oasisService: OASISService,
  ) {
    this.prisma = new PrismaClient();
    this.inferenceEngine = new AgentInferenceEngine(this.llmService);
  }

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('SimulationService initialized with Prisma');
    
    if (this.oasisService.isEnabled()) {
      const healthy = await this.oasisService.healthCheck();
      this.logger.log(`OASIS integration ${healthy ? 'ready' : 'unavailable'}`);
    }
  }

  async getOASISMarketBias(marketData: OASISMarketData) {
    if (!this.oasisService.isEnabled()) {
      return null;
    }
    return this.oasisService.analyzeMarket(marketData);
  }

  async createAgentProfile(data: {
    name: string;
    persona: string;
    risk_appetite: number;
    strategy_type: string;
    capital: number;
  }) {
    return this.prisma.agentProfile.create({
      data: {
        name: data.name,
        persona: data.persona,
        risk_appetite: data.risk_appetite,
        strategy_type: data.strategy_type,
        capital: data.capital,
      },
    });
  }

  async createEconomicEvent(data: {
    title: string;
    description?: string;
    impact_score: number;
    currency_pair: string;
    event_type: string;
    source?: string;
  }) {
    return this.prisma.economicEvent.create({
      data: {
        title: data.title,
        description: data.description,
        impact_score: data.impact_score,
        currency_pair: data.currency_pair,
        event_type: data.event_type,
        source: data.source,
      },
    });
  }

  async startSimulation(eventId: string): Promise<any> {
    const event = await this.prisma.economicEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error(`EconomicEvent with id ${eventId} not found`);
    }

    const simulation = await this.prisma.simulationRun.create({
      data: {
        id: uuidv4(),
        status: SimulationStatus.RUNNING,
        started_at: new Date(),
        name: `Sim-${event.title}-${Date.now()}`,
      },
    });

    const swarm = await this.initializeSwarm(eventId);

    const results = await this.runSwarmInference(simulation.id, swarm, event);

    await this.prisma.simulationRun.update({
      where: { id: simulation.id },
      data: {
        status: SimulationStatus.COMPLETED,
        completed_at: new Date(),
      },
    });

    return {
      simulation,
      results,
    };
  }

  async initializeSwarm(eventId: string): Promise<AgentPersona[]> {
    const personaTypes = Object.values(PersonaType);
    const swarmSize = 20;
    const swarm: AgentPersona[] = [];

    const whaleCount = Math.ceil(swarmSize * 0.1);
    const panicSellerCount = Math.ceil(swarmSize * 0.15);
    const scalperCount = Math.floor(swarmSize * 0.25);
    const momentumCount = Math.floor(swarmSize * 0.2);
    const contrarianCount = Math.floor(swarmSize * 0.1);
    const newsTraderCount = Math.floor(swarmSize * 0.1);
    const algorithmicCount = swarmSize - (whaleCount + panicSellerCount + scalperCount + momentumCount + contrarianCount + newsTraderCount);

    const distribution = [
      { persona: PersonaType.WHALE, count: whaleCount, capital: 1000000 },
      { persona: PersonaType.PANIC_SELLER, count: panicSellerCount, capital: 50000 },
      { persona: PersonaType.SCALPER, count: scalperCount, capital: 10000 },
      { persona: PersonaType.MOMENTUM_TRADER, count: momentumCount, capital: 100000 },
      { persona: PersonaType.CONTRARIAN, count: contrarianCount, capital: 250000 },
      { persona: PersonaType.NEWS_TRADER, count: newsTraderCount, capital: 75000 },
      { persona: PersonaType.ALGORITHMIC, count: algorithmicCount, capital: 500000 },
    ];

    for (const group of distribution) {
      for (let i = 0; i < group.count; i++) {
        const agent = PersonaFactory.getPersona(uuidv4(), {
          persona: group.persona,
          capital: group.capital * (0.8 + Math.random() * 0.4),
        });
        swarm.push(agent);
        this.activeAgents.set(agent.id, agent);
      }
    }

    this.logger.log(`Initialized swarm with ${swarm.length} agents`);
    return swarm;
  }

  async runSwarmInference(
    simulationId: string,
    swarm: AgentPersona[],
    event: any
  ): Promise<AgentInferenceResult[]> {
    const eventData: EconomicEventData = {
      id: event.id,
      title: event.title,
      description: event.description,
      impact_score: event.impact_score,
      currency_pair: event.currency_pair,
      event_type: event.event_type,
      timestamp: event.timestamp,
      source: event.source,
    };

    const results: AgentInferenceResult[] = [];

    for (const agent of swarm) {
      const inferenceResult = await this.inferenceEngine.infer(agent, eventData);
      inferenceResult.simulation_id = simulationId;

      const savedResult = await this.prisma.simulationResult.create({
        data: {
          id: uuidv4(),
          agent_id: agent.id,
          event_id: event.id,
          simulation_id: simulationId,
          emergent_sentiment: inferenceResult.emergent_sentiment,
          price_bias: inferenceResult.price_bias,
          trade_action: inferenceResult.trade_action,
          confidence: inferenceResult.confidence,
          reasoning: inferenceResult.reasoning,
        },
      });

      results.push({ ...inferenceResult, id: savedResult.id });

      if (!this.activeAgents.has(agent.id)) {
        await this.prisma.agentProfile.create({
          data: {
            id: agent.id,
            name: agent.name,
            persona: agent.persona,
            risk_appetite: agent.risk_appetite,
            strategy_type: agent.strategy_type,
            capital: agent.capital,
          },
        });
      }
    }

    return results;
  }

  async getAgentActivity(simId: string) {
    return this.prisma.simulationResult.findMany({
      where: { simulation_id: simId },
      include: {
        agent: true,
        event: true,
      },
    });
  }

  async getMarketSentiment(): Promise<MarketBiasSignal> {
    const recentResults = await this.prisma.simulationResult.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        agent: true,
        event: true,
      },
    });

    if (recentResults.length === 0) {
      return {
        overall_bias: 0,
        sentiment_score: 0,
        agent_count: 0,
        dominant_persona: 'NONE',
        currency_pairs: new Map(),
      };
    }

    const personaCounts = new Map<string, number>();
    const currencyPairs = new Map<string, { bias: number; count: number }>();

    let totalBias = 0;
    let bullishCount = 0;
    let bearishCount = 0;

    for (const result of recentResults) {
      totalBias += result.price_bias;
      
      if (result.emergent_sentiment === SentimentType.BULLISH) bullishCount++;
      if (result.emergent_sentiment === SentimentType.BEARISH) bearishCount++;

      const persona = result.agent.persona;
      personaCounts.set(persona, (personaCounts.get(persona) || 0) + 1);

      const pair = result.event.currency_pair;
      const current = currencyPairs.get(pair) || { bias: 0, count: 0 };
      currencyPairs.set(pair, {
        bias: current.bias + result.price_bias,
        count: current.count + 1,
      });
    }

    const agentCount = recentResults.length;
    const overallBias = totalBias / agentCount;
    const sentimentScore = (bullishCount - bearishCount) / agentCount;

    let dominantPersona = 'NONE';
    let maxCount = 0;
    for (const [persona, count] of personaCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantPersona = persona;
      }
    }

    const currencySentiments = new Map<string, { bias: number; volume_estimate: number }>();
    for (const [pair, data] of currencyPairs) {
      currencySentiments.set(pair, {
        bias: data.bias / data.count,
        volume_estimate: data.count,
      });
    }

    return {
      overall_bias: overallBias,
      sentiment_score: sentimentScore,
      agent_count: agentCount,
      dominant_persona: dominantPersona,
      currency_pairs: currencySentiments,
    };
  }

  async getSimulationRun(id: string) {
    return this.prisma.simulationRun.findUnique({
      where: { id },
      include: {
        results: {
          include: {
            agent: true,
            event: true,
          },
        },
      },
    });
  }

  async getAllSimulationRuns() {
    return this.prisma.simulationRun.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  getActiveAgents(): AgentPersona[] {
    return Array.from(this.activeAgents.values());
  }

  getInferenceEngine(): AgentInferenceEngine {
    return this.inferenceEngine;
  }
}
