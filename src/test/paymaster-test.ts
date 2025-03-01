import { AptosAccount, Network, AptosClient } from "@aptos-labs/ts-sdk";
import { PayMasterAgent } from "../tools/paymaster/PayMasterAgent";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testPayMasterModules() {
  console.log("Testing PayMaster Module Interactions");

  try {
    // Create a client connected to the testnet
    const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");

    // Create an account from private key (should be in .env file)
    // NEVER hardcode private keys in production code
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Private key not found in environment variables");
    }

    const account = AptosAccount.fromPrivateKey({ privateKey });
    console.log(`Using account: ${account.accountAddress.toString()}`);

    // Initialize the PayMaster agent
    const paymaster = new PayMasterAgent(account);

    // Test account balance
    const balance = await paymaster.getBalance();
    console.log(`Account balance: ${balance} APT`);

    // Initialize payment schedules
    console.log("Initializing payment schedules...");
    const initTxn = await paymaster.initializePaymentSchedules();
    console.log(`Transaction hash: ${initTxn}`);

    // Initialize risk profile
    console.log("Initializing risk profile...");
    const riskTxn = await paymaster.initializeRiskProfile();
    console.log(`Transaction hash: ${riskTxn}`);

    // Initialize yield strategies
    console.log("Initializing yield strategies...");
    const yieldTxn = await paymaster.initializeYieldStrategies();
    console.log(`Transaction hash: ${yieldTxn}`);

    console.log("All tests completed successfully!");
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

// Run the test
testPayMasterModules();
