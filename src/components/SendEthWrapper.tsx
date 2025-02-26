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

import type { Address } from 'viem';
import { BASE_SEPOLIA_CHAIN_ID } from '../constants';
import { parseEther } from 'viem';

export default function SendEthWrapper({ recipientAddress }: { recipientAddress: Address }) {
  // 0.001 ETH in wei
  const amount = parseEther('0.001');

  const contracts = [{
    to: recipientAddress,
    value: amount,
    // No ABI needed for simple ETH transfer
  }];

  const handleError = (err: TransactionError) => {
    console.error('Transaction error:', err);
  };

  const handleSuccess = (response: TransactionResponse) => {
    console.log('Transaction successful', response);
  };

  return (
    <div className="flex w-full max-w-full">
      <Transaction
        contracts={contracts}
        className="mb-4 w-full max-w-full"
        chainId={BASE_SEPOLIA_CHAIN_ID}
        onError={handleError}
        onSuccess={handleSuccess}
      >
        <TransactionButton className="mt-0 mr-auto ml-auto w-[450px] max-w-full text-[white]" />
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
      </Transaction>
    </div>
  );
} 