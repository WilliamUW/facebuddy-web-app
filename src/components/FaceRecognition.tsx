"use client";

import * as faceapi from "face-api.js";

import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import {
  createImageFromDataUrl,
  detectFacesInImage,
  findLargestFace,
} from "../utility/faceRecognitionUtils";
import { useEffect, useRef, useState } from "react";
import { faceBuddyConfig } from "../constants";
import AgentModal from "./AgentModal";
import { ProfileData } from "./FaceRegistration";
import Webcam from "react-webcam";
import { facebuddyabi } from "../facebuddyabi";
import { useAccount, useReadContract } from "wagmi";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import TransactionWrapper from "./FaceBuddyWrapper";
export interface SavedFace {
  label: ProfileData;
  descriptor: Float32Array;
}
import { base } from "viem/chains";
interface Props {
  savedFaces: SavedFace[];
}

// Define the response type similar to ChatInterface
type AgentResponse = {
  content: {
    text: string;
    functionCall?: {
      functionName: string;
      args: {
        recipientAddress?: string;
        amount?: string;
        ticker?: string;
        platform?: string;
        username?: string;
      };
    };
  };
  proof?: {
    type: string;
    timestamp: number;
    metadata: {
      logId: string;
    };
  };
};

interface Step {
  label: string;
  isLoading: boolean;
  type: "scan" | "agent" | "connection" | "token" | "transaction" | "hash";
}

