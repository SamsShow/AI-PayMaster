# PayMaster: Automated Payment and Yield Optimization on Aptos

PayMaster is a smart contract and AI-powered system built on the Aptos blockchain that automates stablecoin payments while optimizing yield on idle funds.

## Features

- **Payment Automation**: Schedule recurring payments in stablecoins or APT
- **Yield Optimization**: Automatically detect idle funds and deploy them to high-yield protocols
- **Risk Management**: Monitor liquidity, collateral, and liquidation risks
- **AI Integration**: Optimize asset allocation based on risk preferences and market conditions

## Project Structure

```
PayMaster/
├── move/                   # Move smart contracts
│   ├── sources/            # Move source code
│   │   ├── payment_automation.move   # Payment scheduling and execution
│   │   ├── yield_optimizer.move      # Yield optimization
│   │   └── risk_manager.move         # Risk management
│   └── Move.toml           # Move package configuration
│
└── src/                    # Frontend and agent implementation
    ├── tools/              # Tools and agents
    │   └── paymaster/      # PayMaster agent implementation
    │       ├── PayMasterAgent.ts     # Smart contract integration
    │       ├── AIYieldOptimizer.ts   # AI yield optimization
    │       └── RiskAssessmentEngine.ts # Risk assessment
    └── agents/             # AI agent integration
        └── CustomMoveAgent.tsx       # Move Agent Kit integration
```

## Setup Instructions

### Prerequisites

- [Aptos CLI](https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli/)
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [NPM](https://www.npmjs.com/) (v8 or higher)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/PayMaster.git
   cd PayMaster
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Compile Move modules:

   ```
   cd move
   aptos move compile
   ```

4. Deploy Move modules to testnet:

   ```
   aptos move publish --named-addresses paymaster=YOUR_ACCOUNT_ADDRESS
   ```

5. Update the base address in the PayMasterAgent.ts file with your deployed module address.

6. Start the development server:
   ```
   npm run dev
   ```

## Smart Contract Development

### Payment Automation

The payment automation module enables users to:

- Create scheduled payments with customizable intervals
- Cancel scheduled payments
- Execute due payments

### Yield Optimization

The yield optimization module enables:

- Creation of yield strategies
- Automatic allocation of idle funds
- Monitoring and optimizing yield across protocols

### Risk Management

The risk management module provides:

- Liquidity risk monitoring
- Collateral risk assessment
- Liquidation risk warnings

## Integrations

PayMaster integrates with the following Aptos DeFi protocols:

- Thala
- Aries
- Momentum

## License

MIT License
