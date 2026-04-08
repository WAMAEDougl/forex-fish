import { Module } from '@nestjs/common';
import { SelfLearningService } from './self-learning.service';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [MemoryModule],
  providers: [SelfLearningService],
  exports: [SelfLearningService],
})
export class LearningModule {}
