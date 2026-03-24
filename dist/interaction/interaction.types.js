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
exports.InteractionEngine = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const uuid_1 = require("uuid");
let InteractionEngine = class InteractionEngine {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enqueueInteraction(data) {
        const result = await this.processInteraction({ data, id: (0, uuid_1.v4)() });
        return result.id;
    }
    async enqueueBulkInteractions(interactions) {
        const results = [];
        for (const data of interactions) {
            const result = await this.processInteraction({ data, id: (0, uuid_1.v4)() });
            results.push(result.id);
        }
        return results;
    }
    async getInteractionStats(simulationId) {
        const interactions = await this.prisma.agentInteraction.findMany({
            where: { simulation_id: simulationId },
            select: {
                action: true,
                agent_id: true,
            },
        });
        const stats = {
            total: interactions.length,
            byAction: {},
            uniqueAgents: new Set(interactions.map(i => i.agent_id)).size,
        };
        interactions.forEach(i => {
            stats.byAction[i.action] = (stats.byAction[i.action] || 0) + 1;
        });
        return stats;
    }
    async processInteraction(job) {
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
    analyzeInteractionSentiment(action, content, reasoning) {
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
};
exports.InteractionEngine = InteractionEngine;
exports.InteractionEngine = InteractionEngine = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InteractionEngine);
//# sourceMappingURL=interaction.types.js.map