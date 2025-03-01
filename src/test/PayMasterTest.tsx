import { useState, useEffect } from "react";
import { PayMasterAgent, Network } from "../tools/paymaster/PayMasterAgent";
import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";
import { AIYieldOptimizer, StrategyRecommendation } from "../tools/paymaster/AIYieldOptimizer";
import { RiskAssessmentEngine, RiskAssessment } from "../tools/paymaster/RiskAssessmentEngine";
import React from "react";

// Test component for PayMaster system
export default function PayMasterTestUI() {
  // State management
  const [account, setAccount] = useState<Account | null>(null);
  const [agent, setAgent] = useState<PayMasterAgent | null>(null);
  const [yieldOptimizer, setYieldOptimizer] = useState<AIYieldOptimizer | null>(
    null
  );
  const [riskEngine, setRiskEngine] = useState<RiskAssessmentEngine | null>(
    null
  );

  // Transaction states
  const [txnHash, setTxnHash] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Form states
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("10");
  const [paymentInterval, setPaymentInterval] = useState<number>(86400); // 1 day in seconds

  // Yield strategy states
  const [riskPreference, setRiskPreference] = useState<number>(5);
  const [strategies, setStrategies] = useState<StrategyRecommendation[]>([]);

  // Risk assessment state
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(
    null
  );

  // Initialize with a test account
  useEffect(() => {
    const initializeAccount = async () => {
      try {
        // For testing purposes, generate a new account
        // In production, you would integrate with a wallet
        const privateKeyBytes = new Uint8Array(32);
        window.crypto.getRandomValues(privateKeyBytes);

        // Create account from random private key
        const privateKey = new Ed25519PrivateKey(privateKeyBytes);
        const newAccount = Account.fromPrivateKey({ privateKey });

        setAccount(newAccount);

        // Create agent instances
        const payMasterAgent = new PayMasterAgent(newAccount);
        const aiOptimizer = new AIYieldOptimizer(riskPreference);
        const riskAssessmentEngine = new RiskAssessmentEngine();

        setAgent(payMasterAgent);
        setYieldOptimizer(aiOptimizer);
        setRiskEngine(riskAssessmentEngine);

        console.log(
          "Account initialized with address:",
          newAccount.accountAddress
        );
      } catch (err: any) {
        setError(`Failed to initialize account: ${err.message}`);
        console.error("Account initialization error:", err);
      }
    };

    initializeAccount();
  }, []);

  // Initialize PayMaster components
  const initializePaymentSchedules = async () => {
    if (!agent) return;

    setLoading(true);
    setError("");

    try {
      const hash = await agent.initializePaymentSchedules();
      setTxnHash(hash);
      console.log("Payment schedules initialized:", hash);
    } catch (err: any) {
      setError(`Failed to initialize payment schedules: ${err.message}`);
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create a scheduled payment
  const createScheduledPayment = async () => {
    if (!agent || !recipientAddress || !paymentAmount) return;

    setLoading(true);
    setError("");

    try {
      const hash = await agent.createScheduledPayment(
        recipientAddress,
        paymentAmount,
        paymentInterval,
        0 // Start time (0 means start now)
      );
      setTxnHash(hash);
      console.log("Payment scheduled:", hash);
    } catch (err: any) {
      setError(`Failed to create payment: ${err.message}`);
      console.error("Payment creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize risk profile
  const initializeRiskProfile = async () => {
    if (!agent) return;

    setLoading(true);
    setError("");

    try {
      const hash = await agent.initializeRiskProfile();
      setTxnHash(hash);
      console.log("Risk profile initialized:", hash);
    } catch (err: any) {
      setError(`Failed to initialize risk profile: ${err.message}`);
      console.error("Risk profile initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get yield optimization recommendations
  const getYieldRecommendations = async () => {
    if (!yieldOptimizer) return;

    try {
      // For demo purposes, hardcoded available funds
      const availableFunds = "1000";

      // Update risk preference
      yieldOptimizer.setRiskPreference(riskPreference);

      // Get recommendations
      const recommendations = yieldOptimizer.optimizeAllocation(availableFunds);
      setStrategies(recommendations);
      console.log("Yield recommendations:", recommendations);
    } catch (err: any) {
      setError(`Failed to get yield recommendations: ${err.message}`);
      console.error("Yield optimization error:", err);
    }
  };

  // Assess risk
  const performRiskAssessment = async () => {
    if (!riskEngine) return;

    try {
      // For demo purposes, hardcoded available liquidity
      const availableLiquidity = "500";

      // Perform risk assessment
      const assessment = riskEngine.performRiskAssessment(availableLiquidity);
      setRiskAssessment(assessment);
      console.log("Risk assessment:", assessment);
    } catch (err: any) {
      setError(`Failed to perform risk assessment: ${err.message}`);
      console.error("Risk assessment error:", err);
    }
  };

  // Format blockchain addresses for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PayMaster Test Dashboard</h1>

      {/* Account Information */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Account Information</h2>
        {account ? (
          <div>
            <p>
              <strong>Address:</strong> {formatAddress(account.accountAddress.toString())}
            </p>
          </div>
        ) : (
          <p>Initializing account...</p>
        )}
      </div>

      {/* Initialization Controls */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Setup & Initialization</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={initializePaymentSchedules}
            disabled={loading || !agent}
            className={`px-4 py-2 rounded ${
              loading ? "bg-gray-300" : "bg-blue-500 text-white"
            }`}
          >
            Initialize Payment Schedules
          </button>

          <button
            onClick={initializeRiskProfile}
            disabled={loading || !agent}
            className={`px-4 py-2 rounded ${
              loading ? "bg-gray-300" : "bg-blue-500 text-white"
            }`}
          >
            Initialize Risk Profile
          </button>
        </div>
      </div>

      {/* Payment Creation */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Create Scheduled Payment</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-1">Recipient Address:</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0x..."
            />
          </div>

          <div>
            <label className="block mb-1">Payment Amount (APT):</label>
            <input
              type="text"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-1">Payment Interval (seconds):</label>
            <select
              value={paymentInterval}
              onChange={(e) => setPaymentInterval(Number(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value={86400}>Daily (1 day)</option>
              <option value={604800}>Weekly (7 days)</option>
              <option value={2592000}>Monthly (30 days)</option>
            </select>
          </div>

          <button
            onClick={createScheduledPayment}
            disabled={loading || !agent || !recipientAddress}
            className={`px-4 py-2 rounded ${
              loading || !recipientAddress
                ? "bg-gray-300"
                : "bg-green-500 text-white"
            }`}
          >
            Create Payment
          </button>
        </div>
      </div>

      {/* Yield Optimization */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Yield Optimization</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-1">Risk Preference (1-10):</label>
            <input
              type="range"
              min="1"
              max="10"
              value={riskPreference}
              onChange={(e) => setRiskPreference(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm">
              <span>Conservative (1)</span>
              <span>Balanced (5)</span>
              <span>Aggressive (10)</span>
            </div>
          </div>
          <button
            onClick={getYieldRecommendations}
            disabled={!yieldOptimizer}
            className={`px-4 py-2 rounded ${
              !yieldOptimizer ? "bg-gray-300" : "bg-purple-500 text-white"
            }`}
          >
            Get Yield Recommendations
          </button>

          {strategies.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Recommended Strategies:</h3>
              <div className="space-y-3">
                {strategies.map((strategy, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded">
                    <p>
                      <strong>{strategy.protocolName}</strong> (
                      {strategy.allocationPercentage}%)
                    </p>
                    <p>
                      Expected APY: {strategy.expectedApy}% | Risk:{" "}
                      {strategy.riskLevel}
                    </p>
                    <p className="text-sm text-gray-600">{strategy.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Risk Assessment</h2>
        <button
          onClick={performRiskAssessment}
          disabled={!riskEngine}
          className={`px-4 py-2 rounded ${
            !riskEngine ? "bg-gray-300" : "bg-orange-500 text-white"
          }`}
        >
          Perform Risk Assessment
        </button>

        {riskAssessment && (
          <div className="mt-4">
            <div className="mb-2">
              <span className="font-semibold">Overall Risk Level: </span>
              <span
                className={`font-bold ${
                  riskAssessment.overallRiskLevel === "Low"
                    ? "text-green-600"
                    : riskAssessment.overallRiskLevel === "Medium"
                    ? "text-yellow-600"
                    : riskAssessment.overallRiskLevel === "High"
                    ? "text-orange-600"
                    : "text-red-600"
                }`}
              >
                {riskAssessment.overallRiskLevel}
              </span>
            </div>

            {riskAssessment.liquidityRisk && (
              <div className="p-2 bg-gray-50 rounded mb-2">
                <p>
                  <strong>Liquidity Risk:</strong>{" "}
                  {riskAssessment.liquidityRisk.riskLevel}
                </p>
                <p>
                  Required: {riskAssessment.liquidityRisk.requiredLiquidity} |
                  Available: {riskAssessment.liquidityRisk.availableLiquidity}
                </p>
              </div>
            )}

            {riskAssessment.collateralRisk && (
              <div className="p-2 bg-gray-50 rounded mb-2">
                <p>
                  <strong>Collateral Risk:</strong>{" "}
                  {riskAssessment.collateralRisk.riskLevel}
                </p>
                <p>
                  Collateral Ratio:{" "}
                  {riskAssessment.collateralRisk.collateralRatio.toFixed(2)}%
                </p>
              </div>
            )}

            {riskAssessment.liquidationRisk && (
              <div className="p-2 bg-gray-50 rounded mb-2">
                <p>
                  <strong>Liquidation Risk:</strong>{" "}
                  {riskAssessment.liquidationRisk.riskLevel}
                </p>
                <p>Protocol: {riskAssessment.liquidationRisk.protocol}</p>
                <p>
                  Price Gap:{" "}
                  {riskAssessment.liquidationRisk.priceGap.toFixed(2)}%
                </p>
              </div>
            )}

            <div className="mt-3">
              <h3 className="font-semibold mb-1">Recommended Actions:</h3>
              <ul className="list-disc pl-5">
                {riskAssessment.recommendedActions.map((action, i) => (
                  <li key={i} className="text-sm">
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {txnHash && (
        <div className="mb-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Transaction Status</h2>
          <p>
            <strong>Latest Transaction Hash:</strong>
          </p>
          <p className="font-mono break-all text-sm">{txnHash}</p>
          <p className="mt-2">
            <a
              href={`https://explorer.aptoslabs.com/txn/${txnHash}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View on Explorer
            </a>
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-red-300 bg-red-50 rounded-lg text-red-800">
          <h2 className="text-lg font-semibold mb-1">Error</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
