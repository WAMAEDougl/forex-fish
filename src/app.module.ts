import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import GraphQLJSON from 'graphql-type-json';
import { SimulationService } from './simulation/simulation.service';
import { SimulationResolver } from './graphql/simulation.resolver';
import { SimulationGateway, GatewayModule } from './gateway/gateway.module';
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
import { PubSub } from './common/pubsub.service';
import { TradingModule } from './trading/trading.module';
import { LearningModule } from './learning/learning.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      buildSchemaOptions: {
        scalarsMap: [{ type: () => GraphQLJSON, scalar: GraphQLJSON }],
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
    ZeromqModule,
    OASISModule,
    TradingModule,
    GatewayModule,
    LearningModule,
  ],
  providers: [
    SimulationService,
    SimulationResolver,
    SimulationGateway,
    PubSub,
  ],
})
export class AppModule {}