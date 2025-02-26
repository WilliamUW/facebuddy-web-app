"use client";
import { useConnectModal } from "@rainbow-me/rainbowkit";

export default function LoginButton() {
  const { openConnectModal } = useConnectModal();

  const handleClick = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="min-w-[90px] px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      data-testid="ockConnectWallet_Container"
    >
      Log in
    </button>
  );
}
