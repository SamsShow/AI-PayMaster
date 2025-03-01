import React from "react";
import PayMasterTest from "./tools/paymaster/PayMasterTest";
import AptosWallet from "./components/AptosWallet";

const App: React.FC = () => {
  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-center my-6">
        PayMaster - Automated Payment System
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Aptos Wallet</h2>
          <AptosWallet />
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">PayMaster Test</h2>
          <PayMasterTest />
        </div>
      </div>
    </div>
  );
};

export default App;
