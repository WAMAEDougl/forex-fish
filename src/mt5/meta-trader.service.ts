import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as net from 'net';

export interface TickData {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
}

export interface TradeCommand {
  action: 'BUY' | 'SELL' | 'HISTORY' | 'POSITIONS' | 'CLOSE';
  symbol?: string;
  volume?: number;
  price?: number;
  ticket?: number;
  magic?: number;
}

export interface TradeResponse {
  success: boolean;
  orderId?: number;
  error?: string;
  data?: unknown;
}

@Injectable()
export class MetaTraderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetaTraderService.name);

  private client: net.Socket | null = null;
  private readonly HOST = '127.0.0.1';
  private readonly PORT = 5556;
  private RECONNECT_DELAY = 5000;
  private MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectAttempts = 0;
  private lastTick: TickData | null = null;
  private tickCallbacks: ((tick: TickData) => void)[] = [];
  private connected = false;
  private pollInterval: NodeJS.Timeout | null = null;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.client = new net.Socket();
        
        this.client.connect(this.PORT, this.HOST, () => {
          this.logger.log('Connected to MT5 terminal via TCP');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startPolling();
          resolve();
        });

        this.client.on('data', (data) => {
          this.handleTickData(data.toString());
        });

        this.client.on('close', () => {
          this.logger.warn('Connection closed');
          this.connected = false;
          this.scheduleReconnect();
        });

        this.client.on('error', (error) => {
          this.logger.error(`Connection error: ${error.message}`);
          this.connected = false;
        });

        this.client.on('timeout', () => {
          this.logger.warn('Connection timeout');
        });
      } catch (error) {
        this.logger.error(`Failed to connect: ${error}`);
        this.scheduleReconnect();
        resolve();
      }
    });
  }

  private startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    this.pollInterval = setInterval(() => {
      if (this.connected && this.client) {
        this.requestTick();
      }
    }, 1000);
  }

  private requestTick() {
    if (this.client && this.connected) {
      this.client.write('\n');
    }
  }

  private handleTickData(data: string) {
    const lines = data.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const tick: TickData = JSON.parse(line);
        this.lastTick = tick;
        this.tickCallbacks.forEach(cb => cb(tick));
      } catch (error) {
        // Not tick data, might be response
      }
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.warn('MT5 not available — running without live market data. Start the MT5 EA bridge to enable trading.');
      return;
    }

    this.reconnectAttempts++;
    this.logger.log(`Reconnecting in ${this.RECONNECT_DELAY}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(async () => {
      await this.connect();
    }, this.RECONNECT_DELAY);
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.client) {
      this.client.destroy();
      this.client = null;
    }

    this.connected = false;
    this.logger.log('Disconnected from MT5 terminal');
  }

  async sendCommand(command: TradeCommand): Promise<TradeResponse> {
    if (!this.client || !this.connected) {
      return { success: false, error: 'Not connected to MT5' };
    }

    return new Promise((resolve) => {
      const cmdStr = JSON.stringify(command) + '\n';
      
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Request timeout' });
      }, 5000);

      const handleResponse = (data: string) => {
        clearTimeout(timeout);
        this.client?.removeListener('data', handleResponse);
        try {
          const response = JSON.parse(data.trim());
          resolve(response as TradeResponse);
        } catch (error) {
          resolve({ success: false, error: 'Invalid response' });
        }
      };

      this.client.on('data', handleResponse);
      this.client.write(cmdStr);
    });
  }

  async executeTrade(symbol: string, action: 'BUY' | 'SELL', volume: number, price?: number): Promise<TradeResponse> {
    return this.sendCommand({
      action,
      symbol,
      volume,
      price,
      magic: 123456,
    });
  }

  async closePosition(ticket: number): Promise<TradeResponse> {
    return this.sendCommand({
      action: 'CLOSE',
      ticket,
    });
  }

  async getHistory(symbol: string, count: number = 100): Promise<TradeResponse> {
    return this.sendCommand({
      action: 'HISTORY',
      symbol,
      volume: count,
    });
  }

  async getOpenPositions(): Promise<TradeResponse> {
    return this.sendCommand({
      action: 'POSITIONS',
    });
  }

  onTick(callback: (tick: TickData) => void): () => void {
    this.tickCallbacks.push(callback);
    return () => {
      const index = this.tickCallbacks.indexOf(callback);
      if (index > -1) {
        this.tickCallbacks.splice(index, 1);
      }
    };
  }

  getLastTick(): TickData | null {
    return this.lastTick;
  }

  isConnected(): boolean {
    return this.connected;
  }
}