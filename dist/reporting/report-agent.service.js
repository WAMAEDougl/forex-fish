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
exports.ReportAgent = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
let ReportAgent = class ReportAgent {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateMarketNarrative(simulationId) {
        const interactions = await this.prisma.agentInteraction.findMany({
            where: { simulation_id: simulationId },
            orderBy: { timestamp: 'asc' },
        });
        const agents = await this.prisma.agentProfile.findMany({
            where: {
                simulations: {
                    some: { simulation_id: simulationId },
                },
            },
            select: { id: true, persona: true },
        });
        const results = await this.prisma.simulationResult.findMany({
            where: { simulation_id: simulationId },
            select: {
                agent_id: true,
                emergent_sentiment: true,
                price_bias: true,
                trade_action: true,
            },
        });
        const herdBehavior = this.analyzeHerdBehavior(interactions, results, agents);
        const contrarianCoalitions = this.detectContrarianCoalitions(results, agents);
        const volatilityTriggers = this.identifyVolatilityTriggers(results, interactions);
        const keyEvents = this.extractKeyEvents(results, interactions);
        const summary = this.generateSummary(herdBehavior, contrarianCoalitions, volatilityTriggers);
        const narrative = {
            summary,
            herdBehavior,
            contrarianCoalitions,
            volatilityTriggers,
            keyEvents,
            timestamp: new Date(),
        };
        await this.prisma.marketNarrative.create({
            data: {
                simulation_id: simulationId,
                summary: narrative.summary,
                herd_behavior: narrative.herdBehavior,
                contrarian: narrative.contrarianCoalitions,
                volatility: narrative.volatilityTriggers,
                key_events: narrative.keyEvents,
            },
        });
        return narrative;
    }
    analyzeHerdBehavior(interactions, results, agents) {
        if (results.length === 0) {
            return {
                detected: false,
                dominantPersona: 'UNKNOWN',
                sentiment: 'NEUTRAL',
                strength: 0,
                affectedAgents: 0,
            };
        }
        const sentimentCounts = {};
        const personaSentiment = {};
        results.forEach(r => {
            sentimentCounts[r.emergent_sentiment] = (sentimentCounts[r.emergent_sentiment] || 0) + 1;
            const agent = agents.find(a => a.id === r.agent_id);
            if (agent) {
                if (!personaSentiment[agent.persona]) {
                    personaSentiment[agent.persona] = {};
                }
                personaSentiment[agent.persona][r.emergent_sentiment] =
                    (personaSentiment[agent.persona][r.emergent_sentiment] || 0) + 1;
            }
        });
        const dominantSentiment = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0];
        const totalAgents = results.length;
        const dominanceRatio = dominantSentiment[1] / totalAgents;
        let dominantPersona = 'UNKNOWN';
        let maxPersonaCount = 0;
        const personaCounts = {};
        results.forEach(r => {
            const agent = agents.find(a => a.id === r.agent_id);
            if (agent) {
                personaCounts[agent.persona] = (personaCounts[agent.persona] || 0) + 1;
            }
        });
        for (const [persona, count] of Object.entries(personaCounts)) {
            if (count > maxPersonaCount) {
                maxPersonaCount = count;
                dominantPersona = persona;
            }
        }
        const followLeaderInteractions = interactions.filter(i => i.action === 'FOLLOW_LEADER').length;
        const herdStrength = (dominanceRatio + followLeaderInteractions / Math.max(interactions.length, 1)) / 2;
        return {
            detected: dominanceRatio > 0.6 || herdStrength > 0.5,
            dominantPersona,
            sentiment: dominantSentiment[0],
            strength: Math.min(1, herdStrength),
            affectedAgents: dominantSentiment[1],
        };
    }
    detectContrarianCoalitions(results, agents) {
        const coalitions = [];
        const biasByAgent = {};
        results.forEach(r => {
            biasByAgent[r.agent_id] = r.price_bias;
        });
        const avgBias = results.reduce((sum, r) => sum + r.price_bias, 0) / Math.max(results.length, 1);
        const contrarians = results.filter(r => {
            const agent = agents.find(a => a.id === r.agent_id);
            return agent?.persona === 'CONTRARIAN' || Math.abs(r.price_bias - avgBias) > 0.3;
        });
        if (contrarians.length >= 3) {
            const contrarianBiases = contrarians.map(r => r.price_bias);
            const coalitionPosition = contrarianBiases.reduce((a, b) => a + b, 0) / contrarianBiases.length;
            const supportingPersonas = [...new Set(contrarians.map(r => {
                    const agent = agents.find(a => a.id === r.agent_id);
                    return agent?.persona || 'UNKNOWN';
                }))];
            coalitions.push({
                coalitionSize: contrarians.length,
                targetPosition: coalitionPosition > 0 ? 'BULLISH' : 'BEARISH',
                confidence: Math.min(1, contrarians.length / 10),
                supportingPersonas,
                reasoning: `Detected ${contrarians.length} contrarian agents opposing the herd trend`,
            });
        }
        const groupedByAction = this.groupBySentiment(results);
        for (const [sentiment, group] of Object.entries(groupedByAction)) {
            if (group.length >= 5 && sentiment !== this.getMostCommonSentiment(results)) {
                const positions = group.map(r => r.price_bias);
                const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
                coalitions.push({
                    coalitionSize: group.length,
                    targetPosition: avgPosition > 0 ? 'BULLISH' : 'BEARISH',
                    confidence: Math.min(1, group.length / 20),
                    supportingPersonas: ['MINORITY_COALITION'],
                    reasoning: `Found minority coalition of ${group.length} agents with opposing view`,
                });
            }
        }
        return coalitions;
    }
    identifyVolatilityTriggers(results, interactions) {
        const triggers = [];
        const extremeBiases = results.filter(r => Math.abs(r.price_bias) > 0.7);
        if (extremeBiases.length > 0) {
            triggers.push({
                event: 'EXTREME_POSITION_DETECTED',
                impact: extremeBiases.length / results.length,
                affectedCurrency: 'MULTI',
                confidence: Math.min(1, extremeBiases.length / 10),
                timestamp: new Date(),
            });
        }
        const counterArgCount = interactions.filter(i => i.action === 'COUNTER_ARGUMENT').length;
        if (counterArgCount > interactions.length * 0.3) {
            triggers.push({
                event: 'HIGH_CONFLICT_ENVIRONMENT',
                impact: counterArgCount / interactions.length,
                affectedCurrency: 'MULTI',
                confidence: 0.7,
                timestamp: new Date(),
            });
        }
        const sentimentChanges = this.detectSentimentShifts(results);
        if (sentimentChanges.length > 0) {
            triggers.push({
                event: 'SENTIMENT_SHIFT',
                impact: sentimentChanges.length / results.length,
                affectedCurrency: 'MULTI',
                confidence: 0.8,
                timestamp: new Date(),
            });
        }
        const volatileSentiments = results.filter(r => r.emergent_sentiment === 'VOLATILE');
        if (volatileSentiments.length > results.length * 0.2) {
            triggers.push({
                event: 'HIGH_VOLATILITY_MARKET',
                impact: volatileSentiments.length / results.length,
                affectedCurrency: 'MULTI',
                confidence: 0.9,
                timestamp: new Date(),
            });
        }
        return triggers;
    }
    extractKeyEvents(results, interactions) {
        const events = [];
        const sentimentGroups = this.groupBySentiment(results);
        const dominantSentiment = this.getMostCommonSentiment(results);
        if (dominantSentiment) {
            events.push({
                type: 'DOMINANT_SENTIMENT',
                description: `Market reached ${dominantSentiment} consensus`,
                impact: sentimentGroups[dominantSentiment]?.length || 0,
                agentsAffected: results.length,
            });
        }
        const buyCount = results.filter(r => r.trade_action === 'BUY').length;
        const sellCount = results.filter(r => r.trade_action === 'SELL').length;
        if (Math.abs(buyCount - sellCount) > results.length * 0.3) {
            events.push({
                type: 'TRADE_IMBALANCE',
                description: buyCount > sellCount ? 'BUY pressure dominant' : 'SELL pressure dominant',
                impact: Math.abs(buyCount - sellCount) / results.length,
                agentsAffected: Math.abs(buyCount - sellCount),
            });
        }
        const postAnalysisCount = interactions.filter(i => i.action === 'POST_ANALYSIS').length;
        if (postAnalysisCount > 0) {
            events.push({
                type: 'HIGH_ANALYSIS_ACTIVITY',
                description: `${postAnalysisCount} agents performed analysis`,
                impact: postAnalysisCount / interactions.length,
                agentsAffected: postAnalysisCount,
            });
        }
        return events;
    }
    generateSummary(herd, contrarians, triggers) {
        const parts = [];
        if (herd.detected) {
            parts.push(`HERD BEHAVIOR: ${herd.dominantPersona} agents driving ${herd.sentiment} sentiment (${(herd.strength * 100).toFixed(0)}% strength)`);
        }
        if (contrarians.length > 0) {
            parts.push(`CONTRARIAN COALITIONS: ${contrarians.length} minority groups detected opposing the dominant trend`);
        }
        if (triggers.length > 0) {
            const highImpact = triggers.filter(t => t.impact > 0.5);
            if (highImpact.length > 0) {
                parts.push(`VOLATILITY: ${highImpact.length} high-impact triggers identified`);
            }
        }
        if (parts.length === 0) {
            return 'Market showing balanced sentiment with no significant emergent patterns detected.';
        }
        return parts.join('. ') + '.';
    }
    groupBySentiment(results) {
        const groups = {};
        results.forEach(r => {
            if (!groups[r.emergent_sentiment]) {
                groups[r.emergent_sentiment] = [];
            }
            groups[r.emergent_sentiment].push(r);
        });
        return groups;
    }
    getMostCommonSentiment(results) {
        const counts = {};
        results.forEach(r => {
            counts[r.emergent_sentiment] = (counts[r.emergent_sentiment] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? sorted[0][0] : null;
    }
    detectSentimentShifts(results) {
        const shifts = [];
        const byAgent = {};
        results.forEach(r => {
            if (byAgent[r.agent_id] && byAgent[r.agent_id] !== r.emergent_sentiment) {
                shifts.push({ from: byAgent[r.agent_id], to: r.emergent_sentiment });
            }
            byAgent[r.agent_id] = r.emergent_sentiment;
        });
        return shifts;
    }
    async getNarrative(simulationId) {
        const narrative = await this.prisma.marketNarrative.findFirst({
            where: { simulation_id: simulationId },
            orderBy: { timestamp: 'desc' },
        });
        if (!narrative)
            return null;
        return {
            summary: narrative.summary,
            herdBehavior: narrative.herd_behavior,
            contrarianCoalitions: narrative.contrarian,
            volatilityTriggers: narrative.volatility,
            keyEvents: narrative.key_events,
            timestamp: narrative.timestamp,
        };
    }
};
exports.ReportAgent = ReportAgent;
exports.ReportAgent = ReportAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportAgent);
//# sourceMappingURL=report-agent.service.js.map