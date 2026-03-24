# ForexFish

Multi-agent AI simulation backend for Forex trading with real-time MetaTrader 5 integration.

## Overview

ForexFish is an intelligent trading system that combines:
- **Multi-agent AI architecture** - Multiple specialized agents working together
- **GraphQL API** - Flexible query and mutation interface
- **WebSocket real-time updates** - Live trading events and simulation
- **MT5 ZeroMQ Bridge** - Direct connection to MetaTrader 5 for tick data and trade execution
- **Event sourcing** - Complete audit trail of all trading decisions
- **GraphRAG** - Knowledge graph with retrieval-augmented generation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ForexFish                               │
├─────────────────────────────────────────────────────────────────┤
│  GraphQL API          WebSocket          ZeroMQ Bridge        │
│  (Apollo)             (Socket.io)        (MT5 Integration)     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Agent   │  │ Simula-  │  │  Memory  │  │   Trading    │    │
│  │  System  │  │  tion    │  │  Service │  │   Engine    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Prisma ORM                Neo4j Graph DB                     │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10.x
- **API**: GraphQL (Apollo Server)
- **Database**: PostgreSQL + Prisma, Neo4j
- **Real-time**: WebSocket (Socket.io)
- **Trading**: ZeroMQ + MetaTrader 5
- **Queue**: BullMQ

## Project Structure

```
project/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── agents/                    # AI Agent system
│   │   ├── agent-inference.engine.ts
│   │   ├── agents.module.ts
│   │   ├── knowledge-graph.ts
│   │   └── persona.factory.ts
│   ├── simulation/                # Trading simulation
│   │   └── simulation.service.ts
│   ├── gateway/                   # WebSocket gateway
│   │   ├── gateway.module.ts
│   │   └── simulation.gateway.ts
│   ├── graphql/                   # GraphQL schema & resolvers
│   │   ├── graphql.module.ts
│   │   ├── schema.gql
│   │   └── simulation.resolver.ts
│   ├── mt5/                       # MT5 ZeroMQ Bridge
│   │   ├── meta-trader.service.ts
│   │   └── mt5.module.ts
│   ├── memory/                    # Memory/Vector store
│   │   └── memory.service.ts
│   ├── eventsourcing/             # Event sourcing
│   │   └── event-sourcing.service.ts
│   ├── graphrag/                  # GraphRAG
│   │   └── graphrag.service.ts
│   ├── reporting/                 # Reporting agent
│   │   └── report-agent.service.ts
│   ├── interaction/               # Interaction processor
│   │   └── interaction.processor.ts
│   └── common/                    # Shared utilities
├── mt5-ea/                        # MetaTrader 5 Expert Advisor
│   ├── ForexFishBridge.mq5
│   ├── README.md
│   └── INSTALLATION.md
├── prisma/
│   └── schema.prisma              # Database schema
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (for Prisma)
- Neo4j (for Graph database)
- MetaTrader 5 terminal (optional, for live trading)

### Installation

```bash
cd project
npm install
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio (optional)
npm run prisma:studio
```

### Environment Variables

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/forexfish"
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="password"
```

### Start Development Server

```bash
npm run start:dev
```

GraphQL Playground available at: http://localhost:3000/graphql

## MT5 Integration

### Quick Setup

1. **Install ZeroMQ DLLs** in MT5 `MQL5\Libraries\` folder
   - See [mt5-ea/INSTALLATION.md](mt5-ea/INSTALLATION.md)

2. **Compile the EA**
   - Open `mt5-ea/ForexFishBridge.mq5` in MetaEditor
   - Press F7 to compile

3. **Attach to Chart**
   - Drag the compiled EA onto any chart in MT5
   - The EA will publish ticks on port 5555
   - The EA will listen for commands on port 5556

### Trading Commands

```typescript
// Inject the service
constructor(private mt5: MetaTraderService) {}

// Subscribe to ticks
const unsubscribe = this.mt5.onTick(tick => {
  console.log(tick);
});

// Execute trades
await this.mt5.executeTrade('EURUSD', 'BUY', 0.01);
await this.mt5.executeTrade('EURUSD', 'SELL', 0.01);

// Close positions
await this.mt5.closePosition(ticket);

// Get data
const history = await this.mt5.getHistory('EURUSD', 100);
const positions = await this.mt5.getOpenPositions();
```

## GraphQL API

### Example Queries

```graphql
# Get simulation status
query GetSimulation {
  simulation {
    id
    status
    agents {
      name
      role
    }
  }
}

# Get agent memory
query GetAgentMemory($agentId: ID!) {
  agentMemory(agentId: $agentId) {
    facts
    relationships
  }
}
```

### Example Mutations

```graphql
# Start simulation
mutation StartSimulation {
  startSimulation(input: {
    symbols: ["EURUSD", "GBPUSD"]
    initialBalance: 10000
  }) {
    id
    status
  }
}

# Execute trade
mutation ExecuteTrade($input: TradeInput!) {
  executeTrade(input: $input) {
    success
    orderId
    error
  }
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the project |
| `npm run start` | Start production server |
| `npm run start:dev` | Start in development mode |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## Modules

| Module | Description |
|--------|-------------|
| `agents` | Multi-agent AI system with persona-based agents |
| `simulation` | Trading simulation engine |
| `graphql` | GraphQL API with Apollo Server |
| `gateway` | WebSocket gateway for real-time updates |
| `mt5` | ZeroMQ bridge to MetaTrader 5 |
| `memory` | Vector store for agent memory |
| `eventsourcing` | Event sourcing for audit trail |
| `graphrag` | Knowledge graph with RAG capabilities |
| `reporting` | Reporting and analysis agent |
| `interaction` | User interaction processing |

## License

MIT# forex-fish
