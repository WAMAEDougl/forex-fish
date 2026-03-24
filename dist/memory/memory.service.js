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
exports.PersistentMemoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
let PersistentMemoryService = class PersistentMemoryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.zepApiKey = process.env.ZEP_API_KEY || '';
        this.zepApiUrl = process.env.ZEP_API_URL || 'https://api.getzep.com';
    }
    async addMemory(agentId, payload, eventType = 'GENERAL') {
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
        return entry;
    }
    async addSuccessMemory(agentId, content, details) {
        return this.addMemory(agentId, {
            content,
            metadata: details,
            outcome: 'SUCCESS',
            sentiment: 'POSITIVE',
        }, 'SUCCESS');
    }
    async addTraumaMemory(agentId, content, details) {
        return this.addMemory(agentId, {
            content,
            metadata: details,
            outcome: 'FAILURE',
            sentiment: 'NEGATIVE',
        }, 'TRAUMA');
    }
    async getAgentMemoryState(agentId) {
        const memories = await this.prisma.memoryEntry.findMany({
            where: { agent_id: agentId },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
        const traumaEvents = memories.filter(m => m.event_type === 'TRAUMA').slice(0, 10);
        const successEvents = memories.filter(m => m.event_type === 'SUCCESS').slice(0, 10);
        const recentInteractions = memories.slice(0, 20);
        const decisionBias = this.deriveDecisionBias(agentId, memories);
        return {
            agentId,
            traumaEvents,
            successEvents,
            recentInteractions,
            decisionBias,
        };
    }
    async searchSimilarMemories(agentId, query, limit = 5) {
        const memories = await this.prisma.memoryEntry.findMany({
            where: { agent_id: agentId },
            orderBy: { timestamp: 'desc' },
            take: 50,
        });
        const scored = memories.map(m => ({
            entry: m,
            score: this.calculateTextSimilarity(query, m.content),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(s => s.entry);
    }
    async updateAgentLongTermMemory(agentId) {
        const memoryState = await this.getAgentMemoryMemoryState(agentId);
        const summary = this.generateMemorySummary(memoryState);
        await this.prisma.agentProfile.update({
            where: { id: agentId },
            data: {
                long_term_memory: summary,
            },
        });
    }
    async syncToZepCloud(agentId, payload) {
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
        }
        catch (error) {
            console.error('Failed to sync to Zep Cloud:', error);
        }
    }
    deriveDecisionBias(agentId, memories) {
        const biases = {
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
        }
        else {
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
    generateMemorySummary(state) {
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
    calculateTextSimilarity(query, text) {
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
    async getAgentMemoryMemoryState(agentId) {
        return this.getAgentMemoryState(agentId);
    }
};
exports.PersistentMemoryService = PersistentMemoryService;
exports.PersistentMemoryService = PersistentMemoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PersistentMemoryService);
//# sourceMappingURL=memory.service.js.map