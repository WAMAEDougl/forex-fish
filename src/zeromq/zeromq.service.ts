import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pull, Request } from 'zeromq';

export interface PriceTick {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  time: number;
}

export interface TradeCommand {
  action: 'BUY' | 'SELL' | 'CLOSE' | 'HISTORY' | 'POSITIONS' | 'BALANCE';
  symbol?: string;
  volume?: number;
  price?: number;
  ticket?: number;
  magic?: number;
}

export interface TradeResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

@Injectable()
export class ZeromqService implements OnModuleDestroy {
  private readonly logger = new Logger(ZeromqService.name);
  private subscriber: Pull | null = null;
  private requester: Request | null = null;
  private connected = false;

  private readonly host = '127.0.0.1';
  private readonly subPort = 5555;
  private readonly repPort = 5556;

  private tickHandlers: ((tick: PriceTick) => void)[] = [];

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.subscriber = new Pull();
      this.subscriber.connect(`tcp://${this.host}:${this.subPort}`);

      this.requester = new Request();
      this.requester.connect(`tcp://${this.host}:${this.repPort}`);

      this.connected = true;
      this.logger.log(`Connected to ZeroMQ on ${this.host}:${this.subPort} (SUB) and ${this.repPort} (REP)`);

      this.startListening();
    } catch (error) {
      this.logger.error(`Failed to connect to ZeroMQ: ${error}`);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.subscriber) {
      this.subscriber.close();
      this.subscriber = null;
    }
    if (this.requester) {
      this.requester.close();
      this.requester = null;
    }
    this.logger.log('Disconnected from ZeroMQ');
  }

  private async startListening() {
    if (!this.subscriber) return;
    
    for await (const [msg] of this.subscriber) {
      try {
        const tick: PriceTick = JSON.parse(msg.toString());
        this.tickHandlers.forEach(handler => handler(tick));
      } catch (error) {
        this.logger.warn(`Failed to parse tick message: ${error}`);
      }
    }
  }

  onTick(handler: (tick: PriceTick) => void): void {
    this.tickHandlers.push(handler);
  }

  async requestTrade(command: TradeCommand): Promise<TradeResult> {
    if (!this.connected || !this.requester) {
      await this.connect();
    }

    const message = JSON.stringify(command);
    await this.requester.send(message);

    const [response] = await this.requester.receive();
    const result = JSON.parse(response.toString());
    return result;
  }

  async buy(symbol: string, volume: number, price = 0, magic = 123456): Promise<TradeResult> {
    return this.requestTrade({ action: 'BUY', symbol, volume, price, magic });
  }

  async sell(symbol: string, volume: number, price = 0, magic = 123456): Promise<TradeResult> {
    return this.requestTrade({ action: 'SELL', symbol, volume, price, magic });
  }

  async closePosition(ticket: number): Promise<TradeResult> {
    return this.requestTrade({ action: 'CLOSE', ticket });
  }

  async getHistory(symbol: string, count = 100): Promise<TradeResult> {
    return this.requestTrade({ action: 'HISTORY', symbol, volume: count });
  }

  async getOpenPositions(): Promise<TradeResult> {
    return this.requestTrade({ action: 'POSITIONS', volume: 0 });
  }

  async getAccountInfo(): Promise<TradeResult> {
    return this.requestTrade({ action: 'BALANCE' });
  }

  isConnected(): boolean {
    return this.connected;
  }
}