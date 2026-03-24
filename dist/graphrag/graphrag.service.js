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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRAGService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const prisma_service_1 = require("../common/prisma.service");
let GraphRAGService = class GraphRAGService {
    constructor(prisma) {
        this.prisma = prisma;
        this.isConnected = false;
    }
    async onModuleInit() {
        const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
        const user = process.env.NEO4J_USER || 'neo4j';
        const password = process.env.NEO4J_PASSWORD || 'password';
        try {
            this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password));
            await this.driver.verifyConnectivity();
            this.isConnected = true;
            await this.initializeBaseGraph();
        }
        catch (error) {
            console.warn('Neo4j connection failed, using fallback mode:', error.message);
            this.isConnected = false;
        }
    }
    async linkEventToCurrencies(eventData) {
        if (!this.isConnected) {
            await this.fallbackLinkEvent(eventData);
            return;
        }
        const session = this.driver.session();
        try {
            await session.run(`
        MERGE (e:Event {type: $eventType})
        MERGE (c:Currency {pair: $currencyPair})
        MERGE (e)-[:AFFECTS {weight: $impactScore}]->(c)
        RETURN e, c
        `, {
                eventType: eventData.event_type,
                currencyPair: eventData.currency_pair,
                impactScore: eventData.impact_score,
            });
        }
        finally {
            await session.close();
        }
    }
    async linkIndicatorToCurrency(indicator, currencyPair, correlation) {
        if (!this.isConnected) {
            await this.fallbackLinkIndicator(indicator, currencyPair, correlation);
            return;
        }
        const session = this.driver.session();
        try {
            await session.run(`
        MERGE (i:Indicator {name: $indicator})
        MERGE (c:Currency {pair: $currencyPair})
        MERGE (i)-[:CORRELATES {correlation: $correlation}]->(c)
        RETURN i, c
        `, { indicator, currencyPair, correlation });
        }
        finally {
            await session.close();
        }
    }
    async queryRelevantFactors(currencyPair, eventType) {
        if (!this.isConnected) {
            return this.fallbackQuery(currencyPair, eventType);
        }
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Event {type: $eventType})-[r:AFFECTS]->(c:Currency {pair: $currencyPair})
        MATCH (i:Indicator)-[:CORRELATES]->(c)
        RETURN e, c, i
        `, { eventType, currencyPair });
            const nodes = [];
            const edges = [];
            result.records.forEach(record => {
                nodes.push({
                    id: record.get('e').elementId,
                    type: 'event',
                    label: record.get('e').properties.type,
                    properties: record.get('e').properties,
                });
                nodes.push({
                    id: record.get('c').elementId,
                    type: 'currency',
                    label: record.get('c').properties.pair,
                    properties: record.get('c').properties,
                });
                nodes.push({
                    id: record.get('i').elementId,
                    type: 'indicator',
                    label: record.get('i').properties.name,
                    properties: record.get('i').properties,
                });
            });
            return { nodes, edges };
        }
        finally {
            await session.close();
        }
    }
    async getCurrenciesForEvent(eventType) {
        if (!this.isConnected) {
            return this.fallbackGetCurrencies(eventType);
        }
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Event {type: $eventType})-[r:AFFECTS]->(c:Currency)
        RETURN DISTINCT c.pair as pair
        ORDER BY r.weight DESC
        `, { eventType });
            return result.records.map(r => r.get('pair'));
        }
        finally {
            await session.close();
        }
    }
    async getIndicatorsForCurrency(currencyPair) {
        if (!this.isConnected) {
            return [];
        }
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (i:Indicator)-[r:CORRELATES]->(c:Currency {pair: $currencyPair})
        RETURN i.name as indicator, r.correlation as correlation
        `, { currencyPair });
            return result.records.map(r => ({
                indicator: r.get('indicator'),
                currencyPair,
                correlation: r.get('correlation'),
                confidence: Math.abs(r.get('correlation')),
            }));
        }
        finally {
            await session.close();
        }
    }
    async getFullGraph() {
        if (!this.isConnected) {
            return { nodes: [], edges: [] };
        }
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT 100
        `);
            const nodes = [];
            const edges = [];
            const seen = new Set();
            result.records.forEach(record => {
                const n = record.get('n');
                if (!seen.has(n.elementId)) {
                    seen.add(n.elementId);
                    nodes.push({
                        id: n.elementId,
                        type: n.labels[0] || 'unknown',
                        label: n.properties.name || n.properties.pair || n.properties.type,
                        properties: n.properties,
                    });
                }
                const r = record.get('r');
                const m = record.get('m');
                if (r && m) {
                    edges.push({
                        source: n.elementId,
                        target: m.elementId,
                        relationship: r.type,
                        weight: r.properties?.weight || r.properties?.correlation || 1,
                    });
                }
            });
            return { nodes, edges };
        }
        finally {
            await session.close();
        }
    }
    async initializeBaseGraph() {
        const session = this.driver.session();
        try {
            await session.run(`
        MERGE (nfp:NFP {name: 'NFP', category: 'employment'})
        MERGE (gdp:GDP {name: 'GDP', category: 'growth'})
        MERGE (cpi:CPI {name: 'CPI', category: 'inflation'})
        MERGE (fed:FED {name: 'Fed_Rate', category: 'central_bank'})
        
        MERGE (usdjpy:Currency {pair: 'USD/JPY'})
        MERGE (eurusd:Currency {pair: 'EUR/USD'})
        MERGE (gbpusd:Currency {pair: 'GBP/USD'})
        
        MERGE (nfp)-[:AFFECTS {weight: 0.9}]->(usdjpy)
        MERGE (nfp)-[:AFFECTS {weight: 0.8}]->(eurusd)
        MERGE (gdp)-[:AFFECTS {weight: 0.85}]->(eurusd)
        MERGE (cpi)-[:AFFECTS {weight: 0.7}]->(usdjpy)
        MERGE (fed)-[:AFFECTS {weight: 1.0}]->(usdjpy)
        `);
        }
        finally {
            await session.close();
        }
    }
    async fallbackLinkEvent(eventData) {
        await this.prisma.knowledgeGraphEntity.upsert({
            where: { id: eventData.event_type },
            update: {},
            create: {
                id: eventData.event_type,
                type: 'event',
                label: eventData.event_type,
                properties: { ...eventData },
            },
        });
    }
    async fallbackLinkIndicator(indicator, currencyPair, correlation) {
        await this.prisma.knowledgeGraphRelationship.create({
            data: {
                source_type: 'indicator',
                source_label: indicator,
                target_type: 'currency',
                target_label: currencyPair,
                relationship: 'CORRELATES',
                weight: correlation,
            },
        });
    }
    fallbackQuery(currencyPair, eventType) {
        return {
            nodes: [
                { id: eventType, type: 'event', label: eventType, properties: {} },
                { id: currencyPair, type: 'currency', label: currencyPair, properties: {} },
            ],
            edges: [
                { source: eventType, target: currencyPair, relationship: 'AFFECTS', weight: 0.7 },
            ],
        };
    }
    fallbackGetCurrencies(eventType) {
        const eventCurrencyMap = {
            NFP: ['USD/JPY', 'EUR/USD', 'GBP/USD'],
            GDP: ['EUR/USD', 'GBP/USD', 'USD/CAD'],
            INTEREST_RATE: ['USD/JPY', 'EUR/USD', 'GBP/USD'],
            INFLATION: ['USD/JPY', 'EUR/USD', 'GBP/USD'],
        };
        return eventCurrencyMap[eventType] || ['EUR/USD'];
    }
};
exports.GraphRAGService = GraphRAGService;
exports.GraphRAGService = GraphRAGService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GraphRAGService);
//# sourceMappingURL=graphrag.service.js.map