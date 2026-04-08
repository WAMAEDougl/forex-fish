import { Module } from '@nestjs/common';
import { TradeExecutorService } from './trade-executor.service';

@Module({
  providers: [TradeExecutorService],
  exports: [TradeExecutorService],
})
export class TradingModule {}
