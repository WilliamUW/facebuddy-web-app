"use client";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { useMemo } from "react";
import { http, createConfig } from "wagmi";
import {
  base,
  baseSepolia,
  Chain,
  unichain,
  unichainSepolia,
} from "wagmi/chains";

import { NEXT_PUBLIC_WC_PROJECT_ID } from "./config";
import { unichainMainnet } from "./chains";

export function useWagmiConfig() {
  const projectId = NEXT_PUBLIC_WC_PROJECT_ID ?? "";
  if (!projectId) {
    const providerErrMessage =
      "To connect to all Wallets you need to provide a NEXT_PUBLIC_WC_PROJECT_ID env variable";
    throw new Error(providerErrMessage);
  }

  return useMemo(() => {
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Recommended Wallet",
          wallets: [coinbaseWallet],
        },
        {
          groupName: "Other Wallets",
          wallets: [rainbowWallet, metaMaskWallet],
        },
      ],
      {
        appName: "onchainkit",
        projectId,
      }
    );

    const chains = [
      base,
      baseSepolia,
      unichain,
      unichainSepolia,
      unichainMainnet,
    ] as const;

    const wagmiConfig = createConfig({
      chains,
      // turn off injected provider discovery
      multiInjectedProviderDiscovery: false,
      connectors,
      ssr: true,
      transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
        [unichain.id]: http(
          "https://unichain-mainnet.g.alchemy.com/v2/cCmdllUM3oiBjOpStn0RrTb8eifa87te"
        ),
        [unichainSepolia.id]: http(),
      },
    });

    return wagmiConfig;
  }, [projectId]);
}
