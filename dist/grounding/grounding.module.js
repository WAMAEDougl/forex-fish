"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroundingModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const news_ingestor_service_1 = require("./news-ingestor.service");
const world_state_service_1 = require("./world-state.service");
const shadow_simulation_service_1 = require("./shadow-simulation.service");
const accuracy_monitor_service_1 = require("./accuracy-monitor.service");
const grounding_engine_service_1 = require("./grounding-engine.service");
const mt5_module_1 = require("../mt5/mt5.module");
let GroundingModule = class GroundingModule {
};
exports.GroundingModule = GroundingModule;
exports.GroundingModule = GroundingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            mt5_module_1.Mt5Module,
        ],
        providers: [
            news_ingestor_service_1.NewsIngestorService,
            world_state_service_1.WorldStateService,
            shadow_simulation_service_1.ShadowSimulationService,
            accuracy_monitor_service_1.AccuracyMonitorService,
            grounding_engine_service_1.GroundingEngineService,
        ],
        exports: [
            grounding_engine_service_1.GroundingEngineService,
            accuracy_monitor_service_1.AccuracyMonitorService,
            world_state_service_1.WorldStateService,
        ],
    })
], GroundingModule);
//# sourceMappingURL=grounding.module.js.map