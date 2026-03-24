import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface SimulationEvent {
  type: string;
  aggregateId: string;
  payload: any;
  metadata?: Record<string, any>;
  timestamp?: Date;
  version?: number;
}

export interface EventStoreQuery {
  simulationId: string;
  aggregateId?: string;
  eventType?: string;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  limit?: number;
}

@Injectable()
export class EventSourcingService {
  constructor(private prisma: PrismaService) {}

  async appendEvent(
    simulationId: string,
    event: Omit<SimulationEvent, 'timestamp' | 'version'>
  ): Promise<any> {
    const existingEvents = await this.prisma.simulationEvent.findMany({
      where: {
        simulation_id: simulationId,
        aggregate_id: event.aggregateId,
      },
      orderBy: { version: 'desc' },
      take: 1,
    });

    const nextVersion = existingEvents.length > 0 ? existingEvents[0].version + 1 : 1;

    return this.prisma.simulationEvent.create({
      data: {
        simulation_id: simulationId,
        aggregate_id: event.aggregateId,
        event_type: event.type,
        payload: event.payload as any,
        metadata: event.metadata as any,
        version: nextVersion,
        timestamp: new Date(),
      },
    });
  }

  async queryEvents(query: EventStoreQuery): Promise<SimulationEvent[]> {
    const where: any = {
      simulation_id: query.simulationId,
    };

    if (query.aggregateId) {
      where.aggregate_id = query.aggregateId;
    }

    if (query.eventType) {
      where.event_type = query.eventType;
    }

    if (query.fromTimestamp || query.toTimestamp) {
      where.timestamp = {};
      if (query.fromTimestamp) {
        (where.timestamp as any).gte = query.fromTimestamp;
      }
      if (query.toTimestamp) {
        (where.timestamp as any).lte = query.toTimestamp;
      }
    }

    const events = await this.prisma.simulationEvent.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: query.limit || 1000,
    });

    return events.map(e => ({
      type: e.event_type,
      aggregateId: e.aggregate_id,
      payload: e.payload,
      metadata: e.metadata,
      timestamp: e.timestamp,
      version: e.version,
    }));
  }

  async replaySimulation(simulationId: string): Promise<SimulationEvent[]> {
    return this.queryEvents({ simulationId, limit: 10000 });
  }

  async getAggregateEvents(simulationId: string, aggregateId: string): Promise<SimulationEvent[]> {
    return this.queryEvents({ simulationId, aggregateId, limit: 500 });
  }

  async getLatestEvent(simulationId: string): Promise<SimulationEvent | null> {
    const event = await this.prisma.simulationEvent.findFirst({
      where: { simulation_id: simulationId },
      orderBy: { timestamp: 'desc' },
    });

    if (!event) return null;

    return {
      type: event.event_type,
      aggregateId: event.aggregate_id,
      payload: event.payload,
      metadata: event.metadata,
      timestamp: event.timestamp,
      version: event.version,
    };
  }

  async getEventCount(simulationId: string): Promise<number> {
    return this.prisma.simulationEvent.count({
      where: { simulation_id: simulationId },
    });
  }
}