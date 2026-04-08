import { Module } from '@nestjs/common';
import { TradeExecutorService } from './trade-executor.service';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [LearningModule],
  providers: [TradeExecutorService],
  exports: [TradeExecutorService],
})
export class TradingModule {}
