import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface MemoryEntry {
  id: string;
  agentId: string;
  eventType: string;
  content: string;
  sentiment: string;
  outcome: string;
  timestamp: Date;
}

export interface AgentMemoryState {
  agentId: string;
  traumaEvents: MemoryEntry[];
  successEvents: MemoryEntry[];
  recentInteractions: MemoryEntry[];
  decisionBias: Record<string, number>;
}

export interface ZepMemoryPayload {
  content: string;
  metadata?: Record<string, any>;
  sentiment?: string;
  outcome?: string;
}

@Injectable()
export class PersistentMemoryService {
  private zepApiKey: string;
  private zepApiUrl: string;

  constructor(private prisma: PrismaService) {
    this.zepApiKey = process.env.ZEP_API_KEY || '';
    this.zepApiUrl = process.env.ZEP_API_URL || 'https://api.getzep.com';
  }

  async addMemory(
    agentId: string,
    payload: ZepMemoryPayload,
    eventType: string = 'GENERAL'
  ): Promise<MemoryEntry> {
    const entry = await this.prisma.memoryEntry.create({
      data: {
        agent_id: agentId,
        event_type: eventType,
        content: payload.content,
        sentiment: payload.sentiment || 'NEUTRAL',
        outcome: payload.outcome || 'UNKNOWN',
      },
    });

    await this.syncToZepCloud(agentId, payload);

    return {
      id: entry.id,
      agentId: entry.agent_id,
      eventType: entry.event_type,
      content: entry.content,
      sentiment: entry.sentiment,
      outcome: entry.outcome,
      timestamp: entry.timestamp,
    };
  }

  async addSuccessMemory(agentId: string, content: string, details: Record<string, any>): Promise<MemoryEntry> {
    return this.addMemory(agentId, {
      content,
      metadata: details,
      outcome: 'SUCCESS',
      sentiment: 'POSITIVE',
    }, 'SUCCESS');
  }

  async addTraumaMemory(agentId: string, content: string, details: Record<string, any>): Promise<MemoryEntry> {
    return this.addMemory(agentId, {
      content,
      metadata: details,
      outcome: 'FAILURE',
      sentiment: 'NEGATIVE',
    }, 'TRAUMA');
  }

  async getAgentMemoryState(agentId: string): Promise<AgentMemoryState> {
    const memories = await this.prisma.memoryEntry.findMany({
      where: { agent_id: agentId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const traumaEvents = memories.filter(m => m.event_type === 'TRAUMA').slice(0, 10).map(m => ({
      id: m.id,
      agentId: m.agent_id,
      eventType: m.event_type,
      content: m.content,
      sentiment: m.sentiment,
      outcome: m.outcome,
      timestamp: m.timestamp,
    }));
    const successEvents = memories.filter(m => m.event_type === 'SUCCESS').slice(0, 10).map(m => ({
      id: m.id,
      agentId: m.agent_id,
      eventType: m.event_type,
      content: m.content,
      sentiment: m.sentiment,
      outcome: m.outcome,
      timestamp: m.timestamp,
    }));
    const recentInteractions = memories.slice(0, 20).map(m => ({
      id: m.id,
      agentId: m.agent_id,
      eventType: m.event_type,
      content: m.content,
      sentiment: m.sentiment,
      outcome: m.outcome,
      timestamp: m.timestamp,
    }));

    const decisionBias = this.deriveDecisionBias(agentId, memories);

    return {
      agentId,
      traumaEvents,
      successEvents,
      recentInteractions,
      decisionBias,
    };
  }

  async searchSimilarMemories(
    agentId: string,
    query: string,
    limit: number = 5
  ): Promise<MemoryEntry[]> {
    const memories = await this.prisma.memoryEntry.findMany({
      where: { agent_id: agentId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    const scored = memories.map(m => ({
      entry: {
        id: m.id,
        agentId: m.agent_id,
        eventType: m.event_type,
        content: m.content,
        sentiment: m.sentiment,
        outcome: m.outcome,
        timestamp: m.timestamp,
      },
      score: this.calculateTextSimilarity(query, m.content),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(s => s.entry);
  }

  async updateAgentLongTermMemory(agentId: string): Promise<void> {
    const memoryState = await this.getAgentMemoryMemoryState(agentId);
    
    const summary = this.generateMemorySummary(memoryState);

    await this.prisma.agentProfile.update({
      where: { id: agentId },
      data: {
        long_term_memory: summary as any,
      },
    });
  }

  private async syncToZepCloud(agentId: string, payload: ZepMemoryPayload): Promise<void> {
    if (!this.zepApiKey) {
      return;
    }

    try {
      await fetch(`${this.zepApiUrl}/v2/agents/${agentId}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.zepApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: payload.content,
          }],
          metadata: payload.metadata,
        }),
      });
    } catch (error) {
      console.error('Failed to sync to Zep Cloud:', error);
    }
  }

  private deriveDecisionBias(agentId: string, memories: any[]): Record<string, number> {
    const biases: Record<string, number> = {
      risk_averse: 0,
      momentum_seeker: 0,
      contrarian: 0,
      herd_follower: 0,
    };

    const successCount = memories.filter(m => m.outcome === 'SUCCESS').length;
    const traumaCount = memories.filter(m => m.outcome === 'FAILURE').length;

    const positiveMemories = memories.filter(m => m.sentiment === 'POSITIVE' || m.event_type === 'SUCCESS');
    const negativeMemories = memories.filter(m => m.sentiment === 'NEGATIVE' || m.event_type === 'TRAUMA');

    if (traumaCount > successCount) {
      biases.risk_averse = Math.min(1, traumaCount / 10);
    } else {
      biases.momentum_seeker = Math.min(1, successCount / 10);
    }

    const counterArgCount = memories.filter(m => m.content.toLowerCase().includes('however') || m.content.toLowerCase().includes('but')).length;
    if (counterArgCount > memories.length * 0.3) {
      biases.contrarian = Math.min(1, counterArgCount / 10);
    }

    const followCount = memories.filter(m => m.content.toLowerCase().includes('following') || m.content.toLowerCase().includes('trend')).length;
    if (followCount > memories.length * 0.3) {
      biases.herd_follower = Math.min(1, followCount / 10);
    }

    return biases;
  }

  private generateMemorySummary(state: AgentMemoryState): Record<string, any> {
    return {
      trauma_count: state.traumaEvents.length,
      success_count: state.successEvents.length,
      recent_interactions: state.recentInteractions.length,
      primary_biases: Object.entries(state.decisionBias)
        .filter(([_, v]) => v > 0.3)
        .map(([k, _]) => k),
      last_trauma: state.traumaEvents[0]?.content?.substring(0, 100),
      last_success: state.successEvents[0]?.content?.substring(0, 100),
    };
  }

  private calculateTextSimilarity(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of queryWords) {
      if (textWords.includes(word)) {
        matches++;
      }
    }
    
    return matches / Math.max(queryWords.length, 1);
  }

  private async getAgentMemoryMemoryState(agentId: string): Promise<AgentMemoryState> {
    return this.getAgentMemoryState(agentId);
  }
}