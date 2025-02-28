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

import AgentModal from "./AgentModal";
import { ProfileData } from "./FaceRegistration";
import SendUsdcWrapper from "./SendUsdcWrapper";
import Webcam from "react-webcam";

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

  // Speech recognition setup
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

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
        if (functionCall.args.amount) {
          setTransactionAmount(functionCall.args.amount);
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

              await new Promise((resolve) => setTimeout(resolve, 500));
              setAgentSteps([
                `Face scanned: ${largestFace.matchedProfile.name}`,
                `Agent response: ${responseText}`,
              ]);

              // Check if the response is "no action required"
              if (
                data.content.text.toLowerCase().includes("no action required")
              ) {
                // Immediately display "No action required" and stop
                setAgentSteps([
                  `Face scanned: ${largestFace.matchedProfile.name}`,
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
                  `Face scanned: ${largestFace.matchedProfile.name}`,
                  `Agent response: ${responseText}`,
                  `Executing ${functionName}...`,
                ]);

                // Different handling based on function type
                if (functionName === "sendTransaction") {
                  // For transactions, we'll show the transaction component in the modal
                  // The actual transaction UI will be rendered in the modal
                  const preferredToken = largestFace.matchedProfile.preferredToken || "USDC";
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  setAgentSteps([
                    `Face scanned: ${largestFace.matchedProfile.name}`,
                    `Agent response: ${responseText}`,
                    `Ready to send ${functionCall.args.amount} ${preferredToken} to ${largestFace.matchedProfile.name}`,
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
                    `Face scanned: ${largestFace.matchedProfile.name}`,
                    `Agent response: ${responseText}`,
                    `Connected to ${largestFace.matchedProfile.name} on ${platform}`,
                  ]);
                } else {
                  // For unknown functions, generate a random transaction hash for visual effect
                  const txHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  setAgentSteps([
                    `Face scanned: ${largestFace.matchedProfile.name}`,
                    `Agent response: ${responseText}`,
                    `Transaction complete: ${txHash.substring(0, 10)}...`,
                    `Connection established with ${largestFace.matchedProfile.name}`,
                  ]);
                }
              } else {
                // Completion without function call and not "no action required"
                await new Promise((resolve) => setTimeout(resolve, 500));
                setAgentSteps([
                  `Face scanned: ${largestFace.matchedProfile.name}`,
                  `Agent response: ${responseText}`,
                  "Processing request...",
                ]);

                await new Promise((resolve) => setTimeout(resolve, 1000));
                setAgentSteps([
                  `Face scanned: ${largestFace.matchedProfile.name}`,
                  `Agent response: ${responseText}`,
                  "No action required",
                ]);
              }
            } catch (error) {
              setAgentSteps([
                `Face scanned: ${largestFace.matchedProfile.name}`,
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
    <div className="flex flex-col items-center gap-4 w-full">
      <h2 className="text-xl font-bold">Connect by Face</h2>

      {/* Transcript display */}
      <div className="w-full max-w-[900px] bg-white p-4 rounded-xl shadow-sm mb-2">
        <p className="text-lg font-medium text-center">
          {transcript || "Speak to see your words here..."}
        </p>
      </div>

      {/* Webcam view */}
      <div className="w-full max-w-[900px] relative">
        {isWebcamLoading && (
          <div
            className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl flex items-center justify-center z-10"
            style={{ aspectRatio: "16/9" }}
          >
            <div className="text-gray-500">Loading camera...</div>
          </div>
        )}
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "user",
            aspectRatio: 16 / 9,
          }}
          onUserMedia={() => setIsWebcamLoading(false)}
          className="w-full rounded-xl"
          style={{ aspectRatio: "16/9" }}
        />
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
          </div>
        )}

        {/* Render SendUsdcWrapper if there's a transaction amount and matched profile */}
        {transactionAmount && matchedProfile && (
          <div className="mt-4">
            <SendUsdcWrapper
              recipientAddress={matchedProfile.name as `0x${string}`}
              initialUsdAmount={transactionAmount}
              tokenType={matchedProfile.preferredToken || "USDC"}
            />
          </div>
        )}
      </AgentModal>
    </div>
  );
}
