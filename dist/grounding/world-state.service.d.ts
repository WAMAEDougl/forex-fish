import { PrismaService } from '../common/prisma.service';
import { NewsItem, SeedMaterial } from './news-ingestor.service';
import { TickData } from '../mt5/meta-trader.service';
export interface Entity {
    type: string;
    label: string;
    properties: Record<string, unknown>;
}
export interface Relationship {
    sourceType: string;
    sourceLabel: string;
    targetType: string;
    targetLabel: string;
    relationship: string;
    weight: number;
}
export interface WorldStateSnapshot {
    version: number;
    entities: Entity[];
    relationships: Relationship[];
    priceTicks: TickData[];
    newsItems: NewsItem[];
    timestamp: Date;
}
export declare class WorldStateService {
    private prisma;
    private readonly logger;
    private readonly ENTITY_EXTRACTION_PATTERNS;
    constructor(prisma: PrismaService);
    buildWorldState(newsMaterial: SeedMaterial, tickData: TickData[]): Promise<WorldStateSnapshot>;
    private extractEntities;
    private extractRelationships;
    private countCoMentions;
    private persistWorldState;
    private storeContextFragments;
    getContextForQuery(query: string): Promise<{
        entities: Entity[];
        relationships: Relationship[];
        context: string;
    }>;
    getLatestWorldState(): Promise<WorldStateSnapshot | null>;
}
