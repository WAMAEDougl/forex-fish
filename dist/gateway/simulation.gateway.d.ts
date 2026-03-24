import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
export declare class SimulationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private activeSimulations;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinSimulation(data: {
        simulationId: string;
    }, client: Socket): {
        event: string;
        simulationId: string;
    };
    handleLeaveSimulation(data: {
        simulationId: string;
    }, client: Socket): {
        event: string;
        simulationId: string;
    };
    emitSimulationLog(log: SimulationLogMessage): void;
    emitMarketBiasUpdate(bias: MarketBiasMessage): void;
    emitAgentAction(simulationId: string, agentId: string, action: string, reasoning: string): void;
    emitSwarmProgress(simulationId: string, completed: number, total: number): void;
    emitSimulationComplete(simulationId: string, finalBias: number): void;
    getActiveSimulationCount(): number;
    getSimulationParticipants(simulationId: string): number;
}
