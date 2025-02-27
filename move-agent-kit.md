# Move Agent Kit Documentation

## Overview

Move Agent Kit is a comprehensive toolkit for building AI agents that interact with the Aptos blockchain, particularly focusing on Move-based smart contracts and decentralized applications. This documentation provides an organized reference of all available components.

## Authentication and Signing

| Component      | Description                                                   |
| -------------- | ------------------------------------------------------------- |
| `BaseSigner`   | Abstract base class for all signers with common functionality |
| `LocalSigner`  | Implements signature operations using local private keys      |
| `WalletSigner` | Implements signature operations using wallet interfaces       |

## Core Components

| Component          | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `AgentRuntime`     | Main runtime environment for Move agents             |
| `createAptosTools` | Utility to create and configure Aptos-specific tools |
| `parseJson`        | Utility for parsing JSON data safely                 |

## Aptos Basic Operations

| Component                 | Description                                   |
| ------------------------- | --------------------------------------------- |
| `AptosAccountAddressTool` | Tool for working with Aptos account addresses |
| `AptosBalanceTool`        | Tool for checking token balances              |
| `AptosTransactionTool`    | Tool for creating and submitting transactions |
| `AptosTransferTokenTool`  | Tool for transferring tokens between accounts |

## Token Management Tools

| Component                 | Description                           |
| ------------------------- | ------------------------------------- |
| `AptosBurnTokenTool`      | Tool for burning tokens               |
| `AptosCreateTokenTool`    | Tool for creating new tokens          |
| `AptosMintTokenTool`      | Tool for minting tokens               |
| `AptosGetTokenDetailTool` | Tool for retrieving token information |
| `AptosGetTokenPriceTool`  | Tool for getting token prices         |

## DeFi Protocol Tools

### Amnis Protocol

| Component                | Description                            |
| ------------------------ | -------------------------------------- |
| `AmnisStakeTool`         | Tool for staking in Amnis protocol     |
| `AmnisWithdrawStakeTool` | Tool for withdrawing stakes from Amnis |

### Echo Protocol

| Component              | Description                                  |
| ---------------------- | -------------------------------------------- |
| `EchoStakeTokenTool`   | Tool for staking tokens in Echo protocol     |
| `EchoUnstakeTokenTool` | Tool for unstaking tokens from Echo protocol |

### Joule Protocol

| Component                  | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `JouleBorrowTokenTool`     | Tool for borrowing tokens in Joule                   |
| `JouleLendTokenTool`       | Tool for lending tokens in Joule                     |
| `JouleRepayTokenTool`      | Tool for repaying loans in Joule                     |
| `JouleWithdrawTokenTool`   | Tool for withdrawing assets from Joule               |
| `JouleGetPoolDetails`      | Tool for retrieving pool information from Joule      |
| `JouleGetUserPosition`     | Tool for checking a user's position in Joule         |
| `JouleGetUserAllPositions` | Tool for retrieving all positions of a user in Joule |

### Echelon Protocol

| Component                  | Description                        |
| -------------------------- | ---------------------------------- |
| `EchelonBorrowTokenTool`   | Tool for borrowing in Echelon      |
| `EchelonLendTokenTool`     | Tool for lending in Echelon        |
| `EchelonRepayTokenTool`    | Tool for repaying loans in Echelon |
| `EchelonWithdrawTokenTool` | Tool for withdrawing from Echelon  |

### Aries Protocol

| Component                | Description                              |
| ------------------------ | ---------------------------------------- |
| `AriesBorrowTool`        | Tool for borrowing in Aries protocol     |
| `AriesLendTool`          | Tool for lending in Aries protocol       |
| `AriesRepayTool`         | Tool for repaying loans in Aries         |
| `AriesWithdrawTool`      | Tool for withdrawing from Aries          |
| `AriesCreateProfileTool` | Tool for creating user profiles in Aries |

### LiquidSwap DEX

