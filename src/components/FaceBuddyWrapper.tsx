"use client";

import type { Address, ContractFunctionParameters } from "viem";
import {
  BASE_SEPOLIA_CHAIN_ID,
  mintABI,
  mintContractAddress,
} from "../constants";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from "@coinbase/onchainkit/transaction";
import type {
  TransactionError,
  TransactionResponse,
} from "@coinbase/onchainkit/transaction";

import { base } from "viem/chains";
import { faceBuddyConfig } from "../constants";
import { facebuddyabi } from "../facebuddyabi";
type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: bigint;
  tickSpacing: bigint;
  hooks: Address;
};

export default function TransactionWrapper({
  recipient,
  inputToken,
  amount,
  poolKey,
  minAmountOut,
  deadline,
  onSentTx,
  value,
}: {
  recipient: Address;
  inputToken: Address;
  amount: bigint;
  poolKey: PoolKey;
  minAmountOut: bigint;
  deadline: bigint;
  onSentTx: () => void;
  value: bigint;
}) {
  const contracts = [
    {
      address: faceBuddyConfig[base.id].faceBuddyAddress,
      abi: facebuddyabi,
      functionName: "swapAndSendPreferredToken",
      args: [recipient, inputToken, amount, poolKey, minAmountOut, deadline],
      value: value,
    },
  ] as unknown as ContractFunctionParameters[];

  const handleError = (err: TransactionError) => {
    console.error("Transaction error:", err);
  };

  const handleSuccess = (response: TransactionResponse) => {
    console.log("Transaction successful", response);
    // onSentTx();
  };

  return (
    <div className="flex">
      <Transaction
        isSponsored={true}
        contracts={contracts}
        className=""
        chainId={base.id}
        onError={handleError}
        onSuccess={handleSuccess}
      >
        <TransactionButton
          className="mt-0 mr-auto ml-auto max-w-full text-[white]"
        />
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
      </Transaction>
    </div>
  );
}
