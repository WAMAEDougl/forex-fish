import { Module } from '@nestjs/common';
import { SimulationGateway } from './simulation.gateway';

@Module({
  providers: [SimulationGateway],
  exports: [SimulationGateway],
})
export class GatewayModule {}
