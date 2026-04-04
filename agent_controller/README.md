# Forex Agent Controller

FastAPI service for multi-agent Forex market debate simulation using OpenRouter.

## Setup

```bash
cd forex-fish/agent_controller
pip install -r requirements.txt

# Set OpenRouter API key
export OPENROUTER_API_KEY="your-api-key"
```

## Run

```bash
python agent_controller.py
```

## API Endpoints

### POST /analyze
Accepts market data and runs 3-round debate between agents.

**Request:**
```json
{
  "symbol": "EURUSD",
  "bid": 1.0850,
  "ask": 1.0852,
  "spread": 2.0,
  "time": 1712246400,
  "news": ["ECB rates unchanged", "US jobs report beat expectations"],
  "indicators": {
    "rsi": 55.2,
    "macd": 0.0015,
    "ema_20": 1.0848
  }
}
```

**Response:**
```json
{
  "market_bias": "BULLISH",
  "confidence_score": 0.72,
  "reasoning": {
    "summary": "3-round debate between 5 agents",
    "agents": {...}
  },
  "rounds": [...]
}
```

### GET /health
Health check endpoint.

### POST /initialize
Manually initialize agents (optional - happens automatically on first /analyze call).

## Agent Personas

| Persona | Description |
|---------|-------------|
| Whale | Large institutional trader, long-term macro focus |
| Scalper | High-frequency, micro-structure sensitive |
| Fundamentalist | Economic data/news driven |
| Technical Analyst | Chart patterns & indicators |
| Sentiment Trader | Market mood & crowd behavior |

## Connect from NestJS

```typescript
// In your NestJS service
async function sendToAgentController(data: MarketDataInput): Promise<DebateResult> {
  const response = await fetch('http://localhost:8000/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```