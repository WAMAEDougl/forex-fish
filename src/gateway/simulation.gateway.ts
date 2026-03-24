import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface SimulationLogMessage {
  simulation_id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  reasoning: string;
  timestamp: string;
}

export interface MarketBiasMessage {
  overall_bias: number;
  sentiment_score: number;
  agent_count: number;
  dominant_persona: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SimulationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SimulationGateway.name);
  private activeSimulations: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinSimulation')
  handleJoinSimulation(
    @MessageBody() data: { simulationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { simulationId } = data;
    client.join(simulationId);
    
    if (!this.activeSimulations.has(simulationId)) {
      this.activeSimulations.set(simulationId, new Set());
    }
    this.activeSimulations.get(simulationId)?.add(client.id);
    
    this.logger.log(`Client ${client.id} joined simulation ${simulationId}`);
    return { event: 'joined', simulationId };
  }

  @SubscribeMessage('leaveSimulation')
  handleLeaveSimulation(
    @MessageBody() data: { simulationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { simulationId } = data;
    client.leave(simulationId);
    
    this.activeSimulations.get(simulationId)?.delete(client.id);
    this.logger.log(`Client ${client.id} left simulation ${simulationId}`);
    return { event: 'left', simulationId };
  }

  emitSimulationLog(log: SimulationLogMessage) {
    this.server.to(log.simulation_id).emit('simulationLog', log);
  }

  emitMarketBiasUpdate(bias: MarketBiasMessage) {
    this.server.emit('marketBiasUpdate', bias);
  }

  emitAgentAction(simulationId: string, agentId: string, action: string, reasoning: string) {
    const log: SimulationLogMessage = {
      simulation_id: simulationId,
      agent_id: agentId,
      agent_name: 'Agent',
      action,
      reasoning,
      timestamp: new Date().toISOString(),
    };
    this.emitSimulationLog(log);
  }

  emitSwarmProgress(simulationId: string, completed: number, total: number) {
    this.server.to(simulationId).emit('swarmProgress', {
      simulation_id: simulationId,
      completed,
      total,
      percentage: (completed / total) * 100,
    });
  }

  emitSimulationComplete(simulationId: string, finalBias: number) {
    this.server.to(simulationId).emit('simulationComplete', {
      simulation_id: simulationId,
      final_bias: finalBias,
      timestamp: new Date().toISOString(),
    });
  }

  getActiveSimulationCount(): number {
    return this.activeSimulations.size;
  }

  getSimulationParticipants(simulationId: string): number {
    return this.activeSimulations.get(simulationId)?.size || 0;
  }
}
