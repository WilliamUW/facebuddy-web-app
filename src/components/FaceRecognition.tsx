"use client";

import * as faceapi from "face-api.js";

import { useEffect, useRef, useState } from "react";

import { ProfileData } from "./FaceRegistration";
import Webcam from "react-webcam";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import AgentModal from "./AgentModal";
import {
  createImageFromDataUrl,
  detectFacesInImage,
  findLargestFace,
} from "../utility/faceRecognitionUtils";

export interface SavedFace {
  label: ProfileData;
  descriptor: Float32Array;
}

interface Props {
  savedFaces: SavedFace[];
}

export default function FaceRecognition({ savedFaces }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const [isWebcamLoading, setIsWebcamLoading] = useState(true);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");

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

      // Set a new timeout to clear the transcript after 1 second of no new speech
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
      }, 1000); // Changed from 2000 to 1000 (1 second)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [transcript, resetTranscript, isAgentModalOpen]);

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

    // Reset agent steps
    setAgentSteps(["Scanning for faces..."]);

    // Step 1: Scan for faces
    try {
      // Capture the current frame from webcam
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();

        if (imageSrc) {
          // Create an image element from the screenshot
          const imageElement = await createImageFromDataUrl(imageSrc);

          // Add a small delay for visual effect
          await new Promise((resolve) => setTimeout(resolve, 800));

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
            // Set current address for later use
            setCurrentAddress(largestFace.matchedProfile.name);

            // Update face scanning step with result
            setAgentSteps((prev) => [
              ...prev.slice(0, -1),
              `Face scanned: ${largestFace.matchedProfile.name}`,
            ]);

            // Wait a moment before next step
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Step 2: Send request to agent
            setAgentSteps((prev) => [...prev, "Prompting agent..."]);

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

              const data = await res.json();

              // Step 3: Process agent response
              const responseText =
                data.content.text.length > 100
                  ? data.content.text.substring(0, 97) + "..."
                  : data.content.text;

              // Wait a moment before updating
              await new Promise((resolve) => setTimeout(resolve, 500));

              setAgentSteps((prev) => [
                ...prev.slice(0, -1),
                `Agent response: ${responseText}`,
              ]);

              // Step 4: Handle function call if present
              if (data.content.functionCall) {
                const functionCall = data.content.functionCall;
                const functionName = functionCall.functionName;

                // Wait a moment before next step
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Show executing step
                setAgentSteps((prev) => [
                  ...prev,
                  `Executing ${functionName}...`,
                ]);

                // Simulate function execution with a longer delay
                await new Promise((resolve) => setTimeout(resolve, 1500));

                // Generate a random transaction hash
                const txHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

                // Update with transaction completion
                setAgentSteps((prev) => [
                  ...prev.slice(0, -1),
                  `Transaction complete: ${txHash.substring(0, 10)}...`,
                ]);

                // Wait a moment before final step
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Final connection step
                setAgentSteps((prev) => [
                  ...prev,
                  `Connection established with ${largestFace.matchedProfile.name}`,
                ]);
              } else {
                // Wait a moment before final step
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Completion without function call
                setAgentSteps((prev) => [...prev, "No action required"]);
              }
            } catch (error) {
              // Wait a moment before showing error
              await new Promise((resolve) => setTimeout(resolve, 300));

              setAgentSteps((prev) => [
                ...prev,
                `Error: ${error instanceof Error ? error.message.substring(0, 50) : "Unknown error"}`,
              ]);
            }
          } else {
            setAgentSteps((prev) => [
              ...prev.slice(0, -1),
              "No recognized faces detected",
            ]);
          }
        } else {
          setAgentSteps((prev) => [
            ...prev.slice(0, -1),
            "Failed to capture image",
          ]);
        }
      }
    } catch (error) {
      console.log("Error in face detection:", error);
      setAgentSteps((prev) => [
        ...prev,
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
      />
    </div>
  );
}
