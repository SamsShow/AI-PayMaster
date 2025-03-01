# Aptos Wallet Integration with Move Agent Kit

This project demonstrates how to connect to an Aptos wallet and check its balance using Move Agent Kit. It provides both a CLI interface and a React component for interacting with the Aptos blockchain.

## Features

- Connect to Aptos wallet using a private key
- Check wallet balance
- Check balance of any Aptos address
- Support for Mainnet, Testnet, and Devnet
- React component for UI integration
- CLI tool for command-line usage

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- An Aptos wallet private key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   APTOS_PRIVATE_KEY="your_private_key_here"
   OPENAI_API_KEY="your_openai_api_key_here"  # Optional, for AI features
   ```

## Usage

### Web Interface

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:5173`
3. Use the Aptos Wallet component to:
   - Select a network (Mainnet, Testnet, or Devnet)
   - Connect to your wallet
   - View your wallet address and balance
   - Check the balance of other Aptos addresses

### CLI Usage

You can use the CLI tool to check your wallet balance from the command line:

```bash
# Run the CLI tool
node src/agents/cli.js

# Check balance of a specific address
node src/agents/cli.js 0x123...abc
```

## Code Structure

- `src/agents/index.js` - Main AptosWalletManager class
- `src/agents/cli.js` - CLI interface
- `src/components/AptosWallet.jsx` - React component
- `src/App.tsx` - Main application component

## AptosWalletManager API

The `AptosWalletManager` class provides the following methods:

### initialize(network)

Initializes the connection to Aptos.

- `network` - (Optional) The network to connect to (default: MAINNET)
- Returns: Promise<boolean> - True if initialization is successful

### getBalance(address)

Gets the balance of an Aptos account.

- `address` - (Optional) The account address (defaults to the initialized account)
- Returns: Promise<number|null> - The account balance or null if there was an error

### getAccountAddress()

Gets the account address.

- Returns: string|null - The account address or null if not initialized

### transferTokens(toAddress, amount)

Transfers tokens to another address.

- `toAddress` - The recipient address
- `amount` - Amount to transfer
- Returns: Promise<any> - Transaction result

## Security Considerations

- Never commit your `.env` file or expose your private key
- Use Testnet or Devnet for development and testing
- Be careful when using the transferTokens method, as it will move real tokens on Mainnet

## Resources

- [Move Agent Kit Documentation](https://metamove.build/move-agent-kit)
- [Aptos Documentation](https://aptos.dev/)
- [Aptos TS SDK](https://github.com/aptos-labs/aptos-ts-sdk)

## License

MIT 