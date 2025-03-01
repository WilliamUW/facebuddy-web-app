"use client";
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
import type { Address, ContractFunctionParameters } from "viem";
import {
  BASE_SEPOLIA_CHAIN_ID,
  mintABI,
  mintContractAddress,
} from "../constants";
import { base } from "viem/chains";
import { facebuddyabi } from "../facebuddyabi";
import { faceBuddyConfig } from "../constants";
export default function TransactionWrapper({
  token,
  who,
  onSentTx,
}: {
  token: Address;
  who: Address;
  onSentTx: () => void;
}) {
  const contracts = [
    {
      address: faceBuddyConfig[base.id].faceBuddyAddress,
      abi: facebuddyabi,
      functionName: "setPreferredToken",
      args: [token, who],
    },
  ] as unknown as ContractFunctionParameters[];

  const handleError = (err: TransactionError) => {
    console.error("Transaction error:", err);
  };

  const handleSuccess = (response: TransactionResponse) => {
    console.log("Transaction successful", response);
    onSentTx();
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
        <TransactionButton className="mt-0 mr-auto ml-auto max-w-full text-[white]" />
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
      </Transaction>
    </div>
  );
}
