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
var GroundingEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroundingEngineService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const news_ingestor_service_1 = require("./news-ingestor.service");
const world_state_service_1 = require("./world-state.service");
const shadow_simulation_service_1 = require("./shadow-simulation.service");
const accuracy_monitor_service_1 = require("./accuracy-monitor.service");
const meta_trader_service_1 = require("../mt5/meta-trader.service");
let GroundingEngineService = GroundingEngineService_1 = class GroundingEngineService {
    constructor(newsIngestor, worldState, shadowSimulation, accuracyMonitor, metaTrader) {
        this.newsIngestor = newsIngestor;
        this.worldState = worldState;
        this.shadowSimulation = shadowSimulation;
        this.accuracyMonitor = accuracyMonitor;
        this.metaTrader = metaTrader;
        this.logger = new common_1.Logger(GroundingEngineService_1.name);
        this.lastWorldState = null;
        this.lastTickData = [];
        this.groundingInterval = null;
    }
    async onModuleInit() {
        this.metaTrader.onTick((tick) => {
            this.lastTickData.push(tick);
            if (this.lastTickData.length > 100) {
                this.lastTickData = this.lastTickData.slice(-100);
            }
        });
        this.logger.log('Grounding Engine initialized');
        await this.runGroundingCycle();
        this.startGroundingLoop();
    }
    async scheduledGrounding() {
        await this.runGroundingCycle();
    }
    startGroundingLoop() {
        this.groundingInterval = setInterval(() => {
            this.runGroundingCycle().catch(error => {
                this.logger.error(`Grounding cycle failed: ${error}`);
            });
        }, 5 * 60 * 1000);
    }
    async runGroundingCycle() {
        const timestamp = new Date();
        this.logger.log('Starting grounding cycle...');
        let newsMaterial;
        try {
            newsMaterial = await this.newsIngestor.ingestNews();
            this.logger.log(`Ingested ${newsMaterial.newsItems.length} news items`);
        }
        catch (error) {
            this.logger.error(`News ingestion failed: ${error}`);
            newsMaterial = { newsItems: [], timestamp: new Date(), source: 'fallback' };
        }
        const combinedTicks = this.getRelevantTicks(newsMaterial);
        let worldState;
        try {
            worldState = await this.worldState.buildWorldState(newsMaterial, combinedTicks);
            this.lastWorldState = worldState;
            this.logger.log(`Built world state v${worldState.version}`);
        }
        catch (error) {
            this.logger.error(`World state build failed: ${error}`);
            worldState = this.lastWorldState;
        }
        let simulationResult;
        try {
            simulationResult = await this.shadowSimulation.runShadowSimulation('EURUSD', worldState);
            this.logger.log(`Simulation complete: ${simulationResult.finalVerdict} (agreement: ${(simulationResult.swarmAgreement * 100).toFixed(1)}%)`);
        }
        catch (error) {
            this.logger.error(`Shadow simulation failed: ${error}`);
        }
        let accuracyMetrics;
        try {
            accuracyMetrics = await this.accuracyMonitor.getAccuracyMetrics(24);
        }
        catch (error) {
            this.logger.error(`Accuracy metrics failed: ${error}`);
        }
        return {
            timestamp,
            newsIngested: newsMaterial.newsItems.length,
            worldStateVersion: worldState?.version || 0,
            simulationResult,
            accuracyMetrics,
        };
    }
    getRelevantTicks(newsMaterial) {
        const relevantPairs = new Set();
        for (const item of newsMaterial.newsItems) {
            if (item.currencies) {
                for (const currency of item.currencies) {
                    if (currency.length === 6) {
                        relevantPairs.add(currency);
                    }
                }
            }
        }
        return this.lastTickData.filter(tick => relevantPairs.has(tick.symbol));
    }
    async getWorldState() {
        return this.lastWorldState || await this.worldState.getLatestWorldState();
    }
    async getContextForQuery(query) {
        const result = await this.worldState.getContextForQuery(query);
        return {
            entities: result.entities.map(e => ({ type: e.type, label: e.label })),
            relationships: result.relationships.map(r => ({
                source: r.sourceLabel,
                target: r.targetLabel,
                type: r.relationship,
            })),
            context: result.context,
        };
    }
    async runManualSimulation(symbol) {
        const worldState = await this.getWorldState();
        return this.shadowSimulation.runShadowSimulation(symbol, worldState || undefined);
    }
    async getAccuracyMetrics(hoursBack = 24) {
        return this.accuracyMonitor.getAccuracyMetrics(hoursBack);
    }
    async getSentimentVsRealityReport() {
        return this.accuracyMonitor.generateSentimentVsRealityReport();
    }
    async getLatestTicks() {
        return this.lastTickData.slice(-20);
    }
};
exports.GroundingEngineService = GroundingEngineService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GroundingEngineService.prototype, "scheduledGrounding", null);
exports.GroundingEngineService = GroundingEngineService = GroundingEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [news_ingestor_service_1.NewsIngestorService,
        world_state_service_1.WorldStateService,
        shadow_simulation_service_1.ShadowSimulationService,
        accuracy_monitor_service_1.AccuracyMonitorService,
        meta_trader_service_1.MetaTraderService])
], GroundingEngineService);
//# sourceMappingURL=grounding-engine.service.js.map