import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AptosConfig, Network, Aptos, Ed25519PrivateKey, PrivateKey, PrivateKeyVariants } from '@aptos-labs/ts-sdk';
import { LocalSigner, AgentRuntime, createAptosTools } from 'move-agent-kit';

// Get current directory and resolve path to .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * A class to manage Aptos wallet connections and operations
 */
export class AptosWalletManager {
  constructor() {
    this.aptos = null;
    this.account = null;
    this.agent = null;
    this.tools = null;
  }

  /**
   * Initialize the connection to Aptos
   * @param {string} network - The network to connect to (default: TESTNET)
   * @returns {Promise<boolean>} - True if initialization is successful
   */
  async initialize(network = Network.TESTNET) {
    try {
      // Create Aptos configuration
      const aptosConfig = new AptosConfig({
        network,
      });

      // Initialize Aptos client
      this.aptos = new Aptos(aptosConfig);

      // Derive account from private key
      this.account = await this.aptos.deriveAccountFromPrivateKey({
        privateKey: new Ed25519PrivateKey(
          PrivateKey.formatPrivateKey(
            process.env.APTOS_PRIVATE_KEY,
            PrivateKeyVariants.Ed25519,
          ),
        ),
      });

      // Initialize the agent
      const signer = new LocalSigner(this.account, network);
      this.agent = new AgentRuntime(signer, this.aptos, {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY
      });
      
      // Create tools
      this.tools = createAptosTools(this.agent);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Aptos connection:', error);
      return false;
    }
  }

  /**
   * Get the balance of an Aptos account
   * @param {string} address - The account address (defaults to the initialized account)
   * @returns {Promise<number|null>} - The account balance or null if there was an error
   */
  async getBalance(address = null) {
    try {
      if (!this.aptos) {
        throw new Error('Aptos client not initialized. Call initialize() first.');
      }

      const targetAddress = address || this.account.accountAddress.toString();
      console.log(`Requesting balance for address: ${targetAddress}`);
      
      // Get APT coin type
      const coinType = "0x1::aptos_coin::AptosCoin";
      
      // Fetch account resources
      const resources = await this.aptos.getAccountResources({
        accountAddress: targetAddress
      });
      
      // Find the coin resource
      const accountResource = resources.find((r) => r.type === `0x1::coin::CoinStore<${coinType}>`);
      
      if (accountResource) {
        const balance = BigInt(accountResource.data.coin.value) / BigInt(100000000); // Convert from octas to APT
        return Number(balance);
      } else {
        console.log("Coin resource not found, account may have 0 balance");
        return 0;
      }
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return null;
    }
  }

  /**
   * Get the account address
   * @returns {string|null} - The account address or null if not initialized
   */
  getAccountAddress() {
    if (!this.account) {
      return null;
    }
    return this.account.accountAddress.toString();
  }

  /**
   * Transfer tokens to another address
   * @param {string} toAddress - The recipient address
   * @param {number} amount - Amount to transfer
   * @returns {Promise<any>} - Transaction result
   */
  async transferTokens(toAddress, amount) {
    try {
      if (!this.agent) {
        throw new Error('Agent not initialized. Call initialize() first.');
      }
      
      console.log(`Preparing to transfer ${amount} APT to ${toAddress}`);
      
      // Make sure the toAddress has the '0x' prefix
      const formattedAddress = toAddress.startsWith('0x') ? toAddress : `0x${toAddress}`;
      
      // The third parameter is the mint/token type, which is required
      // For APT tokens, the standard mint address is:
      const aptMint = "0x1::aptos_coin::AptosCoin";
      
      console.log(`Using token type: ${aptMint}`);
      
      // Call the agent's transferTokens method with all three parameters
      const result = await this.agent.transferTokens(formattedAddress, amount, aptMint);
      
      return result;
    } catch (error) {
      console.error('Failed to transfer tokens:', error);
      throw error;
    }
  }
}

// Export a default instance
export default new AptosWalletManager();
