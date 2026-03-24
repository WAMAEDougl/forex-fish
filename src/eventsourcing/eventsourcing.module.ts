import { Module } from '@nestjs/common';
import { EventSourcingService } from './event-sourcing.service';
import { GodModeController } from './god-mode.controller';
import { GraphRAGModule } from '../graphrag/graphrag.module';
import { CommonModule } from '../common/common.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [CommonModule, GraphRAGModule, AgentsModule],
  providers: [EventSourcingService, GodModeController],
  exports: [EventSourcingService, GodModeController],
})
export class EventSourcingModule {}