import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
export declare class MetaTraderService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private subSocket;
    private reqSocket;
    private readonly SUB_PORT;
    private readonly REP_PORT;
    private readonly RECONNECT_DELAY;
    private readonly MAX_RECONNECT_ATTEMPTS;
    private reconnectAttempts;
    private isConnecting;
    private lastTick;
    private tickCallbacks;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    connect(): Promise<void>;
    private initSubscriber;
    private initRequester;
    private scheduleReconnect;
    disconnect(): Promise<void>;
    sendCommand(command: TradeCommand): Promise<TradeResponse>;
    executeTrade(symbol: string, action: 'BUY' | 'SELL', volume: number, price?: number): Promise<TradeResponse>;
    closePosition(ticket: number): Promise<TradeResponse>;
    getHistory(symbol: string, count?: number): Promise<TradeResponse>;
    getOpenPositions(): Promise<TradeResponse>;
    onTick(callback: (tick: TickData) => void): () => void;
    getLastTick(): TickData | null;
    isConnected(): boolean;
}
