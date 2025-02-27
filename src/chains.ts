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
  id: 88_888,
  name: "Unichain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.unichain.io"],
    },
    public: {
      http: ["https://rpc.unichain.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Unichain Explorer",
      url: "https://explorer.unichain.io",
    },
  },
  testnet: false,
};
