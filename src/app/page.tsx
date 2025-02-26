"use client";

import { useEffect, useState } from "react";

import FaceRecognition from "src/components/FaceRecognition";
import FaceRegistration from "src/components/FaceRegistration";
import Footer from "src/components/Footer";
import { GetCIDResponse } from "pinata-web3";
import Image from "next/image";
import LoginButton from "../components/LoginButton";
import { ONCHAINKIT_LINK } from "src/links";
import OnchainkitSvg from "src/svg/OnchainkitSvg";
import { ProfileData } from "src/components/FaceRegistration";
import SignupButton from "../components/SignupButton";

import TransactionWrapper from "src/components/TransactionWrapper";
import WalletWrapper from "src/components/WalletWrapper";
import { getFileContent } from "src/utility/faceDataStorage";
import { useAccount } from "wagmi";

export default function Page() {
  const { address } = useAccount();
  const [activeView, setActiveView] = useState<"recognize" | "register">(
    "recognize"
  );
  const [savedFaces, setSavedFaces] = useState<
    Array<{
      label: ProfileData;
      descriptor: Float32Array;
    }>
  >([]);

  const handleFaceSaved = (
    newFaces: Array<{
      label: ProfileData;
      descriptor: any;
    }>
  ) => {
    setSavedFaces((prev) => [...prev, ...newFaces]);
  };

  useEffect(() => {
    async function populateFaces() {
      try {
        const content = await getFileContent(
          "bafkreia27z2wok67tk52sgxjytz4xvtbbho3sfty7qfkdvrr6miaunzwnm"
        );

        // Handle the fallback URL case
        if (typeof content === "string") {
          console.error("Failed to fetch face data");
          return;
        }

        // Handle JSON response
        if (
          content instanceof Object &&
          "data" in content &&
          typeof content.data === "object" &&
          content.data &&
          "content" in content.data
        ) {
          const jsonContent = content.data.content;
          if (typeof jsonContent !== "string") {
            console.error("Invalid content format");
            return;
          }

          const parsedContent = JSON.parse(jsonContent);
          // Convert the regular arrays back to Float32Array
          const processedFaces = parsedContent.map((face: any) => ({
            ...face,
            descriptor: new Float32Array(face.descriptor),
          }));

          setSavedFaces(processedFaces);
          console.log("faces downloaded");
        } else {
          console.error("Invalid response format");
        }
      } catch (error) {
        console.error("Error loading face data:", error);
      }
    }
    populateFaces();
  }, []);

  return (
    <div className="flex h-full w-96 max-w-full flex-col px-1 md:w-[1008px]">
      <section className="mt-6 mb-6 flex w-full flex-col md:flex-row">
        <div className="flex w-full flex-row items-center justify-between gap-2 md:gap-0">
          <a
            href={ONCHAINKIT_LINK}
            title="onchainkit"
            target="_blank"
            rel="noreferrer"
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
      <section className="templateSection flex w-full flex-col items-center justify-center gap-4 rounded-xl bg-gray-100 px-2 py-4 md:grow">
        {/* <div className="flex h-[450px] w-[450px] max-w-full items-center justify-center rounded-xl bg-[#030712]">
          <div className="rounded-xl bg-[#F3F4F6] px-4 py-[11px]">
            <p className="font-normal text-indigo-600 text-xl not-italic tracking-[-1.2px]">
              npm install @coinbase/onchainkit
            </p>
          </div>
        </div> */}
        {address ? (
          <>
            {activeView === "register" ? (
              <FaceRegistration
                onFaceSaved={handleFaceSaved}
                savedFaces={savedFaces}
              />
            ) : (
              <>
                <FaceRecognition savedFaces={savedFaces} />
                {/* <TransactionWrapper address={address} /> */}
              </>
            )}
          </>
        ) : (
          <WalletWrapper
            className="w-[450px] max-w-full"
            text="Sign in to transact"
          />
        )}
      </section>
      <br />
      <br />
      <br />
      <section className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-[900px] mx-auto flex justify-around items-center h-16">
          <button
            onClick={() => setActiveView("recognize")}
            className={`flex flex-col items-center justify-center w-full h-full ${
              activeView === "recognize" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
            <span className="text-xs mt-1">Recognize</span>
          </button>

          <button
            onClick={() => setActiveView("register")}
            className={`flex flex-col items-center justify-center w-full h-full ${
              activeView === "register" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
              />
            </svg>
            <span className="text-xs mt-1">Register</span>
          </button>
        </div>
      </section>
    </div>
  );
}
