import {
  Account,
  AccountAddressInput,
  Aptos,
  AptosConfig,
  Network as AptosNetwork,
} from "@aptos-labs/ts-sdk";

// Define our own Network enum for compatibility
export enum Network {
  DEVNET = "devnet",
  TESTNET = "testnet",
  MAINNET = "mainnet",
}

export class PayMasterAgent {
  private account: Account;
  private client: Aptos;
  private baseAddress: string;

  constructor(account: Account, network: Network = Network.TESTNET) {
    this.account = account;

    // Map our Network enum to AptosNetwork
    const aptosNetwork =
      network === Network.MAINNET
        ? AptosNetwork.MAINNET
        : network === Network.TESTNET
        ? AptosNetwork.TESTNET
        : AptosNetwork.DEVNET;

    // Initialize Aptos client
    const config = new AptosConfig({ network: aptosNetwork });
    this.client = new Aptos(config);

    this.baseAddress =
      "0x598a188bf6a32b61e7508acc4b2fc672ae7d953aba5ccb46976e6bee4814efbf";
  }

  /**
   * Initialize payment schedules for the current account
   * @param coinType The type of coin to use for payments
   */
  async initializePaymentSchedules(
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::payment_automation::initialize_payment_schedules`,
          typeArguments: [coinType],
          functionArguments: [],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(
        `Failed to initialize payment schedules: ${error.message}`
      );
    }
  }

  /**
   * Create a scheduled payment
   * @param recipient Recipient address
   * @param amount Amount to send
   * @param intervalSeconds Interval between payments in seconds
   * @param startTime Optional start time (Unix timestamp)
   * @param coinType The type of coin to use
   */
  async createScheduledPayment(
    recipient: string,
    amount: string,
    intervalSeconds: number,
    startTime: number = 0,
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::payment_automation::create_scheduled_payment`,
          typeArguments: [coinType],
          functionArguments: [
            recipient,
            amount,
            intervalSeconds.toString(),
            startTime.toString(),
          ],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to create scheduled payment: ${error.message}`);
    }
  }

  /**
   * Cancel a scheduled payment
   * @param paymentId The ID of the payment to cancel
   * @param coinType The type of coin used for the payment
   */
  async cancelScheduledPayment(
    paymentId: number,
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::payment_automation::cancel_scheduled_payment`,
          typeArguments: [coinType],
          functionArguments: [paymentId.toString()],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to cancel scheduled payment: ${error.message}`);
    }
  }

  /**
   * Execute a pending payment
   * @param payer The address of the payer
   * @param paymentId The ID of the payment to execute
   * @param coinType The type of coin used for the payment
   */
  async executePayment(
    payer: string,
    paymentId: number,
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::payment_automation::execute_payment`,
          typeArguments: [coinType],
          functionArguments: [payer, paymentId.toString()],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to execute payment: ${error.message}`);
    }
  }

  /**
   * Initialize yield strategies for the current account
   * @param coinType The type of coin to use
   */
  async initializeYieldStrategies(
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::yield_optimizer::initialize_yield_strategies`,
          typeArguments: [coinType],
          functionArguments: [],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(
        `Failed to initialize yield strategies: ${error.message}`
      );
    }
  }

  /**
   * Create a yield strategy
   * @param protocolId Protocol ID (1=Thala, 2=Aries, 3=Momentum)
   * @param targetPercentage Percentage of idle funds to allocate (basis points, 10000 = 100%)
   * @param minIdleAmount Minimum amount of idle funds to trigger allocation
   * @param coinType The type of coin to use
   */
  async createYieldStrategy(
    protocolId: number,
    targetPercentage: number,
    minIdleAmount: string,
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::yield_optimizer::create_yield_strategy`,
          typeArguments: [coinType],
          functionArguments: [
            protocolId.toString(),
            targetPercentage.toString(),
            minIdleAmount,
          ],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to create yield strategy: ${error.message}`);
    }
  }

  /**
   * Allocate idle funds according to a strategy
   * @param strategyId The ID of the strategy to use
   * @param amount Amount to allocate
   * @param coinType The type of coin to use
   */
  async allocateIdleFunds(
    strategyId: number,
    amount: string,
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::yield_optimizer::allocate_idle_funds`,
          typeArguments: [coinType],
          functionArguments: [strategyId.toString(), amount],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to allocate idle funds: ${error.message}`);
    }
  }

  /**
   * Initialize risk profile for the current account
   */
  async initializeRiskProfile(): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::risk_manager::initialize_risk_profile`,
          typeArguments: [],
          functionArguments: [],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to initialize risk profile: ${error.message}`);
    }
  }

  /**
   * Update risk thresholds
   * @param riskType Risk type (1=Liquidity, 2=Collateral, 3=Liquidation)
   * @param mediumThreshold Medium risk threshold
   * @param highThreshold High risk threshold
   * @param criticalThreshold Critical risk threshold
   */
  async updateRiskThreshold(
    riskType: number,
    mediumThreshold: number,
    highThreshold: number,
    criticalThreshold: number
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::risk_manager::update_risk_threshold`,
          typeArguments: [],
          functionArguments: [
            riskType.toString(),
            mediumThreshold.toString(),
            highThreshold.toString(),
            criticalThreshold.toString(),
          ],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to update risk threshold: ${error.message}`);
    }
  }

  /**
   * Update minimum liquidity requirement
   * @param minLiquidityRequirement Minimum liquidity required
   */
  async updateMinLiquidityRequirement(
    minLiquidityRequirement: string
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${this.baseAddress}::risk_manager::update_min_liquidity_requirement`,
          typeArguments: [],
          functionArguments: [minLiquidityRequirement],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(
        `Failed to update minimum liquidity requirement: ${error.message}`
      );
    }
  }

  /**
   * Check account balance
   * @param coinType The type of coin to check
   */
  async getBalance(
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      const resources = await this.client.account.getAccountResources({
        accountAddress: this.account.accountAddress,
      });

      const resourceType = `0x1::coin::CoinStore<${coinType}>`;
      const resource = resources.find((r) => r.type === resourceType);

      if (!resource) {
        return "0"; // Coin not found in account
      }

      return (resource.data as any).coin.value;
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Transfer tokens directly (not using scheduled payments)
   * @param recipient Recipient address
   * @param amount Amount to send
   * @param coinType The type of coin to send
   */
  async transferTokens(
    recipient: string,
    amount: string,
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      // 1. Build the transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: "0x1::coin::transfer",
          typeArguments: [coinType],
          functionArguments: [recipient, amount],
        },
      });

      // 2. Sign the transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.account,
        transaction,
      });

      // 3. Submit the transaction
      const submittedTransaction = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      return submittedTransaction.hash;
    } catch (error: any) {
      throw new Error(`Failed to transfer tokens: ${error.message}`);
    }
  }
}
