import { Module } from '@nestjs/common';
import { InteractionEngine } from './interaction.types';
import { InteractionProcessor } from './interaction.processor';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [InteractionEngine, InteractionProcessor],
  exports: [InteractionEngine],
})
export class InteractionModule {}