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
export declare class EventSourcingService {
    private prisma;
    constructor(prisma: PrismaService);
    appendEvent(simulationId: string, event: Omit<SimulationEvent, 'timestamp' | 'version'>): Promise<any>;
    queryEvents(query: EventStoreQuery): Promise<SimulationEvent[]>;
    replaySimulation(simulationId: string): Promise<SimulationEvent[]>;
    getAggregateEvents(simulationId: string, aggregateId: string): Promise<SimulationEvent[]>;
    getLatestEvent(simulationId: string): Promise<SimulationEvent | null>;
    getEventCount(simulationId: string): Promise<number>;
}
