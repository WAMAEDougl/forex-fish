import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsIngestorService } from './news-ingestor.service';
import { WorldStateService } from './world-state.service';
import { ShadowSimulationService } from './shadow-simulation.service';
import { AccuracyMonitorService } from './accuracy-monitor.service';
import { GroundingEngineService } from './grounding-engine.service';
import { Mt5Module } from '../mt5/mt5.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    Mt5Module,
  ],
  providers: [
    NewsIngestorService,
    WorldStateService,
    ShadowSimulationService,
    AccuracyMonitorService,
    GroundingEngineService,
  ],
  exports: [
    GroundingEngineService,
    AccuracyMonitorService,
    WorldStateService,
  ],
})
export class GroundingModule {}