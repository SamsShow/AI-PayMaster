import React from "react";
import { AptosAccount, Network } from "@aptos-labs/ts-sdk";
import {
  CustomMoveAgentProvider,
  GeminiImageAnalysis,
} from "./agents/CustomMoveAgent";

const App: React.FC = () => {
  // Initialize your Aptos account
  const account = new AptosAccount({
    privateKey: process.env.APTOS_PRIVATE_KEY,
  });

  return (
    <CustomMoveAgentProvider account={account} network={Network.MAINNET}>
      <div className="App">
        <h1>Move AI Agent with Gemini</h1>
        <GeminiImageAnalysis />
      </div>
    </CustomMoveAgentProvider>
  );
};

export default App;
