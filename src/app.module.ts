import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { SimulationService } from './simulation/simulation.service';
import { SimulationResolver } from './graphql/simulation.resolver';
import { SimulationGateway } from './gateway/simulation.gateway';
import { InteractionModule } from './interaction/interaction.module';
import { MemoryModule } from './memory/memory.module';
import { EventSourcingModule } from './eventsourcing/eventsourcing.module';
import { GraphRAGModule } from './graphrag/graphrag.module';
import { ReportingModule } from './reporting/reporting.module';
import { AgentsModule } from './agents/agents.module';
import { Mt5Module } from './mt5/mt5.module';
import { GroundingModule } from './grounding/grounding.module';
import { ZeromqModule } from './zeromq/zeromq.module';
import { OASISModule } from './common/oasis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    InteractionModule,
    MemoryModule,
    EventSourcingModule,
    GraphRAGModule,
    ReportingModule,
    AgentsModule,
    Mt5Module,
    GroundingModule,
    ZeromqModule,
    OASISModule,
  ],
  providers: [
    SimulationService,
    SimulationResolver,
    SimulationGateway,
  ],
})
export class AppModule {}