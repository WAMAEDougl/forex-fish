import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { LLMService } from './llm.service';

@Global()
@Module({
  providers: [PrismaService, LLMService],
  exports: [PrismaService, LLMService],
})
export class CommonModule {}