import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
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

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: {
        title: 'ForexFish GraphQL Playground',
      },
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    InteractionModule,
    MemoryModule,
    EventSourcingModule,
    GraphRAGModule,
    ReportingModule,
    AgentsModule,
    Mt5Module,
    GroundingModule,
  ],
  providers: [
    SimulationService,
    SimulationResolver,
    SimulationGateway,
  ],
})
export class AppModule {}