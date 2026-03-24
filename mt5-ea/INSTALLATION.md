# MT5 ZeroMQ Bridge - Installation Guide

## Overview
The ForexFishBridge EA connects your MetaTrader 5 terminal to the NestJS backend via ZeroMQ for real-time tick data streaming and command execution.

## DLL Requirements

### Option 1: Use a Third-Party ZeroMQ Wrapper (Recommended)
For MT5, you'll need a ZeroMQ wrapper DLL. Common options:
- **MT5Zmq** - Commercial ZeroMQ wrapper for MT5
- **ZmqBridge** - Open source alternative
- **Custom wrapper** - Can be built using C++ with libzmq

### Option 2: Build Custom DLL
If you want to build your own:
1. Download libzmq from: https://github.com/zeromq/libzmq
2. Build as a Windows DLL
3. Export the required functions

## DLL Placement

### For Windows MT5 Terminal:
Copy your ZeroMQ DLL files to:
```
C:\Users\[YourUsername]\AppData\Roaming\MetaQuotes\Terminal\[YourTerminalID]\MQL5\Libraries\
```

### Directory Structure:
```
MQL5/
├── Libraries/
│   ├── ZmqMT5.dll          (ZeroMQ wrapper)
│   └── libzmq.dll          (libzmq library, if separate)
├── Experts/
│   └── ForexFishBridge.ex5 (Compiled EA)
└── Include/
    └── JSON.mqh            (JSON library, optional)
```

## Finding Your Terminal Directory
1. Open MetaTrader 5
2. Go to File > Open Data Folder
3. Navigate to `MQL5\Libraries\`

## EA Configuration

### EA Input Parameters:
- **PubPort** (default: 5555) - Port for publishing tick data
- **RepPort** (default: 5556) - Port for receiving commands

### Compiling the EA:
1. Open MetaEditor (Ctrl+N or File > New)
2. Open `ForexFishBridge.mq5`
3. Press F7 or click "Compile"
4. The `.ex5` file will be generated in the `MQL5\Experts\` folder

## Network Configuration

### Firewall Rules:
If running MT5 on a different machine:
1. Open Windows Firewall
2. Allow inbound TCP on ports 5555 and 5556

### Connection Settings:
In `src/mt5/meta-trader.service.ts`:
- Default connects to `127.0.0.1:5555` and `127.0.0.1:5556`
- Update IP if MT5 runs on a different machine

## Testing the Connection

### 1. Start NestJS Server:
```bash
cd project
npm run start:dev
```

### 2. Attach EA to Chart:
- In MT5, drag ForexFishBridge.ex5 onto a chart
- Set inputs if needed

### 3. Verify Connection:
Check terminal logs for:
```
ForexFishBridge: Initialized successfully on ports 5555 (PUB) and 5556 (REP)
```

## Troubleshooting

### "DLL not found" Error:
- Verify DLL is in the correct `MQL5\Libraries\` folder
- Check dependencies: You may need Visual C++ Redistributable

### Connection Refused:
- Ensure MT5 terminal is running with the EA attached
- Check no other application is using ports 5555/5556

### Messages Not Being Received:
- Check firewall settings
- Verify JSON format matches the expected structure

## JSON Message Formats

### Tick (PUB):
```json
{"symbol":"EURUSD","bid":1.0850,"ask":1.0851,"time":1711234567}
```

### Command (REP):
```json
{"action":"BUY","symbol":"EURUSD","volume":0.01,"magic":123456}
```

### Response:
```json
{"success":true,"orderId":12345678}
```

## Security Notes
- For production, consider using ZeroMQ CURVE security
- Don't expose ports to the public internet without authentication
- Use VPN or firewall rules to restrict access