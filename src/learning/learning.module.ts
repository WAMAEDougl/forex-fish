import { Module } from '@nestjs/common';
import { SelfLearningService } from './self-learning.service';

@Module({
  providers: [SelfLearningService],
  exports: [SelfLearningService],
})
export class LearningModule {}
