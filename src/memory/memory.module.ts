import { Module } from '@nestjs/common';
import { PersistentMemoryService } from './memory.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [PersistentMemoryService],
  exports: [PersistentMemoryService],
})
export class MemoryModule {}