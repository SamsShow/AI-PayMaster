import React from "react";
import PayMasterTest from "./tools/paymaster/PayMasterTest";

const App: React.FC = () => {
  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-center my-6">
        PayMaster - Automated Payment System
      </h1>
      <PayMasterTest />
    </div>
  );
};

export default App;
