"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSourcingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
let EventSourcingService = class EventSourcingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async appendEvent(simulationId, event) {
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
                payload: event.payload,
                metadata: event.metadata,
                version: nextVersion,
                timestamp: new Date(),
            },
        });
    }
    async queryEvents(query) {
        const where = {
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
                where.timestamp.gte = query.fromTimestamp;
            }
            if (query.toTimestamp) {
                where.timestamp.lte = query.toTimestamp;
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
    async replaySimulation(simulationId) {
        return this.queryEvents({ simulationId, limit: 10000 });
    }
    async getAggregateEvents(simulationId, aggregateId) {
        return this.queryEvents({ simulationId, aggregateId, limit: 500 });
    }
    async getLatestEvent(simulationId) {
        const event = await this.prisma.simulationEvent.findFirst({
            where: { simulation_id: simulationId },
            orderBy: { timestamp: 'desc' },
        });
        if (!event)
            return null;
        return {
            type: event.event_type,
            aggregateId: event.aggregate_id,
            payload: event.payload,
            metadata: event.metadata,
            timestamp: event.timestamp,
            version: event.version,
        };
    }
    async getEventCount(simulationId) {
        return this.prisma.simulationEvent.count({
            where: { simulation_id: simulationId },
        });
    }
};
exports.EventSourcingService = EventSourcingService;
exports.EventSourcingService = EventSourcingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventSourcingService);
//# sourceMappingURL=event-sourcing.service.js.map