export default function FaceRecognition({ savedFaces }: Props) {
  const { address } = useAccount();
  const webcamRef = useRef<Webcam>(null);
  const [isWebcamLoading, setIsWebcamLoading] = useState(true);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentSteps, setAgentSteps] = useState<Step[]>([]);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [transactionAmount, setTransactionAmount] = useState<string | null>(
    null
  );
  const chainId = useChainId();
  const [matchedProfile, setMatchedProfile] = useState<ProfileData | null>(
    null
  );
  const [detectedFaceImage, setDetectedFaceImage] = useState<string | null>(
    null
  );
  const [transactionComponent, setTransactionComponent] =
    useState<React.ReactNode | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: hash, isPending, writeContract } = useWriteContract();

  // Add contract read for preferred token
  const { data: preferredTokenAddress, refetch } = useReadContract({
    address: faceBuddyConfig[chainId].faceBuddyAddress as `0x${string}`,
    abi: facebuddyabi,
    functionName: "preferredToken",
    args: [matchedProfile?.name as `0x${string}`],
  });

  useEffect(() => {
    refetch();
  }, [matchedProfile]);
  console.log("preferredTokenAddress:", preferredTokenAddress);
  console.log("currentAddress:", currentAddress);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  // Speech recognition setup
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Add effect to handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      setAgentSteps((prevSteps) => [
        ...prevSteps.slice(0, -1),
        {
          label: "Transaction confirmed",
          isLoading: false,
          type: "transaction",
        },
        {
          label: `<a href="${faceBuddyConfig[chainId].blockExplorer}/tx/${hash}" target="_blank" rel="noopener noreferrer" class="hover:underline">View on ${faceBuddyConfig[chainId].blockExplorer}</a>`,
          isLoading: false,
          type: "hash",
        },
      ]);
    }
  }, [isConfirmed, hash]);

  // Reset transcript after a period of silence
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    // Don't set a timeout if the agent modal is open
    if (isAgentModalOpen) {
      return;
    }

    if (transcript) {
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Set a new timeout to clear the transcript after 2 seconds of no new speech
      timeoutId = setTimeout(() => {
        // Check if the transcript contains "face" and "buddy"
        const lowerTranscript = transcript.toLowerCase();
        if (
          lowerTranscript.includes("face") &&
          lowerTranscript.includes("buddy")
        ) {
          // Save the current transcript before resetting
          setCurrentTranscript(transcript);

          // Start the agent process
          handleAgentRequest(transcript);
        } else {
          // Just reset the transcript if it doesn't contain the trigger words
          resetTranscript();
        }
      }, 2000); // Changed from 1000 to 2000 (2 seconds)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [transcript, resetTranscript, isAgentModalOpen]);

  // Add this function after the useEffect hooks
  const getEthPrice = async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        {
          headers: {
            "x-cg-demo-api-key": "CG-F4id9SW5jrwmuhUPK4Es27Ek",
          },
        }
      );
      const data = await response.json();
      return data.ethereum.usd;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return null;
    }
  };

  // Function to handle function calls
  const handleFunctionCall = async (
    functionCall: AgentResponse["content"]["functionCall"],
    profile: ProfileData
  ) => {
    if (!functionCall) return;

    switch (functionCall.functionName) {
      case "sendTransaction":
        if (profile.name as `0x${string}`) {
          // 4.1: Grab amount from JSON
          const requestedUsdAmount = parseFloat(
            functionCall.args.amount || "0"
          );
          setAgentSteps((prevSteps) => [
            ...prevSteps,
            {
              label: `Grabbing amount: $${requestedUsdAmount.toFixed(2)}`,
              isLoading: false,
              type: "token",
            },
          ]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          // 4.2: Read preferred token
          setAgentSteps((prevSteps) => [
            ...prevSteps,
            {
              label: "Reading preferred token...",
              isLoading: true,
              type: "token",
            },
          ]);
          await new Promise((resolve) => setTimeout(resolve, 500));
          const { data: updatedPreferredToken } = await refetch();

          console.log("preferredTokenAddress: MEEP", updatedPreferredToken);
          const tokenInfo = getTokenInfo(
            updatedPreferredToken as `0x${string}`
          );
          setAgentSteps((prevSteps) => [
            ...prevSteps.slice(0, -1),
            {
              label: `Preferred Token: <span class="inline-flex items-center"><img src="${tokenInfo.icon}" alt="${tokenInfo.symbol}" class="w-4 h-4 mr-1" />${tokenInfo.symbol}</span>`,
              isLoading: false,
              type: "token",
            },
          ]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          // 4.3 & 4.4: Handle transaction
          const currentEthPrice = await getEthPrice();
          if (!currentEthPrice) {
            setAgentSteps((prevSteps) => [
              ...prevSteps,
              {
                label: "Error: Could not fetch ETH price",
                isLoading: false,
                type: "transaction",
              },
            ]);
            return;
          }

          const ethAmount = requestedUsdAmount / currentEthPrice;
          const amountInWei = BigInt(Math.floor(ethAmount * 1e18));

          const isEth =
            updatedPreferredToken ===
            "0x0000000000000000000000000000000000000000";
          setAgentSteps((prevSteps) => [
            ...prevSteps,
            {
              label: isEth
                ? `Sending ${ethAmount.toFixed(6)} ETH`
                : `Swapping and sending ${ethAmount.toFixed(6)} ETH in USDC on Uniswap v4`,
              isLoading: true,
              type: "transaction",
            },
          ]);

          if (chainId === base.id) {
            console.log("profile.name:", profile.name);
            // Store TransactionWrapper component in state
            setTransactionComponent(
              <TransactionWrapper
                recipient={profile.name as `0x${string}`}
                inputToken={
                  "0x0000000000000000000000000000000000000000" as `0x${string}`
                }
                amount={amountInWei}
                poolKey={{
                  ...faceBuddyConfig[chainId].poolKey,
                  currency0: faceBuddyConfig[chainId].poolKey
                    .currency0 as `0x${string}`,
                  currency1: faceBuddyConfig[chainId].poolKey
                    .currency1 as `0x${string}`,
                  hooks:
                    "0x0000000000000000000000000000000000000000" as `0x${string}`,
                  fee: BigInt(faceBuddyConfig[chainId].poolKey.fee),
                  tickSpacing: BigInt(
                    faceBuddyConfig[chainId].poolKey.tickSpacing
                  ),
                }}
                minAmountOut={BigInt(0)}
                deadline={BigInt(Math.floor(Date.now() / 1000) + 3600)}
                value={amountInWei}
                onSentTx={() => {
                  setAgentSteps((prevSteps) => [
                    ...prevSteps.slice(0, -1),
                    {
                      label: "Transaction sent",
                      isLoading: false,
                      type: "transaction",
                    },
                  ]);
                  setTransactionComponent(null);
                }}
              />
            );
          } else {
            writeContract({
              abi: facebuddyabi,
              address: faceBuddyConfig[chainId]
                .faceBuddyAddress as `0x${string}`,
              functionName: "swapAndSendPreferredToken",
              args: [
                profile.name as `0x${string}`,
                "0x0000000000000000000000000000000000000000" as `0x${string}`,
                amountInWei,
                {
                  ...faceBuddyConfig[chainId].poolKey,
                  currency0: faceBuddyConfig[chainId].poolKey
                    .currency0 as `0x${string}`,
                  currency1: faceBuddyConfig[chainId].poolKey
                    .currency1 as `0x${string}`,
                  hooks:
                    "0x0000000000000000000000000000000000000000" as `0x${string}`,
                },
                BigInt(0),
                BigInt(Math.floor(Date.now() / 1000) + 3600),
              ],
              value: amountInWei,
            });
          }
        }
        break;

      case "connectOnLinkedin":
        if (profile?.linkedin) {
          setAgentSteps((prevSteps) => [
            ...prevSteps,
            {
              label: "Connecting on LinkedIn...",
              isLoading: true,
              type: "connection",
            },
          ]);
          window.open(`https://linkedin.com/in/${profile.linkedin}`, "_blank");
          await new Promise((resolve) => setTimeout(resolve, 500));
          setAgentSteps((prevSteps) => [
            ...prevSteps.slice(0, -1),
            {
              label: "Connected on LinkedIn",
              isLoading: false,
              type: "connection",
            },
          ]);
        }
        break;

      case "connectOnTelegram":
        if (profile?.telegram) {
          setAgentSteps((prevSteps) => [
            ...prevSteps,
            {
              label: "Connecting on Telegram...",
              isLoading: true,
              type: "connection",
            },
          ]);
          window.open(`https://t.me/${profile.telegram}`, "_blank");
          await new Promise((resolve) => setTimeout(resolve, 500));
          setAgentSteps((prevSteps) => [
            ...prevSteps.slice(0, -1),
            {
              label: "Connected on Telegram",
              isLoading: false,
              type: "connection",
            },
          ]);
        }
        break;
    }
  };

  // Function to draw face box and label on canvas
  const drawFaceOnCanvas = async (imageSrc: string, face: any) => {
    if (!canvasRef.current) return;

    const img = await createImageFromDataUrl(imageSrc);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match image
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the image
    ctx.drawImage(img, 0, 0);

    // Draw face box
    const box = face.detection.box;
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw label
    ctx.fillStyle = "#00ff00";
    ctx.font = "16px Arial";
    const label = face.matchedProfile?.name || "Unknown";
    ctx.fillText(label, box.x, box.y - 5);

    // If the user has a Human ID, add a badge
    if (face.matchedProfile?.humanId) {
      // Draw a small badge in the top-right corner of the face box
      const badgeSize = 24;
      const badgeX = box.x + box.width - badgeSize - 5;
      const badgeY = box.y + 5;

      // Draw badge background
      ctx.fillStyle = "#6366F1"; // Indigo color
      ctx.beginPath();
      ctx.arc(
        badgeX + badgeSize / 2,
        badgeY + badgeSize / 2,
        badgeSize / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Draw "H" for Human ID
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("H", badgeX + badgeSize / 2, badgeY + badgeSize / 2);

      // Reset text alignment
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    // Save the canvas as image
    setDetectedFaceImage(canvas.toDataURL());
  };

  // Function to handle agent request
  const handleAgentRequest = async (text: string) => {
    console.log("=== AGENT REQUEST STARTED ===");
    console.log("Transcript:", text);

    SpeechRecognition.stopListening();
    setIsAgentModalOpen(true);
    setCurrentTranscript(text);
    setAgentSteps([]);
    setTransactionAmount(null);

    // Start with face scanning step
    setAgentSteps([
      { label: "Scanning for faces...", isLoading: true, type: "scan" },
    ]);

    try {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();

        if (imageSrc) {
          const imageElement = await createImageFromDataUrl(imageSrc);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const detectedFaces = await detectFacesInImage(
            imageElement,
            savedFaces
          );
          const largestFace = findLargestFace(detectedFaces);

          if (
            largestFace &&
            largestFace.matchedProfile &&
            largestFace.match.label !== "unknown"
          ) {
            await drawFaceOnCanvas(imageSrc, largestFace);
            setCurrentAddress(largestFace.matchedProfile.name);
            setMatchedProfile(largestFace.matchedProfile);

            // Update steps to show face scan complete and start agent call
            setAgentSteps([
              {
                label: `Face Found: ${largestFace.matchedProfile.name}`,
                isLoading: false,
                type: "scan",
              },
              { label: "Calling agent...", isLoading: true, type: "agent" },
            ]);

            await new Promise((resolve) => setTimeout(resolve, 500)); // Minimum step duration

            try {
              const requestBody = {
                prompt: text + JSON.stringify(largestFace.matchedProfile),
                userAddress: address,
              };

              const res = await fetch(
                "https://ai-quickstart.onrender.com/api/generate",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(requestBody),
                }
              );

              if (!res.ok) {
                throw new Error(
                  `Failed to get response from agent: ${res.status}`
                );
              }

              const data: AgentResponse = await res.json();
              console.log("Response:", data);

              // Update steps to show agent response
              const truncatedResponse =
                data.content.text.length > 50
                  ? data.content.text.substring(0, 47) + "..."
                  : data.content.text;

              await new Promise((resolve) => setTimeout(resolve, 500)); // Minimum step duration
              setAgentSteps((prevSteps) => [
                ...prevSteps.slice(0, -1),
                {
                  label: `Agent response received: ${truncatedResponse}`,
                  isLoading: false,
                  type: "agent",
                },
              ]);

              if (data.content.functionCall) {
                const functionCall = data.content.functionCall;
                await handleFunctionCall(
                  functionCall,
                  largestFace.matchedProfile
                );
              }
            } catch (error) {
              setAgentSteps((prevSteps) => [
                ...prevSteps.slice(0, -1),
                {
                  label: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                  isLoading: false,
                  type: "agent",
                },
              ]);
            }
          } else {
            setAgentSteps([
              {
                label: "No recognized faces detected",
                isLoading: false,
                type: "scan",
              },
            ]);
          }
        } else {
          setAgentSteps([
            {
              label: "Failed to capture image",
              isLoading: false,
              type: "scan",
            },
          ]);
        }
      }
    } catch (error) {
      console.log("Error in face detection:", error);
      setAgentSteps([
        {
          label: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          isLoading: false,
          type: "scan",
        },
      ]);
    } finally {
      resetTranscript();
      console.log("=== AGENT REQUEST COMPLETED ===");
    }
  };

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    loadModels();

    // Start listening when component mounts
    if (browserSupportsSpeechRecognition) {
      SpeechRecognition.startListening({ continuous: true });
    }

    // Clean up when component unmounts
    return () => {
      SpeechRecognition.stopListening();
    };
  }, [browserSupportsSpeechRecognition]);

  // Function to get token symbol and icon from address
  const getTokenInfo = (address: `0x${string}`) => {
    console.log("bro this is the addy i got:", address);
    if (
      address === undefined ||
      address.toLowerCase() === "0x0000000000000000000000000000000000000000"
    ) {
      return {
        symbol: "ETH",
        icon: "/eth.png",
      };
    }
    return {
      symbol: "USDC",
      icon: "/usdc.png",
    };
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full h-screen">
      <h2 className="text-xl font-bold mt-4">Connect by Face</h2>

      {/* Transcript display */}
      <div className="w-full max-w-[900px] bg-white p-3 rounded-xl shadow-sm">
        <p className="text-lg font-medium text-center">
          {transcript || "Speak to see your words here..."}
        </p>
      </div>

      {/* Webcam view - takes up remaining space */}
      <div className="w-full max-w-[900px] flex-grow relative">
        <div
          className="rounded-xl overflow-hidden relative"
          style={{ minHeight: "400px", height: "50vh" }}
        >
          {isWebcamLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl flex items-center justify-center z-10">
              <div className="text-gray-500">Loading camera...</div>
            </div>
          )}
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "user",
            }}
            onUserMedia={() => setIsWebcamLoading(false)}
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
      </div>

      {/* Hidden canvas for face labeling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Agent Modal */}
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => {
          setIsAgentModalOpen(false);
          setTransactionComponent(null);
          // Resume speech recognition when agent modal is closed
          if (browserSupportsSpeechRecognition) {
            SpeechRecognition.startListening({ continuous: true });
          }
        }}
        steps={agentSteps}
        transcript={currentTranscript}
      >
        {/* Show labeled face image if available */}
        {detectedFaceImage && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Detected Face</h3>
            <img
              src={detectedFaceImage}
              alt="Detected face"
              className="w-full rounded-lg shadow-sm"
            />
            {matchedProfile?.humanId && (
              <div className="mt-2 flex items-center text-sm">
                <span className="font-medium text-indigo-600">Human ID:</span>
                <span className="ml-2">{matchedProfile.humanId}</span>
                <img
                  src="https://dropsearn.fra1.cdn.digitaloceanspaces.com/media/projects/logos/humanity-protocol_logo_1740112698.webp"
                  alt="Humanity Protocol"
                  className="h-4 ml-2"
                />
              </div>
            )}
          </div>
        )}
        {/* Show transaction component if available */}
        {transactionComponent && (
          <div className="mt-4">{transactionComponent}</div>
        )}
      </AgentModal>
    </div>
  );
}
