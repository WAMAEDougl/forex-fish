"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyType = exports.SimulationStatus = exports.SentimentType = exports.TradeAction = exports.PersonaType = void 0;
var PersonaType;
(function (PersonaType) {
    PersonaType["WHALE"] = "WHALE";
    PersonaType["PANIC_SELLER"] = "PANIC_SELLER";
    PersonaType["SCALPER"] = "SCALPER";
    PersonaType["MOMENTUM_TRADER"] = "MOMENTUM_TRADER";
    PersonaType["CONTRARIAN"] = "CONTRARIAN";
    PersonaType["NEWS_TRADER"] = "NEWS_TRADER";
    PersonaType["ALGORITHMIC"] = "ALGORITHMIC";
})(PersonaType || (exports.PersonaType = PersonaType = {}));
var TradeAction;
(function (TradeAction) {
    TradeAction["BUY"] = "BUY";
    TradeAction["SELL"] = "SELL";
    TradeAction["HOLD"] = "HOLD";
})(TradeAction || (exports.TradeAction = TradeAction = {}));
var SentimentType;
(function (SentimentType) {
    SentimentType["BULLISH"] = "BULLISH";
    SentimentType["BEARISH"] = "BEARISH";
    SentimentType["NEUTRAL"] = "NEUTRAL";
    SentimentType["VOLATILE"] = "VOLATILE";
})(SentimentType || (exports.SentimentType = SentimentType = {}));
var SimulationStatus;
(function (SimulationStatus) {
    SimulationStatus["PENDING"] = "PENDING";
    SimulationStatus["RUNNING"] = "RUNNING";
    SimulationStatus["COMPLETED"] = "COMPLETED";
    SimulationStatus["FAILED"] = "FAILED";
})(SimulationStatus || (exports.SimulationStatus = SimulationStatus = {}));
var StrategyType;
(function (StrategyType) {
    StrategyType["LONG_TERM"] = "LONG_TERM";
    StrategyType["SHORT_TERM"] = "SHORT_TERM";
    StrategyType["SCALPING"] = "SCALPING";
    StrategyType["SWING"] = "SWING";
    StrategyType["NEWS_BASED"] = "NEWS_BASED";
})(StrategyType || (exports.StrategyType = StrategyType = {}));
//# sourceMappingURL=enums.js.map