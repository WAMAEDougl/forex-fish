import { OnModuleInit } from '@nestjs/common';
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
export declare class GraphRAGService implements OnModuleInit {
    private prisma;
    private driver;
    private isConnected;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    linkEventToCurrencies(eventData: {
        event_type: string;
        currency_pair: string;
        impact_score: number;
    }): Promise<void>;
    linkIndicatorToCurrency(indicator: string, currencyPair: string, correlation: number): Promise<void>;
    queryRelevantFactors(currencyPair: string, eventType: string): Promise<GraphQueryResult>;
    getCurrenciesForEvent(eventType: string): Promise<string[]>;
    getIndicatorsForCurrency(currencyPair: string): Promise<IndicatorLink[]>;
    getFullGraph(): Promise<GraphQueryResult>;
    private initializeBaseGraph;
    private fallbackLinkEvent;
    private fallbackLinkIndicator;
    private fallbackQuery;
    private fallbackGetCurrencies;
}
