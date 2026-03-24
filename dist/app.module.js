"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_server_core_1 = require("apollo-server-core");
const path_1 = require("path");
const simulation_service_1 = require("./simulation/simulation.service");
const simulation_resolver_1 = require("./graphql/simulation.resolver");
const simulation_gateway_1 = require("./gateway/simulation.gateway");
const interaction_module_1 = require("./interaction/interaction.module");
const memory_module_1 = require("./memory/memory.module");
const eventsourcing_module_1 = require("./eventsourcing/eventsourcing.module");
const graphrag_module_1 = require("./graphrag/graphrag.module");
const reporting_module_1 = require("./reporting/reporting.module");
const agents_module_1 = require("./agents/agents.module");
const mt5_module_1 = require("./mt5/mt5.module");
const grounding_module_1 = require("./grounding/grounding.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            graphql_1.GraphQLModule.forRoot({
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/graphql/schema.gql'),
                sortSchema: true,
                playground: {
                    title: 'ForexFish GraphQL Playground',
                },
                plugins: [(0, apollo_server_core_1.ApolloServerPluginLandingPageLocalDefault)()],
                subscriptions: {
                    'graphql-ws': true,
                },
            }),
            interaction_module_1.InteractionModule,
            memory_module_1.MemoryModule,
            eventsourcing_module_1.EventSourcingModule,
            graphrag_module_1.GraphRAGModule,
            reporting_module_1.ReportingModule,
            agents_module_1.AgentsModule,
            mt5_module_1.Mt5Module,
            grounding_module_1.GroundingModule,
        ],
        providers: [
            simulation_service_1.SimulationService,
            simulation_resolver_1.SimulationResolver,
            simulation_gateway_1.SimulationGateway,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map