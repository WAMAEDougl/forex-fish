import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface OASISMarketData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  time: number;
  news?: string[];
  indicators?: Record<string, number>;
}

export interface OASISDebateResult {
  market_bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence_score: number;
  reasoning: {
    summary: string;
    agents: Record<string, string>;
  };
  rounds: Array<{
    round: number;
    opinions: Record<string, { bias: string; confidence: number; reasoning: string }>;
  }>;
}

@Injectable()
export class OASISService {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private enabled: boolean = false;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OASIS_API_URL') || 'http://localhost:8000';
    this.enabled = this.configService.get<string>('OASIS_ENABLED') === 'true';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async analyzeMarket(marketData: OASISMarketData): Promise<OASISDebateResult> {
    if (!this.enabled) {
      return {
        market_bias: 'NEUTRAL',
        confidence_score: 0.5,
        reasoning: { summary: 'OASIS disabled', agents: {} },
        rounds: [],
      };
    }

    try {
      const response = await this.client.post<OASISDebateResult>('/analyze', marketData);
      return response.data;
    } catch (error) {
      throw new Error(`OASIS API error: ${error}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}