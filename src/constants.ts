import { useChainId } from "wagmi";
import { unichainSepolia } from "./chains";
import { base, unichain } from "wagmi/chains";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const mintContractAddress = "0xA3e40bBe8E8579Cd2619Ef9C6fEA362b760dac9f";
export const mintABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "public",
    type: "function",
  },
] as const;

export const faceBuddyConfig = {
  [unichain.id]: {
    faceBuddyAddress: "0x62431207530999d4389EF59007CEedBE38900d5D",
    usdcAddress: "0x078d782b760474a361dda0af3839290b0ef57ad6",
    poolKey: {
      currency0: "0x0000000000000000000000000000000000000000",
      currency1: "0x078d782b760474a361dda0af3839290b0ef57ad6",
      fee: 3000,
      tickSpacing: 60,
      hooks: "0x0000000000000000000000000000000000000000",
    },
  },
  [base.id]: {
    faceBuddyAddress: "0xf83e6AF69B226d9446fB8C17CA9f258b91F0202D",
    usdcAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    poolKey: {
      currency0: "0x0000000000000000000000000000000000000000",
      currency1: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      fee: 3000,
      tickSpacing: 60,
      hooks: "0x0000000000000000000000000000000000000000",
    },
  },
} as const;

// ERC20 ABI for the token functions
export const USDC_ABI = [
  {
    inputs: [
      {
        name: "to",
        type: "address",
      },
      {
        name: "value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const latestWalrusBlobId = "3qInv3LRy2SjMiyzztKP6LbvauzHrDOf4wo3YEAB8ls";
