import { Module } from '@nestjs/common';
import { ReportAgent } from './report-agent.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [ReportAgent],
  exports: [ReportAgent],
})
export class ReportingModule {}