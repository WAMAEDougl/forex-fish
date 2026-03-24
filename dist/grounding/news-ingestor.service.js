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
var NewsIngestorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsIngestorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../common/prisma.service");
let NewsIngestorService = NewsIngestorService_1 = class NewsIngestorService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(NewsIngestorService_1.name);
        this.ALPHA_VANTAGE_API_KEY = this.config.get('ALPHA_VANTAGE_API_KEY') || '';
        this.NEWS_API_KEY = this.config.get('NEWS_API_KEY') || '';
    }
    async fetchEconomicNews() {
        const newsItems = [];
        try {
            const forexNews = await this.fetchAlphaVantageNews();
            newsItems.push(...forexNews);
        }
        catch (error) {
            this.logger.error(`Alpha Vantage fetch failed: ${error}`);
        }
        try {
            const rssNews = await this.fetchRSSNews();
            newsItems.push(...rssNews);
        }
        catch (error) {
            this.logger.error(`RSS fetch failed: ${error}`);
        }
        const enrichedNews = this.enrichWithSentiment(newsItems);
        return {
            newsItems: enrichedNews,
            timestamp: new Date(),
            source: 'multi',
        };
    }
    async fetchAlphaVantageNews() {
        if (!this.ALPHA_VANTAGE_API_KEY) {
            this.logger.warn('Alpha Vantage API key not configured');
            return [];
        }
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
        const newsItems = [];
        for (const symbol of symbols.slice(0, 2)) {
            try {
                const response = await fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${this.ALPHA_VANTAGE_API_KEY}`);
                if (!response.ok)
                    continue;
                const data = await response.json();
                if (data.feed && Array.isArray(data.feed)) {
                    for (const article of data.feed.slice(0, 10)) {
                        newsItems.push({
                            id: article.banner_image || `av-${Date.now()}-${Math.random()}`,
                            title: article.title,
                            description: article.summary,
                            publishedAt: new Date(article.time_published * 1000),
                            source: article.source,
                            url: article.url,
                            currencies: article.tickers,
                            impact: this.mapRelevanceScore(article.relevance_score),
                        });
                    }
                }
            }
            catch (error) {
                this.logger.error(`Error fetching Alpha Vantage news for ${symbol}: ${error}`);
            }
        }
        return newsItems;
    }
    async fetchRSSNews() {
        const rssFeeds = [
            'https://www.investing.com/rss/news.rss',
            'https://www.forexfactory.com/news.php?format=RSS',
        ];
        const newsItems = [];
        for (const feedUrl of rssFeeds) {
            try {
                const response = await fetch(feedUrl);
                if (!response.ok)
                    continue;
                const xml = await response.text();
                const parsed = this.parseRSS(xml);
                newsItems.push(...parsed);
            }
            catch (error) {
                this.logger.error(`Error fetching RSS from ${feedUrl}: ${error}`);
            }
        }
        return newsItems;
    }
    parseRSS(xml) {
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
            const itemXml = match[1];
            const getTag = (tag) => {
                const tagRegex = new RegExp(`<${tag}[^>]*><!\[CDATA\[(.*?)\]\]></${tag}>|<${tag}[^>]*>(.*?)</${tag}>`, 'i');
                const tagMatch = itemXml.match(tagRegex);
                return tagMatch ? (tagMatch[1] || tagMatch[2] || '').trim() : '';
            };
            const title = getTag('title');
            if (!title)
                continue;
            const currencies = this.extractCurrencies(title);
            items.push({
                id: `rss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title,
                description: getTag('description'),
                publishedAt: new Date(getTag('pubDate') || Date.now()),
                source: getTag('source') || 'RSS Feed',
                url: getTag('link'),
                currencies,
                impact: this.assessImpact(title),
            });
        }
        return items;
    }
    extractCurrencies(text) {
        const currencyPairs = [
            'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
            'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJY', 'AUDNZD', 'EURAUD',
        ];
        const found = [];
        const upperText = text.toUpperCase();
        for (const pair of currencyPairs) {
            if (upperText.includes(pair)) {
                found.push(pair);
            }
        }
        const currencyCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
        for (const code of currencyCodes) {
            if (upperText.includes(code) && !found.some(f => f.includes(code))) {
                found.push(code);
            }
        }
        return found.length > 0 ? found : ['USD', 'EUR'];
    }
    assessImpact(title) {
        const highImpactKeywords = [
            'interest rate', 'fed', 'ecb', 'boj', 'boe', 'nfp', 'non-farm',
            'inflation', 'cpi', 'pce', 'gdp', 'recession', 'bankruptcy',
        ];
        const mediumImpactKeywords = [
            'unemployment', 'retail sales', 'trade balance', 'pmi', 'ism',
            'consumer confidence', 'housing starts', ' durable goods',
        ];
        const lowerTitle = title.toLowerCase();
        for (const keyword of highImpactKeywords) {
            if (lowerTitle.includes(keyword))
                return 'high';
        }
        for (const keyword of mediumImpactKeywords) {
            if (lowerTitle.includes(keyword))
                return 'medium';
        }
        return 'low';
    }
    mapRelevanceScore(score) {
        if (!score)
            return 'medium';
        if (score >= 0.7)
            return 'high';
        if (score >= 0.4)
            return 'medium';
        return 'low';
    }
    enrichWithSentiment(newsItems) {
        const positiveKeywords = ['gain', 'rise', 'surge', 'bullish', 'growth', 'optimistic', 'rally', 'strengthen'];
        const negativeKeywords = ['fall', 'drop', 'bearish', 'decline', 'recession', 'crash', 'weaken', 'loss'];
        return newsItems.map(item => {
            const lowerTitle = (item.title + ' ' + (item.description || '')).toLowerCase();
            let sentiment = 'neutral';
            let positiveCount = 0;
            let negativeCount = 0;
            for (const keyword of positiveKeywords) {
                if (lowerTitle.includes(keyword))
                    positiveCount++;
            }
            for (const keyword of negativeKeywords) {
                if (lowerTitle.includes(keyword))
                    negativeCount++;
            }
            if (positiveCount > negativeCount)
                sentiment = 'positive';
            else if (negativeCount > positiveCount)
                sentiment = 'negative';
            return { ...item, sentiment };
        });
    }
    async ingestNews() {
        const seedMaterial = await this.fetchEconomicNews();
        this.logger.log(`Ingested ${seedMaterial.newsItems.length} news items`);
        return seedMaterial;
    }
    formatForGraphRAG(seedMaterial) {
        const lines = [];
        lines.push(`# Economic News Snapshot - ${seedMaterial.timestamp.toISOString()}`);
        lines.push('');
        for (const item of seedMaterial.newsItems) {
            lines.push(`## ${item.title}`);
            lines.push(`- Source: ${item.source}`);
            lines.push(`- Published: ${item.publishedAt.toISOString()}`);
            lines.push(`- Sentiment: ${item.sentiment || 'neutral'}`);
            lines.push(`- Impact: ${item.impact || 'medium'}`);
            lines.push(`- Currencies: ${item.currencies?.join(', ') || 'N/A'}`);
            lines.push(`- Summary: ${item.description?.substring(0, 200)}`);
            lines.push('');
        }
        return lines.join('\n');
    }
};
exports.NewsIngestorService = NewsIngestorService;
exports.NewsIngestorService = NewsIngestorService = NewsIngestorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], NewsIngestorService);
//# sourceMappingURL=news-ingestor.service.js.map