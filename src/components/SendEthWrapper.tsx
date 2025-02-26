'use client';

import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from '@coinbase/onchainkit/transaction';
import type {
  TransactionError,
  TransactionResponse,
} from '@coinbase/onchainkit/transaction';
import { useEffect, useState } from 'react';

import type { Address } from 'viem';
import { BASE_SEPOLIA_CHAIN_ID } from '../constants';
import { parseEther } from 'viem';

export default function SendEthWrapper({ recipientAddress }: { recipientAddress: Address }) {
  const [usdAmount, setUsdAmount] = useState<string>('1.00');
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [ethAmount, setEthAmount] = useState<string>('0');

  // Fetch ETH price
  useEffect(() => {
    async function fetchEthPrice() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        setEthPrice(data.ethereum.usd);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    }
    fetchEthPrice();
  }, []);

  // Calculate ETH amount whenever USD amount or ETH price changes
  useEffect(() => {
    if (ethPrice > 0 && !isNaN(parseFloat(usdAmount))) {
      const ethValue = parseFloat(usdAmount) / ethPrice;
      setEthAmount(ethValue.toFixed(6)); // 6 decimal places for ETH
    }
  }, [usdAmount, ethPrice]);

  const contracts = ethAmount ? [{
    to: recipientAddress,
    value: parseEther(ethAmount),
  }] : [];

  const handleError = (err: TransactionError) => {
    console.error('Transaction error:', err);
  };

  const handleSuccess = (response: TransactionResponse) => {
    console.log('Transaction successful', response);
  };

  return (
    <div className="flex flex-col w-full max-w-full gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            value={usdAmount}
            onChange={(e) => setUsdAmount(e.target.value)}
            min="0"
            step="0.01"
            className="w-full pl-8 pr-4 py-2 border rounded-lg"
            placeholder="Enter USD amount"
          />
        </div>
        <div className="text-sm text-gray-500">
          ≈ {ethAmount} ETH
        </div>
      </div>

      <Transaction
        contracts={contracts}
        className="mb-4 w-full max-w-full"
        chainId={BASE_SEPOLIA_CHAIN_ID}
        onError={handleError}
        onSuccess={handleSuccess}
      >
        <TransactionButton 
          className="mt-0 mr-auto ml-auto w-[450px] max-w-full text-[white] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!ethAmount || parseFloat(ethAmount) <= 0}
        />
        <div className="text-center text-sm text-gray-600">
          {ethAmount && parseFloat(ethAmount) > 0 ? `Sending $${usdAmount} (${ethAmount} ETH)` : 'Enter an amount to send'}
        </div>
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
      </Transaction>
    </div>
  );
} 