| Component                       | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `LiquidSwapSwapTool`            | Tool for swapping tokens on LiquidSwap      |
| `LiquidSwapAddLiquidityTool`    | Tool for adding liquidity to LiquidSwap     |
| `LiquidSwapRemoveLiquidityTool` | Tool for removing liquidity from LiquidSwap |
| `LiquidSwapCreatePoolTool`      | Tool for creating token pools in LiquidSwap |

### Thala Protocol

| Component                  | Description                            |
| -------------------------- | -------------------------------------- |
| `ThalaStakeTokenTool`      | Tool for staking tokens in Thala       |
| `ThalaUnstakeTokenTool`    | Tool for unstaking tokens from Thala   |
| `ThalaAddLiquidityTool`    | Tool for adding liquidity to Thala     |
| `ThalaRemoveLiquidityTool` | Tool for removing liquidity from Thala |
| `ThalaMintMODTool`         | Tool for minting MOD tokens in Thala   |
| `ThalaRedeemMODTool`       | Tool for redeeming MOD tokens in Thala |

### Panora DEX

| Component        | Description                        |
| ---------------- | ---------------------------------- |
| `PanoraSwapTool` | Tool for swapping tokens on Panora |

## External Integrations

| Component               | Description                                 |
| ----------------------- | ------------------------------------------- |
| `OpenAICreateImageTool` | Tool for creating images using OpenAI's API |

## Using With Move AI Agents

### Authentication Setup

```javascript
// Using LocalSigner with a private key
import { LocalSigner } from "move-agent-kit";
import { AptosAccount, Network } from "@aptos-labs/ts-sdk";

// Load private key from environment variable or secure storage
const privateKey = process.env.APTOS_PRIVATE_KEY;
const account = new AptosAccount({ privateKey });
const signer = new LocalSigner(account, Network.MAINNET);

// Using WalletSigner with a wallet connection
import { WalletSigner } from "move-agent-kit";
const walletSigner = new WalletSigner(account, walletInstance, Network.MAINNET);
```

### Basic Aptos Operations

```javascript
import {
  AptosBalanceTool,
  AptosTransferTokenTool,
  createAptosTools,
} from "move-agent-kit";

// Create Aptos tools
const aptosTools = createAptosTools(signer);

// Check balance
const balance = await aptosTools.getBalance();
console.log(`Account balance: ${balance} APT`);

// Transfer tokens
const transferResult = await aptosTools.transferToken({
  amount: "1.5",
  recipient: "0x123...456",
  tokenAddress: "0x1::aptos_coin::AptosCoin",
});
console.log(`Transfer result: ${transferResult}`);
```

### Interacting with DeFi Protocols

```javascript
import { LiquidSwapSwapTool, ThalaStakeTokenTool } from "move-agent-kit";

// Set up tools
const liquidSwapTool = new LiquidSwapSwapTool(signer);
const thalaStakeTool = new ThalaStakeTokenTool(signer);

// Swap tokens on LiquidSwap
const swapResult = await liquidSwapTool.execute({
  fromToken: "0x1::aptos_coin::AptosCoin",
  toToken: "0x...::usdc::USDC",
  amount: "10",
});

// Stake tokens on Thala
const stakeResult = await thalaStakeTool.execute({
  amount: "100",
  tokenAddress: "0x...::thala::THALA",
});
```

## Security Considerations

1. **Private Key Management**: Secure your private keys properly, ideally using environment variables or secure storage solutions.

2. **Error Handling**: Always implement proper error handling for all blockchain operations.

3. **Gas Fees**: Account for transaction fees when performing operations.

4. **State Validation**: Verify blockchain state before and after operations to ensure expected outcomes.

5. **Rate Limiting**: Implement rate limiting for your agents to prevent API abuse.

## Best Practices

1. **Testing**: Test all operations on testnets before deploying to mainnet.

2. **Monitoring**: Implement monitoring for your agents to track operations and detect issues.

3. **Logging**: Log all operations for debugging and auditing purposes.

4. **Versioning**: Check the compatibility of the Move Agent Kit version with your targeted Aptos network.

5. **Updates**: Keep the toolkit updated to benefit from the latest features and security patches.
