"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MetaTraderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaTraderService = void 0;
const common_1 = require("@nestjs/common");
const zeromq_1 = require("zeromq");
let MetaTraderService = MetaTraderService_1 = class MetaTraderService {
    constructor() {
        this.logger = new common_1.Logger(MetaTraderService_1.name);
        this.subSocket = null;
        this.reqSocket = null;
        this.SUB_PORT = 5555;
        this.REP_PORT = 5556;
        this.RECONNECT_DELAY = 3000;
        this.MAX_RECONNECT_ATTEMPTS = 10;
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.lastTick = null;
        this.tickCallbacks = [];
    }
    async onModuleInit() {
        await this.connect();
    }
    async onModuleDestroy() {
        await this.disconnect();
    }
    async connect() {
        if (this.isConnecting) {
            return;
        }
        this.isConnecting = true;
        try {
            await this.initSubscriber();
            await this.initRequester();
            this.reconnectAttempts = 0;
            this.logger.log('Connected to MT5 terminal via ZeroMQ');
        }
        catch (error) {
            this.logger.error(`Failed to connect to MT5: ${error}`);
            await this.scheduleReconnect();
        }
        finally {
            this.isConnecting = false;
        }
    }
    async initSubscriber() {
        this.subSocket = new zeromq_1.Subscriber();
        await this.subSocket.connect(`tcp://127.0.0.1:${this.SUB_PORT}`);
        this.subSocket.subscribe('');
        this.subSocket.on('message', (msg) => {
            try {
                const tick = JSON.parse(msg.toString());
                this.lastTick = tick;
                this.tickCallbacks.forEach(cb => cb(tick));
            }
            catch (error) {
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
    async initRequester() {
        this.reqSocket = new zeromq_1.Request();
        await this.reqSocket.connect(`tcp://127.0.0.1:${this.REP_PORT}`);
        this.reqSocket.on('close', () => {
            this.logger.warn('Requester socket closed');
            this.scheduleReconnect();
        });
        this.reqSocket.on('error', (error) => {
            this.logger.error(`Requester socket error: ${error}`);
        });
    }
    async scheduleReconnect() {
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
    async disconnect() {
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
    async sendCommand(command) {
        if (!this.reqSocket) {
            return { success: false, error: 'Not connected to MT5' };
        }
        try {
            await this.reqSocket.send(JSON.stringify(command));
            const [response] = await this.reqSocket.receive();
            return JSON.parse(response.toString());
        }
        catch (error) {
            this.logger.error(`Command failed: ${error}`);
            return { success: false, error: String(error) };
        }
    }
    async executeTrade(symbol, action, volume, price) {
        return this.sendCommand({
            action,
            symbol,
            volume,
            price,
            magic: 123456,
        });
    }
    async closePosition(ticket) {
        return this.sendCommand({
            action: 'CLOSE',
            ticket,
        });
    }
    async getHistory(symbol, count = 100) {
        return this.sendCommand({
            action: 'HISTORY',
            symbol,
            volume: count,
        });
    }
    async getOpenPositions() {
        return this.sendCommand({
            action: 'POSITIONS',
        });
    }
    onTick(callback) {
        this.tickCallbacks.push(callback);
        return () => {
            const index = this.tickCallbacks.indexOf(callback);
            if (index > -1) {
                this.tickCallbacks.splice(index, 1);
            }
        };
    }
    getLastTick() {
        return this.lastTick;
    }
    isConnected() {
        return this.subSocket !== null && this.reqSocket !== null;
    }
};
exports.MetaTraderService = MetaTraderService;
exports.MetaTraderService = MetaTraderService = MetaTraderService_1 = __decorate([
    (0, common_1.Injectable)()
], MetaTraderService);
//# sourceMappingURL=meta-trader.service.js.map