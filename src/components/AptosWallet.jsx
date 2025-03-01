import { useState, useEffect } from 'react';
import AptosWalletManager from '../agents/index.js';
import { Network } from '@aptos-labs/ts-sdk';

/**
 * React component to display Aptos wallet information
 */
export default function AptosWallet() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customBalance, setCustomBalance] = useState(null);
  const [network, setNetwork] = useState(Network.TESTNET);

  // Initialize the wallet manager
  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const success = await AptosWalletManager.initialize(network);
      
      if (success) {
        setIsInitialized(true);
        const walletAddress = AptosWalletManager.getAccountAddress();
        setAddress(walletAddress);
        
        // Get balance
        const walletBalance = await AptosWalletManager.getBalance();
        setBalance(walletBalance);
      } else {
        setError('Failed to initialize wallet. Check your private key and network connection.');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check balance of a custom address
  const checkCustomBalance = async () => {
    if (!customAddress || !isInitialized) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const customWalletBalance = await AptosWalletManager.getBalance(customAddress);
      setCustomBalance(customWalletBalance);
    } catch (err) {
      setError(`Error checking custom address: ${err.message}`);
      setCustomBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle network change
  const handleNetworkChange = (e) => {
    setNetwork(e.target.value);
    setIsInitialized(false);
    setBalance(null);
    setAddress('');
    setCustomBalance(null);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Aptos Wallet Manager</h2>
      
      {/* Network Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
        <select 
          value={network}
          onChange={handleNetworkChange}
          className="w-full p-2 border border-gray-300 rounded"
          disabled={isLoading}
        >
          <option value={Network.MAINNET}>Mainnet</option>
          <option value={Network.TESTNET}>Testnet</option>
          <option value={Network.DEVNET}>Devnet</option>
        </select>
      </div>
      
      {/* Initialize Button */}
      <button
        onClick={initializeWallet}
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4 disabled:opacity-50"
      >
        {isLoading ? 'Connecting...' : isInitialized ? 'Reconnect' : 'Connect Wallet'}
      </button>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Wallet Info */}
      {isInitialized && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Your Wallet</h3>
          <div className="bg-gray-100 p-3 rounded mb-2">
            <p className="text-sm font-medium text-gray-700">Address:</p>
            <p className="text-xs break-all">{address}</p>
          </div>
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm font-medium text-gray-700">Balance:</p>
            <p className="text-xl font-bold">{balance !== null ? `${balance} APT` : 'Loading...'}</p>
          </div>
        </div>
      )}
      
      {/* Check Custom Address */}
      {isInitialized && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Check Other Address</h3>
          <input
            type="text"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="Enter Aptos address"
            className="w-full p-2 border border-gray-300 rounded mb-2"
          />
          <button
            onClick={checkCustomBalance}
            disabled={isLoading || !customAddress}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mb-2 disabled:opacity-50"
          >
            Check Balance
          </button>
          
          {customBalance !== null && (
            <div className="bg-gray-100 p-3 rounded mt-2">
              <p className="text-sm font-medium text-gray-700">Balance for {customAddress.substring(0, 6)}...{customAddress.substring(customAddress.length - 4)}:</p>
              <p className="text-xl font-bold">{customBalance} APT</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 