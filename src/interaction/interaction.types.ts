import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { v4 as uuid } from 'uuid';

export interface AgentInteractionData {
  simulationId: string;
  agentId: string;
  targetAgentId?: string;
  action: 'POST_ANALYSIS' | 'COUNTER_ARGUMENT' | 'FOLLOW_LEADER';
  content: string;
  reasoning?: string;
}

export interface InteractionResult {
  id: string;
  simulationId: string;
  agentId: string;
  action: string;
  content: string;
  sentiment: string;
  timestamp: Date;
}

@Injectable()
export class InteractionEngine {
  constructor(private prisma: PrismaService) {}

  async enqueueInteraction(data: AgentInteractionData): Promise<string> {
    const result = await this.processInteraction({ data, id: uuid() } as any);
    return result.id;
  }

  async enqueueBulkInteractions(interactions: AgentInteractionData[]): Promise<string[]> {
    const results: string[] = [];
    for (const data of interactions) {
      const result = await this.processInteraction({ data, id: uuid() } as any);
      results.push(result.id);
    }
    return results;
  }

  async getInteractionStats(simulationId: string) {
    const interactions = await this.prisma.agentInteraction.findMany({
      where: { simulation_id: simulationId },
      select: {
        action: true,
        agent_id: true,
      },
    });

    const stats = {
      total: interactions.length,
      byAction: {} as Record<string, number>,
      uniqueAgents: new Set(interactions.map(i => i.agent_id)).size,
    };

    interactions.forEach(i => {
      stats.byAction[i.action] = (stats.byAction[i.action] || 0) + 1;
    });

    return stats;
  }

  async processInteraction(job: { data: AgentInteractionData }): Promise<InteractionResult> {
    const { simulationId, agentId, targetAgentId, action, content, reasoning } = job.data;

    const sentiment = this.analyzeInteractionSentiment(action, content, reasoning);
    
    const result = await this.prisma.agentInteraction.create({
      data: {
        simulation_id: simulationId,
        agent_id: agentId,
        target_agent_id: targetAgentId,
        action,
        content,
        reasoning,
        sentiment,
      },
    });

    return {
      id: result.id,
      simulationId: result.simulation_id,
      agentId: result.agent_id,
      action: result.action,
      content: result.content,
      sentiment: result.sentiment || 'NEUTRAL',
      timestamp: result.timestamp,
    };
  }

  private analyzeInteractionSentiment(
    action: string,
    content: string,
    reasoning?: string
  ): string {
    const text = `${content} ${reasoning || ''}`.toLowerCase();
    
    if (action === 'COUNTER_ARGUMENT') {
      if (text.includes('disagree') || text.includes('wrong') || text.includes('alternative')) {
        return 'SKEPTICAL';
      }
      return 'NEUTRAL';
    }
    
    if (action === 'FOLLOW_LEADER') {
      if (text.includes('agree') || text.includes('following') || text.includes('trend')) {
        return 'CONFORMIST';
      }
      return 'NEUTRAL';
    }
    
    if (text.includes('bullish') || text.includes('buy') || text.includes('positive')) {
      return 'BULLISH';
    }
    if (text.includes('bearish') || text.includes('sell') || text.includes('negative')) {
      return 'BEARISH';
    }
    
    return 'NEUTRAL';
  }
}