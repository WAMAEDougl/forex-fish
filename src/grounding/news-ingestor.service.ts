import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class NewsIngestorService {
  private readonly logger = new Logger(NewsIngestorService.name);
  private readonly ALPHA_VANTAGE_API_KEY: string;
  private readonly NEWS_API_KEY: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.ALPHA_VANTAGE_API_KEY = this.config.get('ALPHA_VANTAGE_API_KEY') || '';
    this.NEWS_API_KEY = this.config.get('NEWS_API_KEY') || '';
  }

  async fetchEconomicNews(): Promise<SeedMaterial> {
    const newsItems: NewsItem[] = [];

    try {
      const forexNews = await this.fetchAlphaVantageNews();
      newsItems.push(...forexNews);
    } catch (error) {
      this.logger.error(`Alpha Vantage fetch failed: ${error}`);
    }

    try {
      const rssNews = await this.fetchRSSNews();
      newsItems.push(...rssNews);
    } catch (error) {
      this.logger.error(`RSS fetch failed: ${error}`);
    }

    const enrichedNews = this.enrichWithSentiment(newsItems);
    
    return {
      newsItems: enrichedNews,
      timestamp: new Date(),
      source: 'multi',
    };
  }

  private async fetchAlphaVantageNews(): Promise<NewsItem[]> {
    if (!this.ALPHA_VANTAGE_API_KEY) {
      this.logger.warn('Alpha Vantage API key not configured');
      return [];
    }

    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
    const newsItems: NewsItem[] = [];

    for (const symbol of symbols.slice(0, 2)) {
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${this.ALPHA_VANTAGE_API_KEY}`
        );
        
        if (!response.ok) continue;
        
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
      } catch (error) {
        this.logger.error(`Error fetching Alpha Vantage news for ${symbol}: ${error}`);
      }
    }

    return newsItems;
  }

  private async fetchRSSNews(): Promise<NewsItem[]> {
    const rssFeeds = [
      'https://www.investing.com/rss/news.rss',
      'https://www.forexfactory.com/news.php?format=RSS',
    ];

    const newsItems: NewsItem[] = [];

    for (const feedUrl of rssFeeds) {
      try {
        const response = await fetch(feedUrl);
        if (!response.ok) continue;

        const xml = await response.text();
        const parsed = this.parseRSS(xml);
        newsItems.push(...parsed);
      } catch (error) {
        this.logger.error(`Error fetching RSS from ${feedUrl}: ${error}`);
      }
    }

    return newsItems;
  }

  private parseRSS(xml: string): NewsItem[] {
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      
      const getTag = (tag: string): string => {
        const tagRegex = new RegExp(`<${tag}[^>]*><!\[CDATA\[(.*?)\]\]></${tag}>|<${tag}[^>]*>(.*?)</${tag}>`, 'i');
        const tagMatch = itemXml.match(tagRegex);
        return tagMatch ? (tagMatch[1] || tagMatch[2] || '').trim() : '';
      };

      const title = getTag('title');
      if (!title) continue;

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

  private extractCurrencies(text: string): string[] {
    const currencyPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
      'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJY', 'AUDNZD', 'EURAUD',
    ];

    const found: string[] = [];
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

  private assessImpact(title: string): 'high' | 'medium' | 'low' {
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
      if (lowerTitle.includes(keyword)) return 'high';
    }

    for (const keyword of mediumImpactKeywords) {
      if (lowerTitle.includes(keyword)) return 'medium';
    }

    return 'low';
  }

  private mapRelevanceScore(score?: number): 'high' | 'medium' | 'low' {
    if (!score) return 'medium';
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private enrichWithSentiment(newsItems: NewsItem[]): NewsItem[] {
    const positiveKeywords = ['gain', 'rise', 'surge', 'bullish', 'growth', 'optimistic', 'rally', 'strengthen'];
    const negativeKeywords = ['fall', 'drop', 'bearish', 'decline', 'recession', 'crash', 'weaken', 'loss'];

    return newsItems.map(item => {
      const lowerTitle = (item.title + ' ' + (item.description || '')).toLowerCase();
      
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      
      let positiveCount = 0;
      let negativeCount = 0;

      for (const keyword of positiveKeywords) {
        if (lowerTitle.includes(keyword)) positiveCount++;
      }

      for (const keyword of negativeKeywords) {
        if (lowerTitle.includes(keyword)) negativeCount++;
      }

      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';

      return { ...item, sentiment };
    });
  }

  async ingestNews(): Promise<SeedMaterial> {
    const seedMaterial = await this.fetchEconomicNews();
    
    this.logger.log(
      `Ingested ${seedMaterial.newsItems.length} news items`
    );

    return seedMaterial;
  }

  formatForGraphRAG(seedMaterial: SeedMaterial): string {
    const lines: string[] = [];
    
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
}