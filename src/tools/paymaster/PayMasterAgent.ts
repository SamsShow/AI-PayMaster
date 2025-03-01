import {
  LocalSigner,
  createAptosTools,
  AptosBalanceTool,
  AptosTransactionTool,
  AptosTransferTokenTool,
} from "move-agent-kit";
import { AptosAccount, Network } from "@aptos-labs/ts-sdk";

// Specific protocol imports if we had them
// import { ThalaStakeTokenTool, AriesLendTool } from "move-agent-kit";

export class PayMasterAgent {
  private signer: LocalSigner;
  private aptosTools: any;
  private baseAddress: string;

  constructor(account: AptosAccount, network = Network.TESTNET) {
    this.signer = new LocalSigner(account, network);
    this.aptosTools = createAptosTools(this.signer);
    this.baseAddress = "0x1"; // Will be replaced with actual deployed module address
  }

  /**
   * Initialize payment schedules for the current account
   * @param coinType The type of coin to use for payments
   */
  async initializePaymentSchedules(
    coinType: string = "0x1::aptos_coin::AptosCoin"
  ): Promise<string> {
    try {
      const transaction = {
        function: `${this.baseAddress}::payment_automation::initialize_payment_schedules`,
        type_arguments: [coinType],
        arguments: [],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::payment_automation::create_scheduled_payment`,
        type_arguments: [coinType],
        arguments: [
          recipient,
          amount,
          intervalSeconds.toString(),
          startTime.toString(),
        ],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::payment_automation::cancel_scheduled_payment`,
        type_arguments: [coinType],
        arguments: [paymentId.toString()],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::payment_automation::execute_payment`,
        type_arguments: [coinType],
        arguments: [payer, paymentId.toString()],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::yield_optimizer::initialize_yield_strategies`,
        type_arguments: [coinType],
        arguments: [],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::yield_optimizer::create_yield_strategy`,
        type_arguments: [coinType],
        arguments: [
          protocolId.toString(),
          targetPercentage.toString(),
          minIdleAmount,
        ],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::yield_optimizer::allocate_idle_funds`,
        type_arguments: [coinType],
        arguments: [strategyId.toString(), amount],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
    } catch (error: any) {
      throw new Error(`Failed to allocate idle funds: ${error.message}`);
    }
  }

  /**
   * Initialize risk profile for the current account
   */
  async initializeRiskProfile(): Promise<string> {
    try {
      const transaction = {
        function: `${this.baseAddress}::risk_manager::initialize_risk_profile`,
        type_arguments: [],
        arguments: [],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::risk_manager::update_risk_threshold`,
        type_arguments: [],
        arguments: [
          riskType.toString(),
          mediumThreshold.toString(),
          highThreshold.toString(),
          criticalThreshold.toString(),
        ],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const transaction = {
        function: `${this.baseAddress}::risk_manager::update_min_liquidity_requirement`,
        type_arguments: [],
        arguments: [minLiquidityRequirement],
      };

      const txnTool = new AptosTransactionTool(this.signer);
      const result = await txnTool.execute(transaction);
      return result.hash;
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
      const balanceTool = new AptosBalanceTool(this.signer);
      const balance = await balanceTool.execute({
        coinType: coinType,
      });
      return balance;
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
      const transferTool = new AptosTransferTokenTool(this.signer);
      const result = await transferTool.execute({
        recipient,
        amount,
        tokenAddress: coinType,
      });
      return result.hash;
    } catch (error: any) {
      throw new Error(`Failed to transfer tokens: ${error.message}`);
    }
  }
}
