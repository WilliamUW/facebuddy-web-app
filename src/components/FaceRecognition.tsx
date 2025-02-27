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

    // Reset agent steps
    setAgentSteps(["Scanning for faces..."]);
    console.log("Step 1: Scanning for faces...");

    // Step 1: Scan for faces
    try {
      // Capture the current frame from webcam
      if (webcamRef.current) {
        console.log("Getting screenshot from webcam");
        const imageSrc = webcamRef.current.getScreenshot();

        if (imageSrc) {
          console.log("Screenshot captured, creating image element");
          // Create an image element from the screenshot
          const imageElement = await createImageFromDataUrl(imageSrc);
          console.log(
            "Image element created, dimensions:",
            imageElement.width,
            "x",
            imageElement.height
          );

          // Detect faces in the image
          console.log(
            "Starting face detection with saved faces:",
            savedFaces.length
          );
          const detectedFaces = await detectFacesInImage(
            imageElement,
            savedFaces
          );
          console.log(
            "Face detection complete, found:",
            detectedFaces.length,
            "faces"
          );

          // Find the largest face
          console.log("Finding largest face");
          const largestFace = findLargestFace(detectedFaces);
          console.log(
            "Largest face result:",
            largestFace ? `Found: ${largestFace.match.label}` : "No face found"
          );

          if (
            largestFace &&
            largestFace.matchedProfile &&
            largestFace.match.label !== "unknown"
          ) {
            console.log("Valid face found:", largestFace.matchedProfile.name);
            setCurrentAddress(largestFace.matchedProfile.name);
            setAgentSteps((prev) => [
              ...prev,
              `Found face: ${largestFace.matchedProfile.name}`,
            ]);

            // Step 2: Send request to agent
            setAgentSteps((prev) => [
              ...prev,
              "Sending request to AI agent...",
            ]);

            try {
              console.log("Preparing API request to agent with data:", {
                prompt: text,
                profile: largestFace.matchedProfile,
              });

              const requestBody = {
                prompt: text + JSON.stringify(largestFace.matchedProfile),
              };

              console.log("Full request body:", JSON.stringify(requestBody));
              console.log(
                "API URL:",
                "https://ai-quickstart.onrender.com/api/generate"
              );
              console.log("API request method:", "POST");
              console.log("API request headers:", {
                "Content-Type": "application/json",
              });

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

              console.log("API response status:", res.status);
              console.log("API response status text:", res.statusText);
              console.log(
                "API response headers:",
                Object.fromEntries([...res.headers.entries()])
              );

              if (!res.ok) {
                const errorText = await res.text();
                console.error("API error response:", errorText);
                throw new Error(
                  `Failed to get response from agent: ${res.status} ${errorText}`
                );
              }

              const data = await res.json();
              console.log("API response data:", JSON.stringify(data, null, 2));
              console.log("API response content:", data.content);
              console.log("API response proof:", data.proof);

              if (data.content && data.content.functionCall) {
                console.log(
                  "Function call detected:",
                  data.content.functionCall.functionName
                );
                console.log(
                  "Function call args:",
                  data.content.functionCall.args
                );
              }

              // Step 3: Process agent response
              setAgentSteps((prev) => [
                ...prev,
                `Agent response: ${data.content.text}`,
              ]);

              // Step 4: Handle function call if present
              if (data.content.functionCall) {
                const functionCall = data.content.functionCall;
                setAgentSteps((prev) => [
                  ...prev,
                  `Executing: ${functionCall.functionName}...`,
                ]);

                // Simulate function execution (e.g., sending ETH)
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Step 5: Completion
                setAgentSteps((prev) => [
                  ...prev,
                  `Done! ${functionCall.functionName} completed successfully.`,
                ]);

                // Send a final request to get a summary
                setAgentSteps((prev) => [...prev, "Generating summary..."]);

                const summaryRequestBody = {
                  prompt: `Summarize what just happened: User said "${text}", we found face for ${largestFace.matchedProfile.name}, and executed ${functionCall.functionName} with args ${JSON.stringify(functionCall.args)}`,
                };

                console.log(
                  "Preparing summary request:",
                  JSON.stringify(summaryRequestBody)
                );
                console.log(
                  "Summary API URL:",
                  "https://ai-quickstart.onrender.com/api/generate"
                );
                console.log("Summary API request method:", "POST");
                console.log("Summary API request headers:", {
                  "Content-Type": "application/json",
                });

                const summaryRes = await fetch(
                  "https://ai-quickstart.onrender.com/api/generate",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(summaryRequestBody),
                  }
                );

                console.log("Summary API response status:", summaryRes.status);
                console.log(
                  "Summary API response status text:",
                  summaryRes.statusText
                );
                console.log(
                  "Summary API response headers:",
                  Object.fromEntries([...summaryRes.headers.entries()])
                );

                if (summaryRes.ok) {
                  const summaryData = await summaryRes.json();
                  console.log(
                    "Summary API response data:",
                    JSON.stringify(summaryData, null, 2)
                  );
                  console.log(
                    "Summary API response content:",
                    summaryData.content
                  );
                  console.log("Summary API response proof:", summaryData.proof);

                  setAgentSteps((prev) => [
                    ...prev,
                    `Summary: ${summaryData.content.text}`,
                  ]);
                } else {
                  const errorText = await summaryRes.text();
                  console.error("Summary API error response:", errorText);
                }
              } else {
                // Step 5: Completion without function call
                setAgentSteps((prev) => [...prev, "Done! No action required."]);
              }
            } catch (error) {
              setAgentSteps((prev) => [
                ...prev,
                `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              ]);
            }
          } else {
            setAgentSteps((prev) => [
              ...prev,
              "No recognized faces detected. Please try again.",
            ]);
          }
        } else {
          setAgentSteps((prev) => [
            ...prev,
            "Failed to capture image from webcam.",
          ]);
        }
      }
    } catch (error) {
      console.log("Error in face detection:", error);
      setAgentSteps((prev) => [
        ...prev,
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        recipientAddress={currentAddress}
      />
    </div>
  );
}
