import { Injectable, OnModuleInit } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { PrismaService } from '../common/prisma.service';

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface IndicatorLink {
  indicator: string;
  currencyPair: string;
  correlation: number;
  confidence: number;
}

@Injectable()
export class GraphRAGService implements OnModuleInit {
  private driver: Driver;
  private isConnected: boolean = false;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
      await this.driver.verifyConnectivity();
      this.isConnected = true;
      await this.initializeBaseGraph();
    } catch (error) {
      console.warn('Neo4j connection failed, using fallback mode:', error.message);
      this.isConnected = false;
    }
  }

  async linkEventToCurrencies(eventData: {
    event_type: string;
    currency_pair: string;
    impact_score: number;
  }): Promise<void> {
    if (!this.isConnected) {
      await this.fallbackLinkEvent(eventData);
      return;
    }

    const session = this.driver.session();
    try {
      await session.run(
        `
        MERGE (e:Event {type: $eventType})
        MERGE (c:Currency {pair: $currencyPair})
        MERGE (e)-[:AFFECTS {weight: $impactScore}]->(c)
        RETURN e, c
        `,
        {
          eventType: eventData.event_type,
          currencyPair: eventData.currency_pair,
          impactScore: eventData.impact_score,
        }
      );
    } finally {
      await session.close();
    }
  }

  async linkIndicatorToCurrency(
    indicator: string,
    currencyPair: string,
    correlation: number
  ): Promise<void> {
    if (!this.isConnected) {
      await this.fallbackLinkIndicator(indicator, currencyPair, correlation);
      return;
    }

    const session = this.driver.session();
    try {
      await session.run(
        `
        MERGE (i:Indicator {name: $indicator})
        MERGE (c:Currency {pair: $currencyPair})
        MERGE (i)-[:CORRELATES {correlation: $correlation}]->(c)
        RETURN i, c
        `,
        { indicator, currencyPair, correlation }
      );
    } finally {
      await session.close();
    }
  }

  async queryRelevantFactors(
    currencyPair: string,
    eventType: string
  ): Promise<GraphQueryResult> {
    if (!this.isConnected) {
      return this.fallbackQuery(currencyPair, eventType);
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Event {type: $eventType})-[r:AFFECTS]->(c:Currency {pair: $currencyPair})
        MATCH (i:Indicator)-[:CORRELATES]->(c)
        RETURN e, c, i
        `,
        { eventType, currencyPair }
      );

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

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
    } finally {
      await session.close();
    }
  }

  async getCurrenciesForEvent(eventType: string): Promise<string[]> {
    if (!this.isConnected) {
      return this.fallbackGetCurrencies(eventType);
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Event {type: $eventType})-[r:AFFECTS]->(c:Currency)
        RETURN DISTINCT c.pair as pair
        ORDER BY r.weight DESC
        `,
        { eventType }
      );

      return result.records.map(r => r.get('pair'));
    } finally {
      await session.close();
    }
  }

  async getIndicatorsForCurrency(currencyPair: string): Promise<IndicatorLink[]> {
    if (!this.isConnected) {
      return [];
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (i:Indicator)-[r:CORRELATES]->(c:Currency {pair: $currencyPair})
        RETURN i.name as indicator, r.correlation as correlation
        `,
        { currencyPair }
      );

      return result.records.map(r => ({
        indicator: r.get('indicator'),
        currencyPair,
        correlation: r.get('correlation'),
        confidence: Math.abs(r.get('correlation')),
      }));
    } finally {
      await session.close();
    }
  }

  async getFullGraph(): Promise<GraphQueryResult> {
    if (!this.isConnected) {
      return { nodes: [], edges: [] };
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT 100
        `
      );

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const seen = new Set<string>();

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
    } finally {
      await session.close();
    }
  }

  private async initializeBaseGraph(): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
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
        `
      );
    } finally {
      await session.close();
    }
  }

  private async fallbackLinkEvent(eventData: any): Promise<void> {
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

  private async fallbackLinkIndicator(
    indicator: string,
    currencyPair: string,
    correlation: number
  ): Promise<void> {
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

  private fallbackQuery(currencyPair: string, eventType: string): GraphQueryResult {
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

  private fallbackGetCurrencies(eventType: string): string[] {
    const eventCurrencyMap: Record<string, string[]> = {
      NFP: ['USD/JPY', 'EUR/USD', 'GBP/USD'],
      GDP: ['EUR/USD', 'GBP/USD', 'USD/CAD'],
      INTEREST_RATE: ['USD/JPY', 'EUR/USD', 'GBP/USD'],
      INFLATION: ['USD/JPY', 'EUR/USD', 'GBP/USD'],
    };
    return eventCurrencyMap[eventType] || ['EUR/USD'];
  }
}