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

// USDC contract address on Unichain
export const USDC_CONTRACT_ADDRESS =
  "0x078d782b760474a361dda0af3839290b0ef57ad6";

export const USDC_DECIMALS = 6;

export const UNICHAIN_SEPOLIA_FACEBUDDY_ADDRESS =
  "0xa28b8Edbba96984e54d502317B318Ab457AE06C0";
export const UNICHAIN_SEPOLIA_USDC_ADDRESS =
  "0x078d782b760474a361dda0af3839290b0ef57ad6";
export const UNICHAIN_SEPOLIA_ETH_ADDRESS =
  "0x0000000000000000000000000000000000000000";
export const UNICHAIN_SEPOLIA_ROUTER_ADDRESS =
  "0x73855d06de49d0fe4a9c42636ba96c62da12ff9c";

export const UNICHAIN_FACEBUDDY_ADDRESS =
  "0xa28b8Edbba96984e54d502317B318Ab457AE06C0";
export const UNICHAIN_USDC_ADDRESS =
  "0x078d782b760474a361dda0af3839290b0ef57ad6";
export const UNICHAIN_ETH_ADDRESS =
  "0x0000000000000000000000000000000000000000";
export const UNICHAIN_ROUTER_ADDRESS =
  "0x73855d06de49d0fe4a9c42636ba96c62da12ff9c";

export const UNICHAIN_SEPOLIA_POOL_KEY = {
  currency0: UNICHAIN_SEPOLIA_ETH_ADDRESS,
  currency1: UNICHAIN_SEPOLIA_USDC_ADDRESS,
  fee: 3000,
  tickSpacing: 60,
  hooks: 0x0000000000000000000000000000000000000000,
};

export const UNICHAIN_POOL_KEY = {
  currency0: UNICHAIN_ETH_ADDRESS,
  currency1: UNICHAIN_USDC_ADDRESS,
  fee: 3000,
  tickSpacing: 60,
  hooks: 0x0000000000000000000000000000000000000000,
};

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