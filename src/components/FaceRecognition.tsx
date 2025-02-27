"use client";

import * as faceapi from "face-api.js";

import { useEffect, useRef, useState } from "react";

import { ProfileData } from "./FaceRegistration";
import Webcam from "react-webcam";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

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

    if (transcript) {
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Set a new timeout to clear the transcript after 2 seconds of no new speech
      timeoutId = setTimeout(() => {
        resetTranscript();
      }, 2000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [transcript, resetTranscript]);

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
            style={{ minHeight: "500px" }}
          >
            <div className="text-gray-500">Loading camera...</div>
          </div>
        )}
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 900,
            height: 500,
            facingMode: "user",
          }}
          onUserMedia={() => setIsWebcamLoading(false)}
          className="w-full rounded-xl"
          style={{ minHeight: "500px" }}
        />
      </div>
    </div>
  );
}
