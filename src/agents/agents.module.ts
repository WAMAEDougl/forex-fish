import { Module } from '@nestjs/common';
import { AgentInferenceEngine } from './agent-inference.engine';
import { KnowledgeGraph } from './knowledge-graph';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [AgentInferenceEngine, KnowledgeGraph],
  exports: [AgentInferenceEngine, KnowledgeGraph],
})
export class AgentsModule {}