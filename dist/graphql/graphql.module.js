"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLAppModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_server_core_1 = require("apollo-server-core");
const path_1 = require("path");
const simulation_service_1 = require("../simulation/simulation.service");
const simulation_resolver_1 = require("./simulation.resolver");
const pubsub_service_1 = require("../common/pubsub.service");
let GraphQLAppModule = class GraphQLAppModule {
};
exports.GraphQLAppModule = GraphQLAppModule;
exports.GraphQLAppModule = GraphQLAppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            graphql_1.GraphQLModule.forRoot({
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/graphql/schema.gql'),
                sortSchema: true,
                playground: false,
                plugins: [(0, apollo_server_core_1.ApolloServerPluginLandingPageLocalDefault)()],
                subscriptions: {
                    'graphql-ws': true,
                    'subscriptions-transport-ws': true,
                },
                context: ({ req }) => ({ req }),
            }),
        ],
        providers: [
            simulation_service_1.SimulationService,
            simulation_resolver_1.SimulationResolver,
            pubsub_service_1.PubSub,
        ],
        exports: [simulation_service_1.SimulationService],
    })
], GraphQLAppModule);
//# sourceMappingURL=graphql.module.js.map