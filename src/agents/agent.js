#!/usr/bin/env node

import AptosWalletManager from './index.js';
import { Network } from '@aptos-labs/ts-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOG_FILE = path.join(__dirname, 'payment_log.json');

// List of recipients with payment details
const PAYMENT_RECIPIENTS = [
  {
    address: "0x598a188bf6a32b61e7508acc4b2fc672ae7d953aba5ccb46976e6bee4814efbf",
    amount: 0.1,  // Amount in APT
    name: "Recipient 1",
    priority: "high" // Options: "high", "medium", "low"
  },
  // Add more recipients as needed
  // {
  //   address: "0xANOTHER_ADDRESS",
  //   amount: 0.2,
  //   name: "Recipient 2",
  //   priority: "medium"
  // }
];

/**
 * Payment Agent that automatically processes payments using LangChain and Gemini
 */
class AIPaymentAgent {
  constructor() {
    // Use the imported AptosWalletManager instance from index.js
    this.walletManager = AptosWalletManager;
    this.isInitialized = false;
    this.paymentLog = this.loadPaymentLog();
    this.initializeLangChain();
  }

  /**
   * Initialize LangChain with Gemini
   */
  initializeLangChain() {
    // Make sure GEMINI_API_KEY is set in .env file
    if (!process.env.GEMINI_API_KEY) {
      console.error("Error: GEMINI_API_KEY not found in environment variables");
      process.exit(1);
    }

    // Initialize Gemini model
    this.model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "gemini-2.0-flash",
      temperature: 0.1,
    });

    // Create a structured output parser for payment decisions
    this.paymentDecisionParser = StructuredOutputParser.fromZodSchema(
      z.object({
        shouldPay: z.boolean().describe("Whether this payment should be processed now"),
        reason: z.string().describe("Reason for the decision"),
        priority: z.number().min(1).max(10).describe("Payment priority score (1-10)"),
      })
    );

    // Create a prompt template for payment decisions
    const paymentDecisionPrompt = PromptTemplate.fromTemplate(`
      You are an AI payment agent responsible for making decisions about cryptocurrency payments.
      
      Current wallet balance: {balance} APT
      
      Payment request:
      - Recipient: {recipientName} ({recipientAddress})
      - Amount: {amount} APT
      - Priority: {priority}
      
      Payment history:
      {paymentHistory}
      
      Based on the information above, decide if this payment should be processed now.
      Consider the wallet balance, payment amount, priority, and history.
      
      If the wallet doesn't have enough balance, the payment shouldn't proceed.
      If the priority is high, it should generally be processed immediately.
      
      {formatInstructions}
    `);

    // Create the payment decision chain
    this.paymentDecisionChain = RunnableSequence.from([
      paymentDecisionPrompt,
      this.model,
      new StringOutputParser(),
      this.paymentDecisionParser,
    ]);
  }

  /**
   * Load payment logs from file
   */
  loadPaymentLog() {
    try {
      if (fs.existsSync(LOG_FILE)) {
        const logData = fs.readFileSync(LOG_FILE, 'utf8');
        return JSON.parse(logData);
      }
    } catch (error) {
      console.error('Error loading payment log:', error);
    }
    return { payments: [] };
  }

  /**
   * Save payment logs to file
   */
  savePaymentLog() {
    try {
      fs.writeFileSync(LOG_FILE, JSON.stringify(this.paymentLog, null, 2));
    } catch (error) {
      console.error('Error saving payment log:', error);
    }
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      console.log('Initializing AI Payment Agent...');
      
      // Use walletManager.initialize directly from the imported instance
      const success = await this.walletManager.initialize(Network.TESTNET);
      
      if (!success) {
        throw new Error('Failed to initialize wallet manager');
      }
      
      this.isInitialized = true;
      
      // Get wallet address and balance using imported methods
      const address = this.walletManager.getAccountAddress();
      const balance = await this.walletManager.getBalance();
      
      console.log(`Agent initialized with wallet: ${address}`);
      console.log(`Current balance: ${balance} APT`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      return false;
    }
  }

  /**
   * Get payment history for a recipient formatted for AI context
   */
  getPaymentHistoryForRecipient(recipientAddress) {
    const payments = this.paymentLog.payments
      .filter(p => p.recipientAddress === recipientAddress)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5); // Get last 5 payments
    
    if (payments.length === 0) {
      return "No previous payments to this recipient.";
    }
    
    return payments.map(p => {
      const date = new Date(p.timestamp).toLocaleDateString();
      const status = p.success ? "SUCCESS" : "FAILED";
      return `- ${date}: ${p.amount} APT (${status}) - ${p.success ? `TX: ${p.txHash.substring(0, 10)}...` : p.error}`;
    }).join("\n");
  }

  /**
   * Get the last payment made to an address
   */
  getLastPayment(address) {
    const payments = this.paymentLog.payments.filter(p => p.recipientAddress === address);
    if (payments.length === 0) return null;
    
    // Sort by timestamp descending
    payments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return payments[0];
  }

  /**
   * Process a single payment to a recipient using AI decision making
   */
  async processPayment(recipient) {
    try {
      if (!this.isInitialized) {
        throw new Error('Agent not initialized');
      }
      
      // Get current balance using the imported getBalance method
      const currentBalance = await this.walletManager.getBalance();
      if (currentBalance < recipient.amount) {
        const error = `Insufficient balance. Required: ${recipient.amount} APT, Available: ${currentBalance} APT`;
        console.error(error);
        return { success: false, reason: 'insufficient_balance', error };
      }
      
      // Get payment history for this recipient
      const paymentHistory = this.getPaymentHistoryForRecipient(recipient.address);
      
      // Ask AI for decision using LangChain
      const aiDecision = await this.paymentDecisionChain.invoke({
        balance: currentBalance,
        recipientName: recipient.name,
        recipientAddress: recipient.address,
        amount: recipient.amount,
        priority: recipient.priority,
        paymentHistory: paymentHistory,
        formatInstructions: this.paymentDecisionParser.getFormatInstructions(),
      });
      
      console.log(`AI decision for ${recipient.name}:`, aiDecision);
      
      // If AI decides not to pay, log and return
      if (!aiDecision.shouldPay) {
        console.log(`Payment to ${recipient.name} (${recipient.address}) skipped: ${aiDecision.reason}`);
        return { 
          success: false, 
          reason: 'ai_decision', 
          aiDecision 
        };
      }
      
      // If AI approves, process the payment
      console.log(`Processing payment of ${recipient.amount} APT to ${recipient.name} (${recipient.address})...`);
      
      // Use the imported transferTokens method
      const result = await this.walletManager.transferTokens(recipient.address, recipient.amount);
      
      // Log the payment
      const paymentRecord = {
        recipientAddress: recipient.address,
        recipientName: recipient.name,
        amount: recipient.amount,
        timestamp: new Date().toISOString(),
        txHash: result,
        aiReason: aiDecision.reason,
        aiPriority: aiDecision.priority,
        success: true
      };
      
      this.paymentLog.payments.push(paymentRecord);
      this.savePaymentLog();
      
      console.log(`Payment to ${recipient.name} successful. Transaction: ${result}`);
      return { 
        success: true, 
        txHash: result,
        aiDecision 
      };
    } catch (error) {
      console.error(`Payment to ${recipient.name} failed:`, error);
      
      // Log the failed payment
      const failedPaymentRecord = {
        recipientAddress: recipient.address,
        recipientName: recipient.name,
        amount: recipient.amount,
        timestamp: new Date().toISOString(),
        error: error.message,
        success: false
      };
      
      this.paymentLog.payments.push(failedPaymentRecord);
      this.savePaymentLog();
      
      return { success: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Process all payments with AI prioritization
   */
  async processAllPayments() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      console.log('Starting AI-powered payment processing cycle...');
      
      const results = [];
      let totalPaid = 0;
      let successCount = 0;
      
      // Process each recipient
      for (const recipient of PAYMENT_RECIPIENTS) {
        const result = await this.processPayment(recipient);
        results.push({ recipient: recipient.name, ...result });
        
        if (result.success) {
          totalPaid += recipient.amount;
          successCount++;
        }
      }
      
      console.log(`Payment cycle completed. Successfully paid ${successCount} of ${PAYMENT_RECIPIENTS.length} recipients.`);
      console.log(`Total amount paid: ${totalPaid} APT`);
      
      // Get updated balance using imported method
      const newBalance = await this.walletManager.getBalance();
      console.log(`Current balance: ${newBalance} APT`);
      
      return results;
    } catch (error) {
      console.error('Failed to process payments:', error);
      return [];
    }
  }

  /**
   * Generate a payment summary report using AI
   */
  async generatePaymentReport() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Get wallet status using imported methods
      const address = this.walletManager.getAccountAddress();
      const balance = await this.walletManager.getBalance();
      
      // Get payment stats
      const totalPayments = this.paymentLog.payments.length;
      const successfulPayments = this.paymentLog.payments.filter(p => p.success).length;
      const failedPayments = totalPayments - successfulPayments;
      
      // Calculate total spent
      const totalSpent = this.paymentLog.payments
        .filter(p => p.success)
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Create report prompt
      const reportPrompt = PromptTemplate.fromTemplate(`
        Generate a concise payment report for an Aptos wallet.
        
        Wallet Address: {address}
        Current Balance: {balance} APT
        
        Payment Statistics:
        - Total Payments: {totalPayments}
        - Successful: {successfulPayments}
        - Failed: {failedPayments}
        - Total APT Spent: {totalSpent}
        
        Recent transactions:
        {recentTransactions}
        
        Generate a professional financial report with insights about the payment patterns, 
        recommendations for future payments, and any potential issues to address.
      `);
      
      // Format recent transactions
      const recentTransactions = this.paymentLog.payments
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(p => {
          const date = new Date(p.timestamp).toLocaleDateString();
          const status = p.success ? "SUCCESS" : "FAILED";
          return `- ${date}: ${p.amount} APT to ${p.recipientName} (${status})`;
        }).join("\n");
      
      // Create and execute the chain
      const reportChain = RunnableSequence.from([
        reportPrompt,
        this.model,
        new StringOutputParser(),
      ]);
      
      const report = await reportChain.invoke({
        address,
        balance,
        totalPayments,
        successfulPayments,
        failedPayments,
        totalSpent,
        recentTransactions
      });
      
      console.log("\n========== AI PAYMENT REPORT ==========\n");
      console.log(report);
      console.log("\n=======================================\n");
      
      return report;
    } catch (error) {
      console.error('Failed to generate payment report:', error);
      return "Error generating payment report.";
    }
  }

  /**
   * Run a one-time payment cycle
   */
  async runOnce() {
    // Initialize if needed
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) {
        console.error('Failed to initialize payment agent');
        process.exit(1);
      }
    }
    
    // Process all payments
    await this.processAllPayments();
    
    // Generate a report
    await this.generatePaymentReport();
    
    console.log('One-time payment cycle completed.');
  }
}

// Create an instance of the payment agent
const agent = new AIPaymentAgent();

// Handle command-line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  if (command === 'run') {
    // Run one payment cycle
    agent.runOnce().then(() => process.exit(0));
  } else if (command === 'report') {
    // Generate report only
    agent.initialize().then(() => {
      agent.generatePaymentReport().then(() => process.exit(0));
    });
  } else {
    console.log('Usage:');
    console.log('  node agent.js run     - Run payment processing with AI decision-making');
    console.log('  node agent.js report  - Generate AI payment report');
  }
} else {
  // Default to run
  agent.runOnce().then(() => process.exit(0));
}

export default AIPaymentAgent; 