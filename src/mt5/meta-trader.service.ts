import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Subscriber, Request } from 'zeromq';

type SocketWithEvents = Subscriber & { on(event: string, handler: (...args: unknown[]) => void): void };
type RequestWithEvents = Request & { on(event: string, handler: (...args: unknown[]) => void): void };

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

  private subSocket: SocketWithEvents | null = null;
  private reqSocket: RequestWithEvents | null = null;

  private readonly SUB_PORT = 5555;
  private readonly REP_PORT = 5556;
  private readonly RECONNECT_DELAY = 3000;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  private reconnectAttempts = 0;
  private isConnecting = false;
  private lastTick: TickData | null = null;

  private tickCallbacks: ((tick: TickData) => void)[] = [];

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      await this.initSubscriber();
      await this.initRequester();
      this.reconnectAttempts = 0;
      this.logger.log('Connected to MT5 terminal via ZeroMQ');
    } catch (error) {
      this.logger.error(`Failed to connect to MT5: ${error}`);
      await this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private async initSubscriber(): Promise<void> {
    this.subSocket = new Subscriber() as SocketWithEvents;
    await this.subSocket.connect(`tcp://127.0.0.1:${this.SUB_PORT}`);
    this.subSocket.subscribe('');

    this.subSocket.on('message', (msg) => {
      try {
        const tick: TickData = JSON.parse(msg.toString());
        this.lastTick = tick;
        this.tickCallbacks.forEach(cb => cb(tick));
      } catch (error) {
        this.logger.error(`Failed to parse tick: ${error}`);
      }
    });

    this.subSocket.on('close', () => {
      this.logger.warn('Subscriber socket closed');
      this.scheduleReconnect();
    });

    this.subSocket.on('error', (error) => {
      this.logger.error(`Subscriber socket error: ${error}`);
    });
  }

  private async initRequester(): Promise<void> {
    this.reqSocket = new Request() as RequestWithEvents;
    await this.reqSocket.connect(`tcp://127.0.0.1:${this.REP_PORT}`);

    this.reqSocket.on('close', () => {
      this.logger.warn('Requester socket closed');
      this.scheduleReconnect();
    });

    this.reqSocket.on('error', (error) => {
      this.logger.error(`Requester socket error: ${error}`);
    });
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.logger.log(`Reconnecting in ${this.RECONNECT_DELAY}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(async () => {
      await this.connect();
    }, this.RECONNECT_DELAY);
  }

  async disconnect(): Promise<void> {
    if (this.subSocket) {
      await this.subSocket.close();
      this.subSocket = null;
    }

    if (this.reqSocket) {
      await this.reqSocket.close();
      this.reqSocket = null;
    }

    this.logger.log('Disconnected from MT5 terminal');
  }

  async sendCommand(command: TradeCommand): Promise<TradeResponse> {
    if (!this.reqSocket) {
      return { success: false, error: 'Not connected to MT5' };
    }

    try {
      await this.reqSocket.send(JSON.stringify(command));
      const [response] = await this.reqSocket.receive();
      return JSON.parse(response.toString()) as TradeResponse;
    } catch (error) {
      this.logger.error(`Command failed: ${error}`);
      return { success: false, error: String(error) };
    }
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
    return this.subSocket !== null && this.reqSocket !== null;
  }
}