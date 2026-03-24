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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SimulationGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let SimulationGateway = SimulationGateway_1 = class SimulationGateway {
    constructor() {
        this.logger = new common_1.Logger(SimulationGateway_1.name);
        this.activeSimulations = new Map();
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleJoinSimulation(data, client) {
        const { simulationId } = data;
        client.join(simulationId);
        if (!this.activeSimulations.has(simulationId)) {
            this.activeSimulations.set(simulationId, new Set());
        }
        this.activeSimulations.get(simulationId)?.add(client.id);
        this.logger.log(`Client ${client.id} joined simulation ${simulationId}`);
        return { event: 'joined', simulationId };
    }
    handleLeaveSimulation(data, client) {
        const { simulationId } = data;
        client.leave(simulationId);
        this.activeSimulations.get(simulationId)?.delete(client.id);
        this.logger.log(`Client ${client.id} left simulation ${simulationId}`);
        return { event: 'left', simulationId };
    }
    emitSimulationLog(log) {
        this.server.to(log.simulation_id).emit('simulationLog', log);
    }
    emitMarketBiasUpdate(bias) {
        this.server.emit('marketBiasUpdate', bias);
    }
    emitAgentAction(simulationId, agentId, action, reasoning) {
        const log = {
            simulation_id: simulationId,
            agent_id: agentId,
            agent_name: 'Agent',
            action,
            reasoning,
            timestamp: new Date().toISOString(),
        };
        this.emitSimulationLog(log);
    }
    emitSwarmProgress(simulationId, completed, total) {
        this.server.to(simulationId).emit('swarmProgress', {
            simulation_id: simulationId,
            completed,
            total,
            percentage: (completed / total) * 100,
        });
    }
    emitSimulationComplete(simulationId, finalBias) {
        this.server.to(simulationId).emit('simulationComplete', {
            simulation_id: simulationId,
            final_bias: finalBias,
            timestamp: new Date().toISOString(),
        });
    }
    getActiveSimulationCount() {
        return this.activeSimulations.size;
    }
    getSimulationParticipants(simulationId) {
        return this.activeSimulations.get(simulationId)?.size || 0;
    }
};
exports.SimulationGateway = SimulationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SimulationGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinSimulation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], SimulationGateway.prototype, "handleJoinSimulation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leaveSimulation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], SimulationGateway.prototype, "handleLeaveSimulation", null);
exports.SimulationGateway = SimulationGateway = SimulationGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    })
], SimulationGateway);
//# sourceMappingURL=simulation.gateway.js.map