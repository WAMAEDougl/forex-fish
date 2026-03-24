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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationLog = exports.MarketSentiment = exports.CurrencySentiment = exports.SimulationResult = exports.SimulationRun = exports.EconomicEvent = exports.AgentProfile = void 0;
const graphql_1 = require("@nestjs/graphql");
let AgentProfile = class AgentProfile {
};
exports.AgentProfile = AgentProfile;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], AgentProfile.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AgentProfile.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AgentProfile.prototype, "persona", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], AgentProfile.prototype, "risk_appetite", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AgentProfile.prototype, "strategy_type", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], AgentProfile.prototype, "capital", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], AgentProfile.prototype, "created_at", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], AgentProfile.prototype, "updated_at", void 0);
exports.AgentProfile = AgentProfile = __decorate([
    (0, graphql_1.ObjectType)()
], AgentProfile);
let EconomicEvent = class EconomicEvent {
};
exports.EconomicEvent = EconomicEvent;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], EconomicEvent.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], EconomicEvent.prototype, "title", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], EconomicEvent.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], EconomicEvent.prototype, "impact_score", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], EconomicEvent.prototype, "currency_pair", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], EconomicEvent.prototype, "event_type", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], EconomicEvent.prototype, "timestamp", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], EconomicEvent.prototype, "source", void 0);
exports.EconomicEvent = EconomicEvent = __decorate([
    (0, graphql_1.ObjectType)()
], EconomicEvent);
let SimulationRun = class SimulationRun {
};
exports.SimulationRun = SimulationRun;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], SimulationRun.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], SimulationRun.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationRun.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], SimulationRun.prototype, "started_at", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], SimulationRun.prototype, "completed_at", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], SimulationRun.prototype, "created_at", void 0);
exports.SimulationRun = SimulationRun = __decorate([
    (0, graphql_1.ObjectType)()
], SimulationRun);
let SimulationResult = class SimulationResult {
};
exports.SimulationResult = SimulationResult;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], SimulationResult.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(() => AgentProfile),
    __metadata("design:type", AgentProfile)
], SimulationResult.prototype, "agent", void 0);
__decorate([
    (0, graphql_1.Field)(() => EconomicEvent),
    __metadata("design:type", EconomicEvent)
], SimulationResult.prototype, "event", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationResult.prototype, "emergent_sentiment", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], SimulationResult.prototype, "price_bias", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], SimulationResult.prototype, "trade_action", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], SimulationResult.prototype, "confidence", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], SimulationResult.prototype, "reasoning", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], SimulationResult.prototype, "created_at", void 0);
exports.SimulationResult = SimulationResult = __decorate([
    (0, graphql_1.ObjectType)()
], SimulationResult);
let CurrencySentiment = class CurrencySentiment {
};
exports.CurrencySentiment = CurrencySentiment;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CurrencySentiment.prototype, "currency_pair", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], CurrencySentiment.prototype, "bias", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], CurrencySentiment.prototype, "volume_estimate", void 0);
exports.CurrencySentiment = CurrencySentiment = __decorate([
    (0, graphql_1.ObjectType)()
], CurrencySentiment);
let MarketSentiment = class MarketSentiment {
};
exports.MarketSentiment = MarketSentiment;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], MarketSentiment.prototype, "overall_bias", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], MarketSentiment.prototype, "sentiment_score", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], MarketSentiment.prototype, "agent_count", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], MarketSentiment.prototype, "dominant_persona", void 0);
__decorate([
    (0, graphql_1.Field)(() => [CurrencySentiment]),
    __metadata("design:type", Array)
], MarketSentiment.prototype, "currency_pairs", void 0);
exports.MarketSentiment = MarketSentiment = __decorate([
    (0, graphql_1.ObjectType)()
], MarketSentiment);
let SimulationLog = class SimulationLog {
};
exports.SimulationLog = SimulationLog;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationLog.prototype, "simulation_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationLog.prototype, "agent_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationLog.prototype, "agent_name", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationLog.prototype, "action", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationLog.prototype, "reasoning", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], SimulationLog.prototype, "timestamp", void 0);
exports.SimulationLog = SimulationLog = __decorate([
    (0, graphql_1.ObjectType)()
], SimulationLog);
//# sourceMappingURL=graphql.types.js.map