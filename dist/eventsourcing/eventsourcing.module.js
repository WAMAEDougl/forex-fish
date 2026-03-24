"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSourcingModule = void 0;
const common_1 = require("@nestjs/common");
const event_sourcing_service_1 = require("./event-sourcing.service");
const god_mode_controller_1 = require("./god-mode.controller");
const graphrag_module_1 = require("../graphrag/graphrag.module");
const common_module_1 = require("../common/common.module");
const agents_module_1 = require("../agents/agents.module");
let EventSourcingModule = class EventSourcingModule {
};
exports.EventSourcingModule = EventSourcingModule;
exports.EventSourcingModule = EventSourcingModule = __decorate([
    (0, common_1.Module)({
        imports: [common_module_1.CommonModule, graphrag_module_1.GraphRAGModule, agents_module_1.AgentsModule],
        providers: [event_sourcing_service_1.EventSourcingService, god_mode_controller_1.GodModeController],
        exports: [event_sourcing_service_1.EventSourcingService, god_mode_controller_1.GodModeController],
    })
], EventSourcingModule);
//# sourceMappingURL=eventsourcing.module.js.map