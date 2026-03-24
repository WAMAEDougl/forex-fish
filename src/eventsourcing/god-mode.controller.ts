import { Injectable } from '@nestjs/common';
import { EventSourcingService } from './event-sourcing.service';
import { GraphRAGService } from '../graphrag/graphrag.service';
import { AgentInferenceEngine } from '../agents/agent-inference.engine';
import { PrismaService } from '../common/prisma.service';
import { v4 as uuid } from 'uuid';

export interface GlobalEventInput {
  title: string;
  description?: string;
  event_type: string;
  currency_pair: string;
  impact_score: number;
  source?: string;
}

export interface ReflectionResult {
  affectedAgents: number;
  newPositions: number;
  consensusShift: number;
  timestamp: Date;
}

@Injectable()
export class GodModeController {
  constructor(
    private eventSourcing: EventSourcingService,
    private graphRAG: GraphRAGService,
    private inferenceEngine: AgentInferenceEngine,
    private prisma: PrismaService
  ) {}

  async injectGlobalEvent(simulationId: string, eventData: GlobalEventInput): Promise<ReflectionResult> {
    const eventId = uuid();
    const timestamp = new Date();

    const event = await this.prisma.economicEvent.create({
      data: {
        id: eventId,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        currency_pair: eventData.currency_pair,
        impact_score: eventData.impact_score,
        source: eventData.source || 'GOD_MODE',
        timestamp,
      },
    });

    await this.eventSourcing.appendEvent(simulationId, {
      type: 'GLOBAL_EVENT_INJECTED',
      aggregateId: eventId,
      payload: eventData,
      metadata: { injectedBy: 'GOD_MODE', simulationId },
    });

    await this.graphRAG.linkEventToCurrencies(eventData);

    const reflectionResult = await this.triggerReflectionLoop(simulationId, eventData);

    return reflectionResult;
  }

  private async triggerReflectionLoop(
    simulationId: string,
    eventData: GlobalEventInput
  ): Promise<ReflectionResult> {
    const agents = await this.prisma.agentProfile.findMany({
      include: {
        simulations: {
          where: { simulation_id: simulationId },
          take: 1,
        },
      },
    });

    const agentsToUpdate: any[] = [];
    let consensusShift = 0;
    let originalConsensus = 0;
    let newConsensus = 0;

    for (const agent of agents) {
      const priorPosition = agent.simulations[0]?.price_bias || 0;
      originalConsensus += priorPosition;

      const inferenceResult = await this.inferenceEngine.infer(
        {
          id: agent.id,
          name: agent.name,
          persona: agent.persona,
          risk_appetite: agent.risk_appetite,
          strategy_type: agent.strategy_type,
          capital: agent.capital,
        },
        {
          id: eventData.event_type,
          title: eventData.title,
          event_type: eventData.event_type,
          currency_pair: eventData.currency_pair,
          impact_score: eventData.impact_score,
          timestamp: new Date(),
        }
      );

      await this.prisma.simulationResult.create({
        data: {
          agent_id: agent.id,
          event_id: eventData.event_type,
          simulation_id: simulationId,
          emergent_sentiment: inferenceResult.emergent_sentiment,
          price_bias: inferenceResult.price_bias,
          trade_action: inferenceResult.trade_action,
          confidence: inferenceResult.confidence,
          reasoning: inferenceResult.reasoning,
        },
      });

      agentsToUpdate.push({
        agentId: agent.id,
        newPosition: inferenceResult.price_bias,
      });

      newConsensus += inferenceResult.price_bias;
    }

    consensusShift = Math.abs(newConsensus - originalConsensus) / Math.max(agents.length, 1);

    await this.eventSourcing.appendEvent(simulationId, {
      type: 'REFLECTION_LOOP_COMPLETED',
      aggregateId: 'reflection-loop',
      payload: {
        agentsCount: agents.length,
        eventType: eventData.event_type,
        consensusShift,
      },
      metadata: { triggeredBy: 'GOD_MODE' },
    });

    return {
      affectedAgents: agents.length,
      newPositions: agentsToUpdate.length,
      consensusShift,
      timestamp: new Date(),
    };
  }

  async getKnowledgeGraphState(): Promise<any> {
    return this.graphRAG.getFullGraph();
  }
}