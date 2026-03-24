# ForexFish MT5 ZeroMQ Bridge

Bidirectional communication bridge between NestJS backend and MetaTrader 5 terminal using ZeroMQ.

## Architecture

```
┌─────────────────┐         ZeroMQ         ┌─────────────────┐
│   NestJS        │ ◄───── SUB (5555) ───►│   MT5 Terminal  │
│   Backend       │                        │   ForexFish EA  │
│                 │ ◄───── REQ (5556) ───►│                 │
└─────────────────┘                        └─────────────────┘
```

## Project Structure

```
project/
├── src/mt5/              # NestJS ZeroMQ Service
│   ├── meta-trader.service.ts    # Main service (SUB/REQ sockets)
│   └── mt5.module.ts              # NestJS module
├── mt5-ea/               # MetaTrader 5 Expert Advisor
│   ├── ForexFishBridge.mq5       # EA source code
│   └── INSTALLATION.md           # DLL setup guide
└── package.json
```

## Quick Start

### 1. Install Dependencies

```bash
cd project
npm install
```

### 2. Configure MT5 EA

See [INSTALLATION.md](mt5-ea/INSTALLATION.md) for:
- ZeroMQ DLL placement
- EA compilation
- Network configuration

### 3. Start NestJS Server

```bash
npm run start:dev
```

### 4. Attach EA to MT5 Chart

- Open MetaTrader 5
- Compile `ForexFishBridge.mq5` in MetaEditor
- Drag the EA onto a chart
- Ensure ports 5555 and 5556 are available

## Usage

### Subscribe to Tick Data

```typescript
import { MetaTraderService, TickData } from './mt5/meta-trader.service';

@Injectable()
export class MyService {
  constructor(private mt5: MetaTraderService) {}

  onModuleInit() {
    // Subscribe to real-time ticks
    const unsubscribe = this.mt5.onTick((tick: TickData) => {
      console.log(`Price: ${tick.symbol} ${tick.bid}/${tick.ask}`);
    });

    // Cleanup on destroy
    unsubscribe();
  }
}
```

### Execute Trades

```typescript
// Buy order
const buyResult = await this.mt5.executeTrade('EURUSD', 'BUY', 0.01);

// Sell order
const sellResult = await this.mt5.executeTrade('EURUSD', 'SELL', 0.01);

// Close position
const closeResult = await this.mt5.closePosition(ticket);

// Get history
const history = await this.mt5.getHistory('EURUSD', 100);

// Get open positions
const positions = await this.mt5.getOpenPositions();
```

## Message Formats

### Tick Data (PUB → SUB)

```json
{
  "symbol": "EURUSD",
  "bid": 1.0850,
  "ask": 1.0851,
  "time": 1711234567
}
```

### Trade Command (REQ → REP)

```json
{
  "action": "BUY",
  "symbol": "EURUSD",
  "volume": 0.01,
  "price": 0,
  "magic": 123456
}
```

### Trade Response

```json
{
  "success": true,
  "orderId": 12345678,
  "error": null
}
```

## API Reference

### MetaTraderService

| Method | Description |
|--------|-------------|
| `onTick(callback)` | Subscribe to tick data, returns unsubscribe fn |
| `getLastTick()` | Get the most recent tick |
| `executeTrade(symbol, action, volume, price?)` | Execute BUY/SELL |
| `closePosition(ticket)` | Close an open position |
| `getHistory(symbol, count)` | Get trade history |
| `getOpenPositions()` | Get all open positions |
| `isConnected()` | Check connection status |
| `connect()` / `disconnect()` | Manual connection control |

### Supported Actions

| Action | Description |
|--------|-------------|
| `BUY` | Open buy position |
| `SELL` | Open sell position |
| `CLOSE` | Close position by ticket |
| `HISTORY` | Get historical deals |
| `POSITIONS` | List open positions |

## Reconnection Logic

The service automatically handles reconnection:
- **Delay**: 3 seconds between attempts
- **Max Attempts**: 10 before stopping
- **Triggers**: Socket close, connection error, MT5 restart

## Troubleshooting

### Connection Refused
- Verify MT5 is running with the EA attached
- Check ports 5555/5556 are not in use
- Ensure firewall allows local TCP connections

### DLL Not Found (MT5)
- Place DLLs in `MQL5\Libraries\`
- Install Visual C++ Redistributable

### Messages Not Received
- Verify JSON format matches specification
- Check both sockets are initialized

## Dependencies

### Node.js
- `zeromq` v6.x
- `@nestjs/common` v10.x

### MetaTrader 5
- ZeroMQ wrapper DLL (e.g., MT5Zmq, ZmqBridge)
- libzmq.dll

## License

MIT