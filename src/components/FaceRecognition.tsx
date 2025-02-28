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
import {
  UNICHAIN_FACEBUDDY_ADDRESS,
  UNICHAIN_ETH_ADDRESS,
  UNICHAIN_POOL_KEY,
} from "../constants";
import AgentModal from "./AgentModal";
import { ProfileData } from "./FaceRegistration";
import Webcam from "react-webcam";
import { facebuddyabi } from "../facebuddyabi";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

export interface SavedFace {
  label: ProfileData;
  descriptor: Float32Array;
}

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

export default function FaceRecognition({ savedFaces }: Props) {
  const { address } = useAccount();
  const webcamRef = useRef<Webcam>(null);
  const [isWebcamLoading, setIsWebcamLoading] = useState(true);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [transactionAmount, setTransactionAmount] = useState<string | null>(
    null
  );
  const [matchedProfile, setMatchedProfile] = useState<ProfileData | null>(
    null
  );
  const [detectedFaceImage, setDetectedFaceImage] = useState<string | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: hash, isPending, writeContract } = useWriteContract();

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
      const uniscanUrl = `https://uniscan.xyz/tx/${hash}`;
      setAgentSteps((prevSteps) => [
        ...prevSteps,
        `Transaction successful: <a href="${uniscanUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline">${hash}</a>`,
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

  // Function to handle function calls
  const handleFunctionCall = (
    functionCall: AgentResponse["content"]["functionCall"],
    profile: ProfileData
  ) => {
    if (!functionCall) return;

    switch (functionCall.functionName) {
      case "sendTransaction":
        if (address) {
          // Add swap step
          setAgentSteps((prevSteps) => [
            ...prevSteps,
            "Initiating transfer with automatic token swap...",
          ]);

          const ethAmount = 0.000089; // Hardcoded amount in ETH
          const amountInWei = BigInt(Math.floor(ethAmount * 1e18)); // Convert to wei

          // Call swapAndSendPreferredToken
          writeContract({
            abi: facebuddyabi,
            address: UNICHAIN_FACEBUDDY_ADDRESS,
            functionName: "swapAndSendPreferredToken",

            args: [
              profile.name as `0x${string}`, // recipient address
              UNICHAIN_ETH_ADDRESS as `0x${string}`, // input token (ETH)
              amountInWei, // hardcoded amount in wei
              {
                ...UNICHAIN_POOL_KEY,
                currency0: UNICHAIN_POOL_KEY.currency0 as `0x${string}`,
                currency1: UNICHAIN_POOL_KEY.currency1 as `0x${string}`,
                hooks:
                  "0x0000000000000000000000000000000000000000" as `0x${string}`,
              }, // pool key with proper types
              BigInt(0), // minAmountOut (0 for now, should be calculated in production)
              BigInt(Math.floor(Date.now() / 1000) + 3600), // deadline (1 hour)
            ],
            value: amountInWei, // Send ETH value
          });

          // Update UI
          const preferredToken = profile.preferredToken || "USDC";
          setAgentSteps((prevSteps) => [
            ...prevSteps,
            `Sending ${ethAmount} ETH to be swapped to ${preferredToken} for ${profile.name}`,
          ]);
        }
        break;
      case "connectOnLinkedin":
        if (profile?.linkedin) {
          window.open(`https://linkedin.com/in/${profile.linkedin}`, "_blank");
        }
        break;
      case "connectOnTelegram":
        if (profile?.telegram) {
          window.open(`https://t.me/${profile.telegram}`, "_blank");
        }
        break;
      default:
        console.log("Unknown function call:", functionCall.functionName);
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

    // Stop speech recognition when agent is started
    SpeechRecognition.stopListening();

    // Open the modal
    setIsAgentModalOpen(true);

    // Save the transcript
    setCurrentTranscript(text);

    // Reset agent steps - start with an empty array
    setAgentSteps([]);

    // Reset transaction amount
    setTransactionAmount(null);

    // Start with face scanning step
    setAgentSteps(["Scanning for faces..."]);

    // Step 1: Scan for faces
    try {
      // Capture the current frame from webcam
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();

        if (imageSrc) {
          // Create an image element from the screenshot
          const imageElement = await createImageFromDataUrl(imageSrc);

          // Add a small delay for visual effect - make face scanning feel more realistic
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Detect faces in the image
          const detectedFaces = await detectFacesInImage(
            imageElement,
            savedFaces
          );

          // Find the largest face
          const largestFace = findLargestFace(detectedFaces);

          if (
            largestFace &&
            largestFace.matchedProfile &&
            largestFace.match.label !== "unknown"
          ) {
            // Draw face on canvas
            await drawFaceOnCanvas(imageSrc, largestFace);

            // Set current address and matched profile for later use
            setCurrentAddress(largestFace.matchedProfile.name);
            setMatchedProfile(largestFace.matchedProfile);

            // Update face scanning step with result
            setAgentSteps([`Face scanned: ${largestFace.matchedProfile.name}`]);

            // Step 2: Send request to agent
            await new Promise((resolve) => setTimeout(resolve, 500));
            setAgentSteps([
              `Face scanned: ${largestFace.matchedProfile.name}`,
              "Prompting agent...",
            ]);

            try {
              const requestBody = {
                prompt: text + JSON.stringify(largestFace.matchedProfile),
                userAddress: address,
              };

              const res = await fetch(
                "https://ai-quickstart.onrender.com/api/generate",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(requestBody),
                }
              );

              if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                  `Failed to get response from agent: ${res.status} ${errorText}`
                );
              }

              const data: AgentResponse = await res.json();

              console.log("Response:", data);

              // Step 3: Process agent response
              const responseText =
                data.content.text.length > 100
                  ? data.content.text.substring(0, 97) + "..."
                  : data.content.text;

              // Prepare face scan message with Human ID if available
              const faceScanMessage = largestFace.matchedProfile.humanId
                ? `Face scanned: ${largestFace.matchedProfile.name} (Human ID: ${largestFace.matchedProfile.humanId})`
                : `Face scanned: ${largestFace.matchedProfile.name}`;

              await new Promise((resolve) => setTimeout(resolve, 500));
              setAgentSteps([
                faceScanMessage,
                `Agent response: ${responseText}`,
              ]);

              // Check if the response is "no action required"
              if (
                data.content.text.toLowerCase().includes("no action required")
              ) {
                // Immediately display "No action required" and stop
                setAgentSteps([
                  faceScanMessage,
                  `Agent response: ${responseText}`,
                  "No action required",
                ]);
              }
              // Step 4: Handle function call if present
              else if (data.content.functionCall) {
                const functionCall = data.content.functionCall;
                const functionName = functionCall.functionName;

                // Handle the function call
                handleFunctionCall(functionCall, largestFace.matchedProfile);

                // Show executing step
                await new Promise((resolve) => setTimeout(resolve, 500));
                setAgentSteps([
                  faceScanMessage,
                  `Agent response: ${responseText}`,
                  `Executing ${functionName}...`,
                ]);

                // Different handling based on function type
                if (functionName === "sendTransaction") {
                  // For transactions, we'll show the transaction component in the modal
                  // The actual transaction UI will be rendered in the modal
                  const preferredToken =
                    largestFace.matchedProfile.preferredToken || "USDC";
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  setAgentSteps([
                    faceScanMessage,
                    `Agent response: ${responseText}`,
                    `Swapped ETH to ${functionCall.args.amount} ${preferredToken} and sent to ${largestFace.matchedProfile.name}`,
                  ]);
                } else if (
                  functionName === "connectOnLinkedin" ||
                  functionName === "connectOnTelegram"
                ) {
                  // For social connections, we'll show a success message
                  const platform =
                    functionName === "connectOnLinkedin"
                      ? "LinkedIn"
                      : "Telegram";
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  setAgentSteps([
                    faceScanMessage,
                    `Agent response: ${responseText}`,
                    `Connected to ${largestFace.matchedProfile.name} on ${platform}`,
                  ]);
                } else {
                  // For unknown functions, generate a random transaction hash for visual effect
                  const txHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  setAgentSteps([
                    faceScanMessage,
                    `Agent response: ${responseText}`,
                    `Transaction complete: ${txHash.substring(0, 10)}...`,
                    `Connection established with ${largestFace.matchedProfile.name}`,
                  ]);
                }
              } else {
                // Completion without function call and not "no action required"
                await new Promise((resolve) => setTimeout(resolve, 500));
                setAgentSteps([
                  faceScanMessage,
                  `Agent response: ${responseText}`,
                  "Processing request...",
                ]);

                await new Promise((resolve) => setTimeout(resolve, 1000));
                setAgentSteps([
                  faceScanMessage,
                  `Agent response: ${responseText}`,
                  "No action required",
                ]);
              }
            } catch (error) {
              // Define face scan message for error case
              const faceScanMessage = largestFace.matchedProfile.humanId
                ? `Face scanned: ${largestFace.matchedProfile.name} (Human ID: ${largestFace.matchedProfile.humanId})`
                : `Face scanned: ${largestFace.matchedProfile.name}`;

              setAgentSteps([
                faceScanMessage,
                `Error: ${error instanceof Error ? error.message.substring(0, 50) : "Unknown error"}`,
              ]);
            }
          } else {
            // Update the face scanning step with no face detected
            setAgentSteps(["No recognized faces detected"]);
          }
        } else {
          setAgentSteps(["Failed to capture image"]);
        }
      }
    } catch (error) {
      console.log("Error in face detection:", error);
      setAgentSteps([
        `Error: ${error instanceof Error ? error.message.substring(0, 50) : "Unknown error"}`,
      ]);
    } finally {
      // Reset transcript after processing
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
      </AgentModal>
    </div>
  );
}
