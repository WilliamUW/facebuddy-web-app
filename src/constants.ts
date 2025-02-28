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

// USDC contract address on Base Sepolia
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

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

export const USDC_DECIMALS = 6;

export const UNICHAIN_SEPOLIA_FACEBUDDY_ADDRESS =
  "0x9B645605dE434Ee7d243306bf880eE6454be8f63";
export const UNICHAIN_SEPOLIA_USDC_ADDRESS =
  "0x31d0220469e10c4E71834a79b1f276d740d3768F";
export const UNICHAIN_SEPOLIA_WETH_ADDRESS =
  "0x4200000000000000000000000000000000000006";
export const UNICHAIN_SEPOLIA_ROUTER_ADDRESS =
  "0xf70536b3bcc1bd1a972dc186a2cf84cc6da6be5d";

export const UNICHAIN_FACEBUDDY_ADDRESS =
  "0x6b175474e89094c44da98b954eedeac495271d0f";
export const UNICHAIN_USDC_ADDRESS =
  "0x078d782b760474a361dda0af3839290b0ef57ad6";
export const UNICHAIN_WETH_ADDRESS =
  "0x4200000000000000000000000000000000000006";
export const UNICHAIN_ROUTER_ADDRESS =
  "0xef740bf23acae26f6492b10de645d6b98dc8eaf3";

export const UNICHAIN_SEPOLIA_POOL_KEY = {
  currency0: UNICHAIN_SEPOLIA_USDC_ADDRESS,
  currency1: 0x0000000000000000000000000000000000000000,
  fee: 3000,
  tickSpacing: 60,
  hooks: 0x0000000000000000000000000000000000000000,
};

export const UNICHAIN_POOL_KEY = {
  currency0: UNICHAIN_USDC_ADDRESS,
  currency1: 0x0000000000000000000000000000000000000000,
  fee: 3000,
  tickSpacing: 60,
  hooks: 0x0000000000000000000000000000000000000000,
};
