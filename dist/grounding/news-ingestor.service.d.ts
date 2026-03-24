import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
export interface NewsItem {
    id: string;
    title: string;
    description: string;
    publishedAt: Date;
    source: string;
    url: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    currencies?: string[];
    impact?: 'high' | 'medium' | 'low';
}
export interface SeedMaterial {
    newsItems: NewsItem[];
    timestamp: Date;
    source: string;
}
export declare class NewsIngestorService {
    private prisma;
    private config;
    private readonly logger;
    private readonly ALPHA_VANTAGE_API_KEY;
    private readonly NEWS_API_KEY;
    constructor(prisma: PrismaService, config: ConfigService);
    fetchEconomicNews(): Promise<SeedMaterial>;
    private fetchAlphaVantageNews;
    private fetchRSSNews;
    private parseRSS;
    private extractCurrencies;
    private assessImpact;
    private mapRelevanceScore;
    private enrichWithSentiment;
    ingestNews(): Promise<SeedMaterial>;
    formatForGraphRAG(seedMaterial: SeedMaterial): string;
}
