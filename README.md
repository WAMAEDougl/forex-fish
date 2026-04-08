# ForexFish

Multi-agent AI simulation backend for Forex trading with real-time MetaTrader 5 integration.

## Overview

ForexFish is an intelligent trading system that combines:
- **Multi-agent AI architecture** - 20 specialized agents working together
- **GraphQL API** - Flexible query and mutation interface
- **WebSocket real-time updates** - Live trading events and simulation
- **React UI Dashboard** - Real-time monitoring and control interface
- **MT5 ZeroMQ Bridge** - Direct connection to MetaTrader 5 for tick data and trade execution
- **OASIS Agent Debate** - Multi-agent market sentiment analysis via OpenRouter
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
│  │  Agent   │  │ Simula-  │  │  Memory  │  │   OASIS      │    │
│  │  System  │  │  tion    │  │  Service │  │   Debate    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Prisma ORM                Neo4j Graph DB                     │
└─────────────────────────────────────────────────────────────────┘
                           ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      forex-fish-ui                              │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + Vite + Tailwind + shadcn/ui                        │
│  Apollo Client (GraphQL)      Socket.io (Real-time)            │
│  Recharts              React Flow (Knowledge Graph)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Python Sidecar (OASIS)                       │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI (8000)  →  OpenRouter  →  5-Agent Debate              │
│  Whale, Scalper, Fundamentalist, Technical, Sentiment          │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Backend**: Node.js 20+ with NestJS 10.x
- **AI Sidecar**: Python 3.12+ with FastAPI
- **API**: GraphQL (Apollo Server)
- **Frontend**: React 18 + Vite + Tailwind (see forex-fish-ui)
- **Database**: PostgreSQL + Prisma, Neo4j
- **Real-time**: WebSocket (Socket.io)
- **Trading**: ZeroMQ + MetaTrader 5
- **LLM**: OpenRouter (Claude, GPT, etc.)

## Project Structure

```
forex-fish/
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
│   ├── zeromq/                    # ZeroMQ price tick subscriber
│   │   ├── zeromq.service.ts
│   │   └── zeromq.module.ts
│   ├── common/                    # Shared utilities
│   │   ├── llm.service.ts         # OpenRouter LLM client
│   │   ├── oasis.service.ts       # OASIS API client
│   │   ├── oasis.module.ts
│   │   └── ...
│   ├── gateway/                   # WebSocket gateway
│   ├── graphql/                   # GraphQL schema & resolvers
│   ├── mt5/                       # MT5 ZeroMQ Bridge
│   ├── memory/                    # Memory/Vector store
│   ├── eventsourcing/             # Event sourcing
│   ├── graphrag/                  # GraphRAG
│   ├── grounding/                 # World state & accuracy
│   ├── reporting/                 # Reporting agent
│   └── interaction/               # Interaction processor
├── mt5-ea/                        # MetaTrader 5 Expert Advisor
│   ├── ForexFishBridge.mq5
│   └── ...
├── agent_controller/              # Python OASIS sidecar
│   ├── agent_controller.py
│   ├── requirements.txt
│   └── README.md
├── prisma/
│   └── schema.prisma              # Database schema
├── package.json
└── tsconfig.json
```

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/WAMAEDougl/forex-fish.git
cd forex-fish
npm install

# Clone and setup UI
cd ..
git clone https://github.com/WAMAEDougl/agent-symphony.git forex-fish-ui
cd forex-fish-ui
npm install --legacy-peer-deps
```

### 2. Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/forexfish"

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# OpenRouter (for agent reasoning)
OPENROUTER_API_KEY=sk-or-v1-...

# OASIS Agent Controller
OASIS_ENABLED=true
OASIS_API_URL=http://localhost:8000
```

Create `forex-fish-ui/.env`:
```env
VITE_GRAPHQL_URL=http://localhost:3000/graphql
VITE_WS_URL=http://localhost:4000
```

### 3. Database Setup

```bash
cd forex-fish
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start Backend

```bash
cd forex-fish
npm run start:dev
```

GraphQL Playground: http://localhost:3000/graphql

### 5. Start UI

```bash
cd forex-fish-ui
npm run dev
```

UI Dashboard: http://localhost:8080

### 6. Start Python Agent Controller (Optional)

```bash
cd forex-fish/agent_controller
pip install -r requirements.txt
export OPENROUTER_API_KEY="your-key"
python agent_controller.py
```

## MT5 Integration

### Setup

1. **Install ZeroMQ DLLs** in MT5 `MQL5\Libraries\` folder
2. **Compile** `mt5-ea/ForexFishBridge.mq5` in MetaEditor
3. **Attach EA** to any chart

### Usage

```typescript
// Subscribe to ticks
constructor(private zeromq: ZeromqService) {}

onModuleInit() {
  this.zeromq.connect();
  this.zeromq.onTick(tick => {
    console.log(tick.symbol, tick.bid, tick.ask);
  });
}

// Execute trades
await this.zeromq.buy('EURUSD', 0.01);
await this.zeromq.sell('EURUSD', 0.01);
await this.zeromq.closePosition(ticket);

// Get data
const positions = await this.zeromq.getOpenPositions();
const history = await this.zeromq.getHistory('EURUSD');
const account = await this.zeromq.getAccountInfo();
```

## OASIS Agent Debate

The OASIS service runs a 3-round debate between 5 agent personas:

| Persona | Strategy |
|---------|----------|
| Whale | Large institutional, macro-focused |
| Scalper | High-frequency, micro-structure |
| Fundamentalist | Economic data & news driven |
| Technical Analyst | Chart patterns & indicators |
| Sentiment Trader | Market mood & crowd behavior |

### Request

```typescript
const result = await simulationService.getOASISMarketBias({
  symbol: 'EURUSD',
  bid: 1.0850,
  ask: 1.0852,
  spread: 2.0,
  time: 1712246400,
  news: ['ECB holds rates'],
  indicators: { rsi: 55, macd: 0.001 },
});
```

### Response

```json
{
  "market_bias": "BULLISH",
  "confidence_score": 0.72,
  "reasoning": {
    "summary": "3-round debate between 5 agents",
    "agents": { "Whale": "...", "Scalper": "..." }
  },
  "rounds": [...]
}
```

## GraphQL API

### Example Queries

```graphql
query GetSimulation {
  simulation {
    id
    status
    agents { name, role }
  }
}

query GetMarketSentiment {
  marketSentiment {
    overallBias
    sentimentScore
    dominantPersona
  }
}
```

### Example Mutations

```graphql
mutation StartSimulation {
  startSimulation(input: {
    symbols: ["EURUSD", "GBPUSD"]
    initialBalance: 10000
  }) {
    id
    status
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

## Module Overview

| Module | Description |
|--------|-------------|
| `agents` | Multi-agent AI system with persona-based agents |
| `simulation` | Trading simulation engine |
| `zeromq` | ZeroMQ subscriber for MT5 price ticks |
| `graphql` | GraphQL API with Apollo Server |
| `gateway` | WebSocket gateway for real-time updates |
| `mt5` | ZeroMQ bridge to MetaTrader 5 |
| `memory` | Vector store for agent memory |
| `eventsourcing` | Event sourcing for audit trail |
| `graphrag` | Knowledge graph with RAG capabilities |
| `grounding` | World state & prediction accuracy |
| `reporting` | Reporting and analysis agent |
| `oasis` | OASIS agent debate integration |

## License

MIT