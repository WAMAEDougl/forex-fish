import { Module } from '@nestjs/common';
import { GraphRAGService } from './graphrag.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [GraphRAGService],
  exports: [GraphRAGService],
})
export class GraphRAGModule {}