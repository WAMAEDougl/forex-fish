import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
import { join } from 'path';
import { SimulationService } from '../simulation/simulation.service';
import { SimulationResolver } from './simulation.resolver';
import { PubSub } from '../common/pubsub.service';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': true,
      },
      context: ({ req }) => ({ req }),
    }),
  ],
  providers: [
    SimulationService,
    SimulationResolver,
    PubSub,
  ],
  exports: [SimulationService],
})
export class GraphQLAppModule {}