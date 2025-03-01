#!/usr/bin/env node

import AptosWalletManager from './index.js';
import { Network } from '@aptos-labs/ts-sdk';
import readlineSync from 'readline-sync';

/**
 * Main function to run the CLI
 */
async function main() {
  try {
    console.log('Initializing Aptos Wallet Manager...');
    
    // Initialize the wallet manager (default to TESTNET for safety)
    const success = await AptosWalletManager.initialize(Network.TESTNET);
    
    if (!success) {
      console.error('Failed to initialize wallet manager. Check your .env file and network connection.');
      process.exit(1);
    }
    
    // Get and display account address
    const address = AptosWalletManager.getAccountAddress();
    console.log(`Connected to account: ${address}`);
    
    // Get and display account balance
    console.log('Fetching account balance...');
    const balance = await AptosWalletManager.getBalance();
    
    if (balance !== null) {
      console.log(`Account balance: ${balance} APT`);
    } else {
      console.error('Failed to fetch account balance.');
      process.exit(1);
    }
    
    // Display main menu
    const options = [
      'Check my balance',
      'Check another address balance',
      'Transfer APT tokens',
      'Exit'
    ];
    
    const index = readlineSync.keyInSelect(options, 'What would you like to do?');
    
    // Handle user choice
    switch (index) {
      case 0: // Check my balance - already displayed above
        break;
        
      case 1: // Check another address balance
        const targetAddress = readlineSync.question('Enter the address to check: ');
        if (!targetAddress) {
          console.error('Address cannot be empty.');
          break;
        }
        
        console.log(`Fetching balance for address: ${targetAddress}`);
        const otherBalance = await AptosWalletManager.getBalance(targetAddress);
        
        if (otherBalance !== null) {
          console.log(`Balance for ${targetAddress}: ${otherBalance} APT`);
        } else {
          console.error(`Failed to fetch balance for ${targetAddress}`);
        }
        break;
        
      case 2: // Transfer APT tokens
        // Ask for recipient address or use predefined one
        let useDefault = readlineSync.keyInYNStrict('Use predefined address (0x598a188bf6a32b61e7508acc4b2fc672ae7d953aba5ccb46976e6bee4814efbf)?');
        let recipientAddress;
        
        if (useDefault) {
          recipientAddress = "0x598a188bf6a32b61e7508acc4b2fc672ae7d953aba5ccb46976e6bee4814efbf";
        } else {
          recipientAddress = readlineSync.question('Enter recipient address: ');
          if (!recipientAddress) {
            console.error('Recipient address cannot be empty.');
            break;
          }
        }
        
        // Ask for amount
        const amountInput = readlineSync.question(`Enter amount to transfer (current balance: ${balance} APT): `);
        const amount = parseFloat(amountInput);
        
        if (isNaN(amount) || amount <= 0) {
          console.error('Invalid amount. Please enter a positive number.');
          break;
        }
        
        if (amount > balance) {
          console.error(`Insufficient balance. You only have ${balance} APT.`);
          break;
        }
        
        // Confirm the transaction
        const confirmation = readlineSync.keyInYNStrict(`Confirm transfer of ${amount} APT to ${recipientAddress}?`);
        
        if (confirmation) {
          console.log(`Transferring ${amount} APT to ${recipientAddress}...`);
          try {
            const result = await AptosWalletManager.transferTokens(recipientAddress, amount);
            console.log('Transfer successful!');
            console.log('Transaction details:', result);
            
            // Check new balance
            console.log('Fetching updated balance...');
            const newBalance = await AptosWalletManager.getBalance();
            console.log(`New balance: ${newBalance} APT`);
          } catch (transferError) {
            console.error('Transfer failed:', transferError.message);
          }
        } else {
          console.log('Transfer cancelled by user.');
        }
        break;
        
      case 3: // Exit
      default:
        console.log('Goodbye!');
        break;
    }
    
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 