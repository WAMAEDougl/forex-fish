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
var WorldStateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldStateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
let WorldStateService = WorldStateService_1 = class WorldStateService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(WorldStateService_1.name);
        this.ENTITY_EXTRACTION_PATTERNS = new Map([
            ['CURRENCY', [
                    /\b(AUD|CAD|CHF|EUR|GBP|JPY|NZD|USD)\b/gi,
                    /\b(EURUSD|GBPUSD|USDJPY|USDCHF|AUDUSD|USDCAD|NZDUSD|EURGBP|EURJPY|GBPJPY|AUDNZD|EURAUD|USDCNH)\b/gi,
                ]],
            ['CENTRAL_BANK', [
                    /\b(FED|Federal Reserve|ECB|European Central Bank|BOJ|Bank of Japan|BOE|Bank of England|RBA|Reserve Bank of Australia|BNZ)\b/gi,
                ]],
            ['ECONOMIC_INDICATOR', [
                    /\b(GDP|CPI|Inflation|PCE|NFP|Non-Farm Payrolls|Unemployment|PMI|ISM|Retail Sales|Trade Balance|Interest Rate)\b/gi,
                ]],
            ['MARKET_EVENT', [
                    /\b(Bullish|Bearish|Rally|Crash|Surge|Drop|Gain|Loss|Volatility|Support|Resistance|Breakout)\b/gi,
                ]],
            ['TIMEFRAME', [
                    /\b(5 minute|15 minute|30 minute|1 hour|4 hour|daily|weekly|monthly)\b/gi,
                ]],
        ]);
    }
    async buildWorldState(newsMaterial, tickData) {
        const entities = this.extractEntities(newsMaterial, tickData);
        const relationships = this.extractRelationships(entities, newsMaterial, tickData);
        const snapshot = {
            version: Date.now(),
            entities,
            relationships,
            priceTicks: tickData,
            newsItems: newsMaterial.newsItems,
            timestamp: new Date(),
        };
        await this.persistWorldState(snapshot);
        await this.storeContextFragments(entities, relationships, newsMaterial, tickData);
        this.logger.log(`World State v${snapshot.version}: ${entities.length} entities, ${relationships.length} relationships`);
        return snapshot;
    }
    extractEntities(newsMaterial, tickData) {
        const entities = new Map();
        for (const pattern of this.ENTITY_EXTRACTION_PATTERNS) {
            const [type, regexes] = pattern;
            for (const regex of regexes) {
                for (const item of newsMaterial.newsItems) {
                    const matches = item.title.matchAll(regex);
                    for (const match of matches) {
                        const label = match[0].toUpperCase();
                        const key = `${type}:${label}`;
                        if (!entities.has(key)) {
                            entities.set(key, {
                                type,
                                label,
                                properties: {
                                    mentions: 0,
                                    sentiment: [],
                                    sources: [],
                                    firstSeen: item.publishedAt,
                                    lastSeen: item.publishedAt,
                                },
                            });
                        }
                        const entity = entities.get(key);
                        entity.properties.mentions = entity.properties.mentions + 1;
                        entity.properties.sentiment.push(item.sentiment || 'neutral');
                        entity.properties.sources.push(item.source);
                        if (new Date(item.publishedAt) > new Date(entity.properties.lastSeen)) {
                            entity.properties.lastSeen = item.publishedAt;
                        }
                    }
                }
            }
        }
        for (const tick of tickData) {
            const symbol = tick.symbol.toUpperCase();
            const symbolKey = `CURRENCY_PAIR:${symbol}`;
            if (!entities.has(symbolKey)) {
                entities.set(symbolKey, {
                    type: 'CURRENCY_PAIR',
                    label: symbol,
                    properties: {
                        bid: tick.bid,
                        ask: tick.ask,
                        lastUpdate: tick.time,
                    },
                });
            }
            const currencyCodes = symbol.match(/[A-Z]{3}/g) || [];
            for (const code of currencyCodes) {
                const currencyKey = `CURRENCY:${code}`;
                if (!entities.has(currencyKey)) {
                    entities.set(currencyKey, {
                        type: 'CURRENCY',
                        label: code,
                        properties: {
                            currentPair: symbol,
                        },
                    });
                }
            }
        }
        for (const item of newsMaterial.newsItems) {
            if (item.impact === 'high') {
                const impactKey = `HIGH_IMPACT_EVENT:${item.id}`;
                entities.set(impactKey, {
                    type: 'HIGH_IMPACT_EVENT',
                    label: item.title.substring(0, 50),
                    properties: {
                        source: item.source,
                        publishedAt: item.publishedAt,
                        currencies: item.currencies,
                        sentiment: item.sentiment,
                        url: item.url,
                    },
                });
            }
        }
        return Array.from(entities.values());
    }
    extractRelationships(entities, newsMaterial, tickData) {
        const relationships = [];
        for (const entity of entities) {
            if (entity.type === 'CURRENCY_PAIR') {
                const currencies = entity.label.match(/[A-Z]{3}/g) || [];
                if (currencies.length >= 2) {
                    relationships.push({
                        sourceType: 'CURRENCY',
                        sourceLabel: currencies[0],
                        targetType: 'CURRENCY_PAIR',
                        targetLabel: entity.label,
                        relationship: 'COMPRISES',
                        weight: 1.0,
                    });
                    relationships.push({
                        sourceType: 'CURRENCY',
                        sourceLabel: currencies[1],
                        targetType: 'CURRENCY_PAIR',
                        targetLabel: entity.label,
                        relationship: 'COMPRISES',
                        weight: 1.0,
                    });
                }
            }
            if (entity.type === 'CENTRAL_BANK') {
                const currencyMap = {
                    'FED': 'USD',
                    'ECB': 'EUR',
                    'BOJ': 'JPY',
                    'BOE': 'GBP',
                    'RBA': 'AUD',
                    'BNZ': 'NZD',
                };
                const currency = currencyMap[entity.label];
                if (currency) {
                    relationships.push({
                        sourceType: 'CENTRAL_BANK',
                        sourceLabel: entity.label,
                        targetType: 'CURRENCY',
                        targetLabel: currency,
                        relationship: 'CONTROLS',
                        weight: 1.0,
                    });
                }
            }
            if (entity.type === 'ECONOMIC_INDICATOR') {
                for (const tick of tickData) {
                    const currencies = tick.symbol.match(/[A-Z]{3}/g) || [];
                    for (const currency of currencies) {
                        relationships.push({
                            sourceType: 'ECONOMIC_INDICATOR',
                            sourceLabel: entity.label,
                            targetType: 'CURRENCY',
                            targetLabel: currency,
                            relationship: 'AFFECTS',
                            weight: entity.properties.mentions / 10,
                        });
                    }
                }
            }
            if (entity.type === 'HIGH_IMPACT_EVENT') {
                const currencies = entity.properties.currencies || [];
                for (const currency of currencies) {
                    relationships.push({
                        sourceType: 'HIGH_IMPACT_EVENT',
                        sourceLabel: entity.label,
                        targetType: 'CURRENCY',
                        targetLabel: currency,
                        relationship: 'IMPACTS',
                        weight: 1.0,
                    });
                }
            }
        }
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const e1 = entities[i];
                const e2 = entities[j];
                if (e1.type === e2.type && e1.type === 'CURRENCY') {
                    const coMentions = this.countCoMentions(newsMaterial, e1.label, e2.label);
                    if (coMentions > 0) {
                        relationships.push({
                            sourceType: e1.type,
                            sourceLabel: e1.label,
                            targetType: e2.type,
                            targetLabel: e2.label,
                            relationship: 'CORRELATES_WITH',
                            weight: Math.min(coMentions / 10, 1.0),
                        });
                    }
                }
            }
        }
        return relationships;
    }
    countCoMentions(newsMaterial, label1, label2) {
        let count = 0;
        for (const item of newsMaterial.newsItems) {
            const text = (item.title + ' ' + (item.description || '')).toUpperCase();
            const has1 = text.includes(label1.toUpperCase());
            const has2 = text.includes(label2.toUpperCase());
            if (has1 && has2)
                count++;
        }
        return count;
    }
    async persistWorldState(snapshot) {
        await this.prisma.worldState.create({
            data: {
                version: snapshot.version,
                snapshot: snapshot,
                price_ticks: snapshot.priceTicks,
                news_items: snapshot.newsItems,
                entities: snapshot.entities,
                relationships: snapshot.relationships,
            },
        });
    }
    async storeContextFragments(entities, relationships, newsMaterial, tickData) {
        for (const entity of entities) {
            const relatedNews = newsMaterial.newsItems.filter(item => item.title.toUpperCase().includes(entity.label.toLowerCase()));
            const relatedRelationships = relationships.filter(r => r.sourceLabel === entity.label || r.targetLabel === entity.label);
            const content = `
Entity: ${entity.label} (${entity.type})
Properties: ${JSON.stringify(entity.properties)}

Related News:
${relatedNews.map(n => `- ${n.title} (${n.sentiment})`).join('\n')}

Related Relationships:
${relatedRelationships.map(r => `- ${r.sourceLabel} --[${r.relationship}]--> ${r.targetLabel}`).join('\n')}
      `.trim();
            await this.prisma.contextFragment.create({
                data: {
                    entity_type: entity.type,
                    entity_label: entity.label,
                    content,
                    source_type: 'WORLD_STATE',
                    news_data: {
                        items: relatedNews.map(n => ({
                            title: n.title,
                            sentiment: n.sentiment,
                            impact: n.impact,
                        })),
                    },
                    tick_data: tickData.length > 0 ? {
                        latest: tickData[tickData.length - 1],
                        count: tickData.length,
                    } : null,
                },
            });
        }
    }
    async getContextForQuery(query) {
        const latestState = await this.prisma.worldState.findFirst({
            orderBy: { created_at: 'desc' },
        });
        if (!latestState) {
            return {
                entities: [],
                relationships: [],
                context: 'No world state available',
            };
        }
        const snapshot = latestState.snapshot;
        const queryLower = query.toLowerCase();
        const relevantEntities = snapshot.entities.filter(e => queryLower.includes(e.label.toLowerCase()) ||
            e.label.toLowerCase().includes(queryLower));
        const relevantRelationships = snapshot.relationships.filter(r => relevantEntities.some(e => e.label === r.sourceLabel || e.label === r.targetLabel));
        const context = `
Current Market State (${snapshot.timestamp.toISOString()}):

Price Ticks:
${snapshot.priceTicks.map(t => `${t.symbol}: bid=${t.bid}, ask=${t.ask}`).join('\n')}

Key Entities:
${relevantEntities.map(e => `- ${e.type}: ${e.label}`).join('\n')}

Relationships:
${relevantRelationships.map(r => `- ${r.sourceLabel} --[${r.relationship}]--> ${r.targetLabel}`).join('\n')}
    `.trim();
        return {
            entities: relevantEntities,
            relationships: relevantRelationships,
            context,
        };
    }
    async getLatestWorldState() {
        const latest = await this.prisma.worldState.findFirst({
            orderBy: { created_at: 'desc' },
        });
        if (!latest)
            return null;
        return latest.snapshot;
    }
};
exports.WorldStateService = WorldStateService;
exports.WorldStateService = WorldStateService = WorldStateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorldStateService);
//# sourceMappingURL=world-state.service.js.map