'use client';

import type { Address, ContractFunctionParameters } from 'viem';
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

import { BASE_SEPOLIA_CHAIN_ID } from '../constants';
import { parseUnits } from 'viem';

// USDC contract address on Base Sepolia
const USDC_CONTRACT_ADDRESS = "0x078d782b760474a361dda0af3839290b0ef57ad6";

// ERC20 ABI for the transfer function
const USDC_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: '_to',
        type: 'address',
      },
      {
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export default function SendUsdcWrapper({ recipientAddress, initialUsdAmount }: { recipientAddress: Address, initialUsdAmount?: string }) {
  const [usdAmount, setUsdAmount] = useState<string>(initialUsdAmount || '1.00');
  const [shouldAutoInitiate, setShouldAutoInitiate] = useState(!!initialUsdAmount);
  const [hasInitiatedTransaction, setHasInitiatedTransaction] = useState(false);

  // USDC has 6 decimals
  const USDC_DECIMALS = 6;

  // Calculate USDC amount (1:1 with USD)
  const usdcAmount = !isNaN(parseFloat(usdAmount)) ? usdAmount : '0';

  const contracts = usdcAmount && parseFloat(usdcAmount) > 0 && shouldAutoInitiate ? [{
    address: USDC_CONTRACT_ADDRESS,
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [recipientAddress, parseUnits(usdcAmount, USDC_DECIMALS)],
  }] as unknown as ContractFunctionParameters[] : [];

  const handleError = (err: TransactionError) => {
    console.error('Transaction error:', err);
    setShouldAutoInitiate(false);
    setHasInitiatedTransaction(false);
  };

  const handleSuccess = (response: TransactionResponse) => {
    console.log('Transaction successful', response);
    setShouldAutoInitiate(false);
    setHasInitiatedTransaction(true);
  };

  return (
    <div className="flex flex-col w-full max-w-full gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            value={usdAmount}
            onChange={(e) => {
              setUsdAmount(e.target.value);
              setShouldAutoInitiate(false); // Disable auto-initiate when amount is changed manually
            }}
            min="0"
            step="0.01"
            className="w-full pl-8 pr-4 py-2 border rounded-lg"
            placeholder="Enter USD amount"
          />
        </div>
        <div className="text-sm text-gray-500">
          = {usdcAmount} USDC
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
          className="mt-0 mr-auto ml-auto max-w-full text-[white] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!usdcAmount || parseFloat(usdcAmount) <= 0 || hasInitiatedTransaction}
        />
        <div className="text-center text-sm text-gray-600">
          {usdcAmount && parseFloat(usdcAmount) > 0 ? 
            hasInitiatedTransaction ? 
              'Transaction initiated' : 
              `Sending $${usdAmount} (${usdcAmount} USDC)` 
            : 'Enter an amount to send'}
        </div>
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
      </Transaction>
    </div>
  );
} 