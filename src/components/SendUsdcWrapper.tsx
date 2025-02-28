'use client';

import type { Address, ContractFunctionParameters } from 'viem';
import { BASE_SEPOLIA_CHAIN_ID, USDC_ABI, USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from '../constants';
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

import { parseUnits } from 'viem';

// Define Ethereum provider interface
interface EthereumProvider {
  request: (args: { method: string; params?: any }) => Promise<any>;
  isMetaMask?: boolean;
}

export default function SendUsdcWrapper({ 
  recipientAddress, 
  initialUsdAmount,
  tokenType = "USDC" 
}: { 
  recipientAddress: Address, 
  initialUsdAmount?: string,
  tokenType?: string 
}) {
  const [usdAmount, setUsdAmount] = useState<string>(initialUsdAmount || '1.00');
  const [shouldAutoInitiate, setShouldAutoInitiate] = useState(!!initialUsdAmount);
  const [hasInitiatedTransaction, setHasInitiatedTransaction] = useState(false);
  const [tokenSymbol, setTokenSymbol] = useState<string>(tokenType);
  const [tokenName, setTokenName] = useState<string>(`Base Sepolia ${tokenType}`);
  const [tokenDecimals, setTokenDecimals] = useState<number>(USDC_DECIMALS);
  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState<boolean>(true);

  // Fetch token details
  useEffect(() => {
    const fetchTokenDetails = async () => {
      try {
        setIsLoadingTokenInfo(true);
        
        // We would normally use a library like wagmi or viem to call these functions
        // For simplicity, we'll just use the constant values for now
        // In a real implementation, you would call the contract's functions:
        // - decimals()
        // - symbol()
        // - name()
        
        // Simulate a delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use the constants for now
        setTokenDecimals(USDC_DECIMALS);
        setTokenSymbol(tokenType);
        setTokenName(`Base Sepolia ${tokenType}`);
        
        console.log('Token details loaded:', {
          name: `Base Sepolia ${tokenType}`,
          symbol: tokenType,
          decimals: USDC_DECIMALS
        });
      } catch (error) {
        console.error('Error fetching token details:', error);
      } finally {
        setIsLoadingTokenInfo(false);
      }
    };
    
    fetchTokenDetails();
  }, [tokenType]);

  // Calculate USDC amount (1:1 with USD)
  const usdcAmount = !isNaN(parseFloat(usdAmount)) ? usdAmount : '0';
  
  // For debugging - log the actual amount being sent
  const rawAmount = parseFloat(usdcAmount);
  const tokenAmount = parseUnits(usdcAmount, tokenDecimals);
  console.log('Sending amount:', {
    rawAmount,
    tokenAmount: tokenAmount.toString(),
    decimals: tokenDecimals
  });

  const contracts = usdcAmount && parseFloat(usdcAmount) > 0 && shouldAutoInitiate ? [{
    address: USDC_CONTRACT_ADDRESS,
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [recipientAddress, parseUnits(usdcAmount, tokenDecimals)],
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

  // Function to add token to wallet
  const addTokenToWallet = async () => {
    try {
      // Check if ethereum is available (MetaMask or similar wallet)
      if (typeof window !== 'undefined' && 'ethereum' in window) {
        const ethereum = window.ethereum as unknown as EthereumProvider;
        await ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: USDC_CONTRACT_ADDRESS,
              symbol: tokenSymbol,
              decimals: tokenDecimals,
              name: tokenName,
            },
          },
        });
      } else {
        console.log('Ethereum provider not found');
      }
    } catch (error) {
      console.error('Error adding token to wallet:', error);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-full gap-2">
      {isLoadingTokenInfo ? (
        <div className="text-center py-2">
          <span className="text-sm text-gray-500">Loading token information...</span>
        </div>
      ) : (
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
            = {usdcAmount} {tokenSymbol}
          </div>
        </div>
      )}

      <Transaction
        contracts={contracts}
        className="mb-4 w-full max-w-full"
        chainId={BASE_SEPOLIA_CHAIN_ID}
        onError={handleError}
        onSuccess={handleSuccess}
      >
        <TransactionButton 
          className="mt-0 mr-auto ml-auto w-[450px] max-w-full text-[white] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoadingTokenInfo || !usdcAmount || parseFloat(usdcAmount) <= 0 || hasInitiatedTransaction}
        />
        <div className="text-center text-sm text-gray-600">
          {isLoadingTokenInfo ? 'Loading token information...' : 
            usdcAmount && parseFloat(usdcAmount) > 0 ? 
              hasInitiatedTransaction ? 
                'Transaction initiated' : 
                `Sending $${usdAmount} (${usdcAmount} ${tokenSymbol})` 
              : 'Enter an amount to send'}
        </div>
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
      </Transaction>
      
      {/* Token information and add to wallet button */}
      {!isLoadingTokenInfo && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{tokenName} ({tokenSymbol})</p>
              <p className="text-gray-500 text-xs">Contract: {USDC_CONTRACT_ADDRESS.slice(0, 6)}...{USDC_CONTRACT_ADDRESS.slice(-4)}</p>
            </div>
            <button 
              onClick={addTokenToWallet}
              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Add to Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 