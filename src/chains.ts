import { Chain } from "wagmi/chains";

export const unichainSepolia: Chain = {
  id: 88_882,
  name: "Unichain Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Sepolia Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-sepolia.unichain.io"],
    },
    public: {
      http: ["https://rpc-sepolia.unichain.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Unichain Explorer",
      url: "https://explorer-sepolia.unichain.io",
    },
  },
  testnet: true,
};

export const unichainMainnet: Chain = {
  id: 130,
  name: "Unichain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        "https://unichain-mainnet.g.alchemy.com/v2/cCmdllUM3oiBjOpStn0RrTb8eifa87te",
      ],
    },
    public: {
      http: [
        "https://unichain-mainnet.g.alchemy.com/v2/cCmdllUM3oiBjOpStn0RrTb8eifa87te",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Unichain Explorer",
      url: "https://uniscan.xyz",
    },
  },
  testnet: false,
};
