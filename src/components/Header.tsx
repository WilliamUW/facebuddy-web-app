"use client";

import { ONCHAINKIT_LINK } from "src/links";

import Image from "next/image";
import SignupButton from "./SignupButton";
import LoginButton from "./LoginButton";
import { useAccount } from "wagmi";

export default function Header() {
  const { address } = useAccount();
  return (
    <section className="w-full py-4">
      <div className="flex w-full flex-row justify-between">
        <a
          href={ONCHAINKIT_LINK}
          title="onchainkit"
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0"
        >
          <Image
            src="/facebuddy.svg"
            alt="FaceBuddy Logo"
            width={200}
            height={30}
            className="mb-2"
          />
        </a>
        <div className="flex items-center gap-3">
          <SignupButton />
          {!address && <LoginButton />}
        </div>
      </div>
    </section>
  );
}
