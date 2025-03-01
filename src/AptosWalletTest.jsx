import React from 'react';
import { createRoot } from 'react-dom/client';
import AptosWallet from './components/AptosWallet';
import './index.css';

// Simple container component
const AptosWalletTest = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center my-6">Aptos Wallet Test</h1>
      <AptosWallet />
    </div>
  );
};

// Mount to DOM
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<AptosWalletTest />);
} else {
  console.error("Could not find element with id 'root'");
}

export default AptosWalletTest; 