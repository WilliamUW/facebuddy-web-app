export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const mintContractAddress = '0xA3e40bBe8E8579Cd2619Ef9C6fEA362b760dac9f';
export const mintABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'public',
    type: 'function',
  },
] as const;

// USDC contract address on Base Sepolia
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ERC20 ABI for the token functions
export const USDC_ABI = [
  {
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'value',
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
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

// Base Sepolia USDC has 18 decimals
export const USDC_DECIMALS = 6;
