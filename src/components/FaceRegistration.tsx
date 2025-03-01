"use client";

import * as faceapi from "face-api.js";

import {
  createImageFromDataUrl,
  detectFacesInImage,
  findLargestFace,
} from "../utility/faceRecognitionUtils";
import { issueCredentials, listCredentials } from "../utility/humanityProtocol";
import { useChainId, useWriteContract } from "wagmi";
import { useEffect, useRef, useState } from "react";

import React from "react";
import RegisterWrapper from "./RegisterWrapper";
import { USDC_ABI } from "../usdcabi";
import Webcam from "react-webcam";
import { base } from "viem/chains";
import { faceBuddyConfig } from "../constants";
import { facebuddyabi } from "../facebuddyabi";
import { storeStringAndGetBlobId } from "../utility/walrus";
import { useAccount } from "wagmi";

const WebcamComponent = () => <Webcam />;
const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};
export interface ProfileData {
  name: string;
  linkedin?: string;
  telegram?: string;
  twitter?: string;
  preferredToken?: string; // Default will be "USDC"
  humanId?: string; // Optional Human ID field
}

interface SavedFace {
  label: ProfileData;
  descriptor: Float32Array;
}

interface DetectedFace {
  detection: faceapi.FaceDetection;
  descriptor: Float32Array;
  isSelected?: boolean;
  label: ProfileData;
}

interface Props {
  onFaceSaved: (faces: SavedFace[]) => void;
  savedFaces: SavedFace[];
}

export default function FaceRegistration({ onFaceSaved, savedFaces }: Props) {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();
  const chainId = useChainId();
  const webcamRef = useRef<Webcam>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [saveFace2Called, setSaveFace2Called] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: address ?? "",
    linkedin: "",
    telegram: "",
    twitter: "",
    preferredToken: "USDC",
    humanId: "",
  });

  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(
    null
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Define transaction data types
  interface TransactionArg {
    recipientAddress?: string;
    amount?: string;
    ticker?: string;
    username?: string; // Add username for social media connections
  }

  interface FunctionCall {
    functionName: string;
    args: TransactionArg;
  }

  interface TransactionResult {
    text: string;
    functionCall?: FunctionCall;
  }

  interface Transaction {
    result: TransactionResult;
    hasProof: boolean;
    timestamp: string;
    userAddress: string;
    sequence: number;
  }

  interface TransactionData {
    walletAddress: string;
    transactionCount: number;
    transactions: Transaction[];
  }

  //   useEffect(() => {
  //     if (address) {
  //       setProfile(prev => ({ ...prev, name: address }));
  //     }
  //   }, [address]);

  const uploadFaceData = async (data: any) => {
    // Convert Float32Array to regular arrays before serializing
    const serializedData = data.map((face: any) => ({
      ...face,
      descriptor: Array.from(face.descriptor), // Convert Float32Array to regular array
    }));

    const hash = storeStringAndGetBlobId(JSON.stringify(serializedData)).then(
      (hash) => {
        console.log("data uploaded " + hash);
      }
    );
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
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    loadModels();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setSelectedFaceIndex(null);
      setDetectedFaces([]);
      setProfile({
        name: address ?? "",
        linkedin: "",
        telegram: "",
        twitter: "",
        preferredToken: "USDC",
        humanId: "",
      });
    }
  };

  const handleUserMediaError = React.useCallback(
    (error: string | DOMException) => {
      console.error("Webcam error:", error);
      setIsLoading(false);
      setWebcamError(
        typeof error === "string"
          ? error
          : "Could not access webcam. Please make sure you have granted camera permissions."
      );
    },
    []
  );

  const capturePhoto = React.useCallback(() => {
    if (webcamRef.current) {
      setIsCapturing(true);
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          setSelectedImage(imageSrc);
          setSelectedFaceIndex(null);
          setDetectedFaces([]);
          setProfile({
            name: address ?? "",
            linkedin: "",
            telegram: "",
            twitter: "",
            preferredToken: "USDC",
            humanId: "",
          });
          setIsSpinning(true);

          // We need to wait for the image to be set before detecting faces
          setTimeout(() => {
            if (imageRef.current) {
              detectFaces();
            }
            setIsCapturing(false);
          }, 100);
        } else {
          setIsCapturing(false);
          alert("Failed to capture photo. Please try again.");
        }
      } catch (error) {
        console.error("Error capturing photo:", error);
        setIsCapturing(false);
        alert("Error capturing photo. Please try again.");
      }
    }
  }, [webcamRef, address]);

  // Function to reset the UI when retaking photo
  const handleRetakePhoto = () => {
    setIsLoading(true);
    setSelectedImage(null);
    setSelectedFaceIndex(null);
    setDetectedFaces([]);
    setProfile({
      name: address ?? "",
      linkedin: "",
      telegram: "",
      twitter: "",
      preferredToken: "USDC",
      humanId: "",
    });
    setIsSpinning(false);

    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const detectFaces = async () => {
    if (!imageRef.current || !canvasRef.current || !isModelLoaded) return;

    setIsDetecting(true);
    try {
      const displaySize = {
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      };

      faceapi.matchDimensions(canvasRef.current, displaySize);

      // Make sure the image is fully loaded
      if (!imageRef.current.complete) {
        await new Promise((resolve) => {
          imageRef.current!.onload = resolve;
        });
      }

      const fullFaceDescriptions = await faceapi
        .detectAllFaces(imageRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(
        fullFaceDescriptions,
        displaySize
      );

      const detectedFacesData = resizedDetections.map(
        ({ detection, descriptor }, index) => ({
          detection,
          descriptor,
          label:
            index === 0
              ? profile
              : {
                  name: `Face ${index + 1}`,
                  linkedin: "",
                  telegram: "",
                  twitter: "",
                  preferredToken: "USDC",
                  humanId: "",
                },
        })
      );

      if (detectedFacesData.length === 0) {
        alert("No faces detected. Please try again with a clearer image.");
        setIsSpinning(false);
      } else {
        // Store the detected faces but don't update UI yet
        const processedFaces = detectedFacesData;

        // Find the largest face by area (width * height)
        let largestFaceIndex = 0;
        let largestFaceArea = 0;

        processedFaces.forEach((face, index) => {
          const area = face.detection.box.width * face.detection.box.height;
          if (area > largestFaceArea) {
            largestFaceArea = area;
            largestFaceIndex = index;
          }
        });

        // Generate random processing time between 1-3 seconds
        const processingTime = Math.floor(Math.random() * 1000) + 3000; // 1000-3000ms

        // Show animation for the random duration
        setTimeout(() => {
          // Update UI after the random processing time
          setDetectedFaces(processedFaces);
          setSelectedFaceIndex(largestFaceIndex);
          setIsSpinning(false);
        }, processingTime);
      }
    } catch (error) {
      console.error("Error detecting faces:", error);
      alert("Error detecting faces. Please try again.");
      setIsSpinning(false);
    } finally {
      setIsDetecting(false);
    }
  };

  const drawFaces = () => {
    if (!canvasRef.current || !detectedFaces.length) return;

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      detectedFaces.forEach(({ detection, label }, index) => {
        const isSelected = index === selectedFaceIndex;
        const displayLabel = typeof label === "string" ? label : label.name;
        const drawBox = new faceapi.draw.DrawBox(detection.box, {
          label: displayLabel,
          boxColor: isSelected ? "#00ff00" : "#ffd700",
        });
        drawBox.draw(canvasRef.current!);
      });
    }
  };

  useEffect(() => {
    drawFaces();
  }, [detectedFaces, selectedFaceIndex]);

  const saveFace = async () => {
    if (
      !imageRef.current ||
      !isModelLoaded ||
      !profile.name ||
      selectedFaceIndex === null
    ) {
      alert("Please enter at least a name and select a face");
      return;
    }

    // Start the registration process with loading spinner
    setIsRegistering(true);

    try {
      const selectedFace = detectedFaces[selectedFaceIndex];
      if (!selectedFace) {
        setIsRegistering(false);
        return;
      }

      // Set preferred token on-chain
      if (profile.preferredToken) {
        const tokenAddress =
          profile.preferredToken === "USDC"
            ? faceBuddyConfig[chainId].usdcAddress // USDC address
            : profile.preferredToken === "ETH"
              ? "0x0000000000000000000000000000000000000000" // Native ETH address
              : faceBuddyConfig[chainId].usdcAddress; // Default to USDC for other tokens

        // First set the preferred token
        await writeContract({
          abi: facebuddyabi,
          address: faceBuddyConfig[chainId].faceBuddyAddress as `0x${string}`,
          functionName: "setPreferredToken",
          args: [tokenAddress as `0x${string}`, profile.name as `0x${string}`],
        });

        // Approve faxebuddy usdc sending
        await writeContract({
          abi: USDC_ABI,
          address: faceBuddyConfig[chainId].usdcAddress as `0x${string}`,
          functionName: "approve",
          args: [
            faceBuddyConfig[chainId].faceBuddyAddress as `0x${string}`,
            BigInt(
              "115792089237316195423570985008687907853269984665640564039457584007913129639935"
            ),
          ], // max uint256
        });
      }

      const updatedFaces = detectedFaces.map((face, index) =>
        index === selectedFaceIndex ? { ...face, label: profile } : face
      );
      setDetectedFaces(updatedFaces);

      const savedFace: SavedFace = {
        label: profile,
        descriptor: selectedFace.descriptor,
      };

      // Save the face data
      onFaceSaved([savedFace]);

      // Upload face data
      uploadFaceData(updatedFaces);

      issueCredentials(profile.name, profile);

      // Generate random processing time between 1-3 seconds
      const processingTime = Math.floor(Math.random() * 2000) + 1000;

      // Show loading spinner for the random duration
      setTimeout(() => {
        // Update UI after the random processing time
        setIsRegistering(false);
        setIsFaceRegistered(true);
      }, processingTime);
    } catch (error) {
      console.error("Error saving face:", error);
      setIsRegistering(false);
    }
  };

  const saveFace2 = async () => {
    if (saveFace2Called) return;
    setSaveFace2Called(true);
    if (
      !imageRef.current ||
      !isModelLoaded ||
      !profile.name ||
      selectedFaceIndex === null
    ) {
      alert("Please enter at least a name and select a face");
      return;
    }

    // Start the registration process with loading spinner
    setIsRegistering(true);

    try {
      const selectedFace = detectedFaces[selectedFaceIndex];
      if (!selectedFace) {
        setIsRegistering(false);
        return;
      }

      const updatedFaces = detectedFaces.map((face, index) =>
        index === selectedFaceIndex ? { ...face, label: profile } : face
      );
      setDetectedFaces(updatedFaces);

      const savedFace: SavedFace = {
        label: profile,
        descriptor: selectedFace.descriptor,
      };

      // Save the face data
      onFaceSaved([savedFace]);

      // Upload face data
      uploadFaceData(updatedFaces);

      issueCredentials(profile.name, profile);

      // Generate random processing time between 1-3 seconds
      const processingTime = Math.floor(Math.random() * 2000) + 1000;

      // Show loading spinner for the random duration
      setTimeout(() => {
        // Update UI after the random processing time
        setIsRegistering(false);
        setIsFaceRegistered(true);
      }, processingTime);
    } catch (error) {
      console.error("Error saving face:", error);
      setIsRegistering(false);
    }
  };

  // Function to navigate to the Recognize page
  const goToRecognizePage = () => {
    // This will navigate to the "recognize" view which contains the recognition functionality
    window.dispatchEvent(new CustomEvent("navigate-to-recognize"));
  };

  // Function to fetch and display credentials
  const handleListCredentials = async () => {
    if (!address) return;

    setIsLoadingCredentials(true);
    try {
      const data = await listCredentials(`did:ethr:${address.toLowerCase()}`);
      setCredentials(data);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      setCredentials({ error: "Failed to fetch credentials" });
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const fetchTransactions = async () => {
    if (!address) return;

    setIsLoadingTransactions(true);
    setTransactionError(null);
    try {
      // Replace with actual API call to fetch transactions
      const response = await fetch(
        `http://localhost:4000/api/transactions/${address}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch transaction data");
      }
      const data: TransactionData = await response.json();
      setTransactionData(data);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      setTransactionError("Failed to fetch transaction data");
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h2 className="text-xl font-bold">Profile</h2>
      <h2 className="text-l">Register by Taking a Picture of Yourself!</h2>

      <div className="flex flex-col md:flex-row w-full max-w-[900px] gap-4">
        {/* Left side: Webcam or captured image */}
        <div className="flex-1 w-full md:w-auto">
          <div
            className="rounded-xl overflow-hidden relative"
            style={{ minHeight: "400px", height: "50vh" }}
          >
            {webcamError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl absolute inset-0 flex flex-col items-center justify-center">
                <p>{webcamError}</p>
                <p className="text-sm mt-2">
                  Please try again after allowing camera access.
                </p>
              </div>
            ) : selectedImage ? (
              // Show captured image with face detection
              <div className="relative w-full h-full">
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Selected"
                  className="w-full h-full object-cover rounded-xl"
                  onLoad={detectFaces}
                  crossOrigin="anonymous"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 z-10 w-full h-full"
                />
                {isDetecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Webcam loading skeleton */}
                {isLoading && (
                  <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl flex items-center justify-center">
                    <div className="text-gray-500">Loading camera...</div>
                  </div>
                )}
                {/* Show webcam */}
                <Webcam
                  audio={false}
                  height={720}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width={1280}
                  videoConstraints={videoConstraints}
                  onUserMediaError={handleUserMediaError}
                  onUserMedia={() => setIsLoading(false)}
                  className={`rounded-xl w-full h-full object-cover ${isLoading ? "opacity-0" : "opacity-100"}`}
                />
              </>
            )}
          </div>

          {/* Comment out file upload
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="mb-4 w-full"
          />
          */}
        </div>

        {/* Right side: Register face button or face selection */}
        <div
          className="flex flex-col gap-4 w-full md:w-[300px] h-full"
          style={{ minHeight: "400px" }}
        >
          {/* For mobile: Capture/Retake button appears first (above the form) */}
          <div className="border rounded-lg p-4 bg-white md:order-2 order-1">
            {selectedImage ? (
              isFaceRegistered ? (
                <button
                  onClick={goToRecognizePage}
                  className="px-4 py-2 rounded text-white w-full bg-blue-500 hover:bg-blue-600"
                >
                  &larr; Go to Recognize page
                </button>
              ) : (
                <button
                  onClick={handleRetakePhoto}
                  className="px-4 py-2 rounded text-white w-full bg-gray-500 hover:bg-gray-600"
                >
                  Retake photo
                </button>
              )
            ) : (
              !webcamError && (
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing || isLoading}
                  className={`px-4 py-2 rounded text-white w-full ${
                    isCapturing || isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {isCapturing
                    ? "Capturing..."
                    : isLoading
                      ? "Loading camera..."
                      : "Capture photo"}
                </button>
              )
            )}
          </div>

          {/* First container: Message or registration form */}
          {detectedFaces.length > 0 && selectedFaceIndex !== null ? (
            <div className="border rounded-lg p-4 bg-white flex-grow flex flex-col justify-between md:order-1 order-2 relative">
              {/* Registration loading overlay */}
              {isRegistering && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-10 rounded-lg">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
                  <p className="text-blue-600 font-medium">
                    Registering your face...
                  </p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {isFaceRegistered ? "Face Registered!" : "Register Your Face"}
                </h3>
                {isFaceRegistered && (
                  <p className="text-green-600 mb-2">
                    Head over to "Send" to start paying people!
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      !isFaceRegistered &&
                      setProfile((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder={address}
                    className={`px-2 py-1 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""}`}
                    disabled={isFaceRegistered || isRegistering}
                  />
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.linkedin || ""}
                      onChange={(e) =>
                        !isFaceRegistered &&
                        setProfile((prev) => ({
                          ...prev,
                          linkedin: e.target.value,
                        }))
                      }
                      placeholder="LinkedIn username (optional)"
                      className={`px-2 py-1 pl-9 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""} border-blue-400 focus:ring-blue-500 focus:border-blue-500`}
                      disabled={isFaceRegistered || isRegistering}
                    />
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="#0077B5"
                        className="w-5 h-5"
                      >
                        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.telegram || ""}
                      onChange={(e) =>
                        !isFaceRegistered &&
                        setProfile((prev) => ({
                          ...prev,
                          telegram: e.target.value,
                        }))
                      }
                      placeholder="Telegram username (optional)"
                      className={`px-2 py-1 pl-9 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""} border-blue-300 focus:ring-blue-400 focus:border-blue-400`}
                      disabled={isFaceRegistered || isRegistering}
                    />
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="#0088cc"
                        className="w-5 h-5"
                      >
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.515 7.143c-.112.54-.53.664-.854.413l-2.355-1.735-1.138 1.093c-.125.126-.23.232-.468.232l.167-2.378 4.326-3.908c.189-.168-.041-.262-.291-.094L7.564 12.75l-2.295-.714c-.498-.155-.507-.498.103-.736l8.964-3.453c.41-.155.771.103.643.632z"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.twitter || ""}
                      onChange={(e) =>
                        !isFaceRegistered &&
                        setProfile((prev) => ({
                          ...prev,
                          twitter: e.target.value,
                        }))
                      }
                      placeholder="Twitter username (optional)"
                      className={`px-2 py-1 pl-9 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""} border-blue-400 focus:ring-blue-400 focus:border-blue-400`}
                      disabled={isFaceRegistered || isRegistering}
                    />
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="#1DA1F2"
                        className="w-5 h-5"
                      >
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path>
                      </svg>
                    </div>
                  </div>

                  {/* Preferred Token Selection */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Token for Transactions
                    </label>
                    <div className="flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none mt-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="#2775CA"
                          className="w-5 h-5 mt-1"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path
                            fill="white"
                            d="M12.75 14.4v1.2h2.1v1.2h-2.1v1.5h-1.5v-1.5h-2.1v-1.2h2.1v-1.2h-2.1v-1.2h1.5l-2.1-2.1 1.05-1.05 2.55 2.55 2.55-2.55 1.05 1.05-2.1 2.1h1.5v1.2h-2.1z"
                          />
                        </svg>
                      </div>
                      <select
                        value={profile.preferredToken || "USDC"}
                        onChange={(e) =>
                          !isFaceRegistered &&
                          setProfile((prev) => ({
                            ...prev,
                            preferredToken: e.target.value,
                          }))
                        }
                        className={`px-2 py-1 pl-9 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""} border-blue-500 focus:ring-blue-500 focus:border-blue-500`}
                        disabled={isFaceRegistered || isRegistering}
                      >
                        <option value="USDC">USDC</option>
                        <option value="ETH">ETH</option>
                        <option value="USDT">USDT</option>
                        <option value="DAI">DAI</option>
                        <option value="WBTC">WBTC</option>
                      </select>
                    </div>
                  </div>

                  {/* Human ID Field */}
                  <div className="relative mt-3">
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <span>Human ID</span>
                      <span className="ml-1 text-xs text-gray-500">
                        (optional)
                      </span>
                    </label>
                    <div className="flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <img
                          src="https://dropsearn.fra1.cdn.digitaloceanspaces.com/media/projects/logos/humanity-protocol_logo_1740112698.webp"
                          alt="Humanity Protocol"
                          className="h-5 w-5"
                        />
                      </div>
                      <input
                        type="text"
                        value={profile.humanId || ""}
                        onChange={(e) =>
                          !isFaceRegistered &&
                          setProfile((prev) => ({
                            ...prev,
                            humanId: e.target.value,
                          }))
                        }
                        placeholder="Enter your Human ID (if you have one)"
                        className={`px-2 py-1 pl-9 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""} border-indigo-400 focus:ring-indigo-500 focus:border-indigo-500`}
                        disabled={isFaceRegistered || isRegistering}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Verify your identity with Humanity Protocol
                    </p>
                  </div>
                </div>
              </div>

              {!isFaceRegistered &&
                (chainId == base.id ? (
                  <RegisterWrapper
                    token={
                      profile.preferredToken === "USDC"
                        ? (faceBuddyConfig[chainId]
                            .usdcAddress as `0x${string}`)
                        : profile.preferredToken === "ETH"
                          ? "0x0000000000000000000000000000000000000000"
                          : (faceBuddyConfig[chainId]
                              .usdcAddress as `0x${string}`)
                    }
                    who={profile.name as `0x${string}`}
                    onSentTx={saveFace2}
                  />
                ) : (
                  <button
                    onClick={saveFace}
                    disabled={!profile.name || isRegistering}
                    className={`px-4 py-2 rounded w-full mt-4 ${
                      !profile.name || isRegistering
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    } text-white`}
                  >
                    {isRegistering ? "Registering..." : "Register Face"}
                  </button>
                ))}
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-white flex-grow flex flex-col items-center justify-center relative md:order-1 order-2">
              {/* 3D Head Visualization */}
              <div className="w-32 h-32 mb-4 relative">
                {/* 3D Head */}
                <div
                  className={`w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-100 relative ${isSpinning ? "animate-spin" : ""}`}
                  style={{
                    transformStyle: "preserve-3d",
                    perspective: "1000px",
                    animation: isSpinning ? "spin 3s linear infinite" : "none",
                  }}
                >
                  {/* Face features */}
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 flex flex-col items-center justify-center">
                    {/* Eyes */}
                    <div className="flex w-full justify-around mb-2">
                      <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                    </div>
                    {/* Mouth */}
                    <div className="w-1/2 h-1 bg-gray-700 rounded-full mt-2"></div>
                  </div>
                </div>

                {/* Scanning Laser */}
                {isSpinning && (
                  <div
                    className="absolute top-0 left-0 w-full bg-blue-400 opacity-50"
                    style={{
                      height: "2px",
                      animation: "scanVertical 1.5s ease-in-out infinite",
                      boxShadow: "0 0 10px 3px rgba(59, 130, 246, 0.5)",
                    }}
                  ></div>
                )}
              </div>

              <p className="text-center text-gray-500">
                {selectedImage
                  ? "Processing image..."
                  : "Take a photo to register your face"}
              </p>

              {/* Add CSS animations */}
              <style jsx>{`
                @keyframes scanVertical {
                  0% {
                    top: 0;
                  }
                  50% {
                    top: 100%;
                  }
                  100% {
                    top: 0;
                  }
                }
                @keyframes spin {
                  0% {
                    transform: rotateY(0deg);
                  }
                  100% {
                    transform: rotateY(360deg);
                  }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* Credentials Accordion - Only show when face is registered */}
      {
        <div className="w-full max-w-[900px] border rounded-lg overflow-hidden">
          <div className="p-4 bg-white">
            {/* Tabs for Credentials and Transactions */}
            <div className="mb-4 border-b">
              <div className="flex flex-wrap -mb-px">
                <button
                  className={`mr-2 py-2 px-4 font-medium text-sm border-b-2 ${
                    !showTransactions
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setShowTransactions(false)}
                >
                  Credentials
                </button>
                <button
                  className={`py-2 px-4 font-medium text-sm border-b-2 ${
                    showTransactions
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setShowTransactions(true)}
                >
                  Transactions
                </button>
              </div>
            </div>

            {showTransactions ? (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Transaction History</h3>
                  <button
                    onClick={fetchTransactions}
                    disabled={isLoadingTransactions}
                    className={`px-4 py-2 rounded-full text-white flex items-center ${
                      isLoadingTransactions
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                    }`}
                  >
                    {isLoadingTransactions ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          ></path>
                        </svg>
                        Refresh Transactions
                      </>
                    )}
                  </button>
                </div>

                {transactionError ? (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          {transactionError}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : transactionData ? (
                  <div>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-500">
                            Wallet Address
                          </p>
                          <p className="font-mono text-sm truncate max-w-xs">
                            {transactionData.walletAddress}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-indigo-600">
                            {transactionData.transactionCount}
                          </div>
                          <p className="text-sm text-gray-500">Transactions</p>
                        </div>
                      </div>
                    </div>

                    {transactionData.transactions.length > 0 ? (
                      <div className="space-y-4">
                        {[...transactionData.transactions]
                          .sort(
                            (a, b) =>
                              new Date(b.timestamp).getTime() -
                              new Date(a.timestamp).getTime()
                          )
                          .map((tx: Transaction, index: number) => {
                            // Determine transaction type and styling
                            const txType =
                              tx.result.functionCall?.functionName || "";
                            const isSocialConnection =
                              txType.startsWith("connectOn");
                            const socialPlatform = isSocialConnection
                              ? txType.replace("connectOn", "")
                              : "";

                            // Set colors and icons based on transaction type
                            let bgGradient,
                              iconBg,
                              iconColor,
                              borderColor,
                              platformIcon;

                            if (isSocialConnection) {
                              if (socialPlatform === "Telegram") {
                                bgGradient = "from-blue-50 to-sky-50";
                                iconBg = "bg-blue-100";
                                iconColor = "text-blue-500";
                                borderColor = "border-blue-200";
                                platformIcon = (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="#0088cc"
                                    className="h-6 w-6 relative z-10"
                                  >
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.515 7.143c-.112.54-.53.664-.854.413l-2.355-1.735-1.138 1.093c-.125.126-.23.232-.468.232l.167-2.378 4.326-3.908c.189-.168-.041-.262-.291-.094L7.564 12.75l-2.295-.714c-.498-.155-.507-.498.103-.736l8.964-3.453c.41-.155.771.103.643.632z" />
                                  </svg>
                                );
                              } else if (socialPlatform === "Linkedin") {
                                bgGradient = "from-blue-50 to-indigo-50";
                                iconBg = "bg-blue-100";
                                iconColor = "text-blue-700";
                                borderColor = "border-blue-200";
                                platformIcon = (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="#0077B5"
                                    className="h-6 w-6 relative z-10"
                                  >
                                    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
                                  </svg>
                                );
                              } else if (socialPlatform === "Twitter") {
                                bgGradient = "from-blue-50 to-cyan-50";
                                iconBg = "bg-blue-100";
                                iconColor = "text-blue-400";
                                borderColor = "border-blue-200";
                                platformIcon = (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="#1DA1F2"
                                    className="h-6 w-6 relative z-10"
                                  >
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path>
                                  </svg>
                                );
                              } else {
                                bgGradient = "from-purple-50 to-violet-50";
                                iconBg = "bg-purple-100";
                                iconColor = "text-purple-500";
                                borderColor = "border-purple-200";
                                platformIcon = (
                                  <svg
                                    className={`h-6 w-6 ${iconColor} relative z-10`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                                    />
                                  </svg>
                                );
                              }
                            } else {
                              // Default for financial transactions
                              const isSend = txType === "sendTransaction";
                              bgGradient = isSend
                                ? "from-green-50 to-emerald-50"
                                : "from-amber-50 to-yellow-50";
                              iconBg = isSend ? "bg-green-100" : "bg-amber-100";
                              iconColor = isSend
                                ? "text-green-500"
                                : "text-amber-500";
                              borderColor = isSend
                                ? "border-green-200"
                                : "border-amber-200";
                              platformIcon = isSend ? (
                                <svg
                                  className={`h-6 w-6 ${iconColor} relative z-10`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className={`h-6 w-6 ${iconColor} relative z-10`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                  />
                                </svg>
                              );
                            }

                            // Format date
                            const txDate = new Date(tx.timestamp);
                            const formattedDate = txDate.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            );
                            const formattedTime = txDate.toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            );

                            // Get token icon based on ticker (for financial transactions)
                            const ticker =
                              tx.result.functionCall?.args.ticker || "USDC";
                            const tokenIconMap: Record<
                              string,
                              { icon: string; color: string }
                            > = {
                              USDC: {
                                icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=026",
                                color: "text-blue-600",
                              },
                              ETH: {
                                icon: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=026",
                                color: "text-purple-600",
                              },
                              USDT: {
                                icon: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=026",
                                color: "text-green-600",
                              },
                              DAI: {
                                icon: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg?v=026",
                                color: "text-yellow-600",
                              },
                              WBTC: {
                                icon: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg?v=026",
                                color: "text-orange-600",
                              },
                            };

                            const tokenInfo =
                              tokenIconMap[ticker] || tokenIconMap["USDC"];

                            return (
                              <div
                                key={index}
                                className={`bg-gradient-to-r ${bgGradient} border ${borderColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}
                              >
                                <div className="flex items-start">
                                  <div
                                    className={`${iconBg} p-3 rounded-full mr-4 shadow-md relative overflow-hidden`}
                                  >
                                    {/* Animated background effect */}
                                    <div className="absolute inset-0 opacity-20">
                                      <div className="absolute inset-0 bg-white rounded-full animate-pulse"></div>
                                    </div>

                                    {platformIcon}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-medium text-gray-800 text-lg">
                                        {tx.result.text}
                                      </h4>
                                      <div className="text-right">
                                        <div className="text-sm text-gray-500">
                                          {formattedDate}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {formattedTime}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                      <div className="bg-white bg-opacity-60 p-3 rounded-lg shadow-sm">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                                          Function
                                        </p>
                                        <p
                                          className={`font-medium ${isSocialConnection ? iconColor : tokenInfo.color}`}
                                        >
                                          {tx.result.functionCall
                                            ?.functionName || "N/A"}
                                        </p>
                                      </div>

                                      {/* For financial transactions - show amount */}
                                      {tx.result.functionCall?.args.amount && (
                                        <div className="bg-white bg-opacity-60 p-3 rounded-lg shadow-sm">
                                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                                            Amount
                                          </p>
                                          <div className="flex items-center">
                                            <img
                                              src={tokenInfo.icon}
                                              alt={ticker}
                                              className="w-5 h-5 mr-2"
                                            />
                                            <span className="font-bold text-lg">
                                              {
                                                tx.result.functionCall.args
                                                  .amount
                                              }
                                            </span>
                                            <span className="ml-1 font-medium text-gray-700">
                                              {ticker}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* For social connections - show username */}
                                      {tx.result.functionCall?.args
                                        .username && (
                                        <div className="bg-white bg-opacity-60 p-3 rounded-lg shadow-sm">
                                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                                            Username
                                          </p>
                                          <div className="flex items-center">
                                            <span
                                              className={`font-medium ${iconColor}`}
                                            >
                                              @
                                              {
                                                tx.result.functionCall.args
                                                  .username
                                              }
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* For financial transactions - show recipient */}
                                      {tx.result.functionCall?.args
                                        .recipientAddress && (
                                        <div className="col-span-2 bg-white bg-opacity-60 p-3 rounded-lg shadow-sm">
                                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                                            Recipient
                                          </p>
                                          <div className="flex items-center">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                              <svg
                                                className="w-4 h-4 text-gray-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth="2"
                                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                              </svg>
                                            </div>
                                            <p className="font-mono text-sm truncate">
                                              {
                                                tx.result.functionCall.args
                                                  .recipientAddress
                                              }
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Action buttons and status */}
                                      <div className="col-span-2 flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                                        <div className="flex items-center">
                                          <span
                                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                              tx.hasProof
                                                ? "bg-green-100 text-green-800 border border-green-200"
                                                : "bg-gray-100 text-gray-800 border border-gray-200"
                                            }`}
                                          >
                                            {tx.hasProof ? (
                                              <span className="flex items-center">
                                                <svg
                                                  className="w-3 h-3 mr-1"
                                                  fill="currentColor"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                                Verified
                                              </span>
                                            ) : (
                                              <span className="flex items-center">
                                                <svg
                                                  className="w-3 h-3 mr-1 animate-spin"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                  />
                                                </svg>
                                                Pending
                                              </span>
                                            )}
                                          </span>
                                          <div className="ml-2 px-2 py-1 bg-indigo-50 rounded-md border border-indigo-100">
                                            <span className="text-xs text-indigo-600 font-medium">
                                              Sequence: {tx.sequence}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Action button based on transaction type */}
                                        {isSocialConnection ? (
                                          <a
                                            href={`https://${socialPlatform.toLowerCase()}.com/${tx.result.functionCall?.args.username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`px-3 py-1 ${iconBg} hover:bg-opacity-80 ${iconColor} rounded-md text-sm font-medium transition-colors duration-200 flex items-center`}
                                          >
                                            <svg
                                              className="w-4 h-4 mr-1"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                              />
                                            </svg>
                                            Visit Profile
                                          </a>
                                        ) : (
                                          <button className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md text-sm font-medium transition-colors duration-200 flex items-center">
                                            <svg
                                              className="w-4 h-4 mr-1"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                              />
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                              />
                                            </svg>
                                            View Details
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          <svg
                            className="absolute inset-0 text-gray-300 animate-pulse"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <svg
                            className="absolute inset-0 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">
                          No transactions found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                          You haven't made any transactions yet. When you do,
                          they'll appear here with all the details.
                        </p>
                        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200">
                          Make Your First Transaction
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-30"></div>
                      <div className="absolute inset-0 bg-indigo-50 rounded-full animate-pulse"></div>
                      <svg
                        className="absolute inset-0 m-auto h-12 w-12 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-xl font-medium text-gray-900">
                      No transaction data
                    </h3>
                    <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                      Click the button below to fetch your transaction history
                      and see all your on-chain activity.
                    </p>
                    <button
                      onClick={fetchTransactions}
                      className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 flex items-center mx-auto"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Fetch Transaction History
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                {credentials ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        Your Credentials
                      </h3>
                      <button
                        onClick={handleListCredentials}
                        disabled={isLoadingCredentials}
                        className={`px-4 py-2 rounded-full text-white flex items-center ${
                          isLoadingCredentials
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                        }`}
                      >
                        {isLoadingCredentials ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Loading...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              ></path>
                            </svg>
                            Refresh Credentials
                          </>
                        )}
                      </button>
                    </div>

                    {credentials.error ? (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">
                              {credentials.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : credentials.data && credentials.data.length > 0 ? (
                      <div>
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-lg mb-4 shadow-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-500">Identity</p>
                              <p className="font-mono text-sm truncate max-w-xs">
                                {profile.name || address}
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-emerald-600">
                                {credentials.data.length}
                              </div>
                              <p className="text-sm text-gray-500">
                                Credentials
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {credentials.data.map((cred: any, index: number) => {
                            // Format dates
                            const validFrom = new Date(cred.validFrom);
                            const validUntil = cred.validUntil
                              ? new Date(cred.validUntil)
                              : null;

                            const formattedValidFrom =
                              validFrom.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });

                            const formattedValidUntil = validUntil
                              ? validUntil.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "No expiration";

                            // Check if credential is expired
                            const isExpired = validUntil
                              ? validUntil < new Date()
                              : false;

                            // Determine if credential is active
                            const isActive =
                              !isExpired && validFrom <= new Date();

                            // Set colors based on status
                            const bgGradient = isActive
                              ? "from-emerald-50 to-teal-50"
                              : isExpired
                                ? "from-red-50 to-orange-50"
                                : "from-blue-50 to-indigo-50";

                            const borderColor = isActive
                              ? "border-emerald-200"
                              : isExpired
                                ? "border-red-200"
                                : "border-blue-200";

                            const statusColor = isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : isExpired
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-blue-100 text-blue-800 border-blue-200";

                            const statusText = isActive
                              ? "Active"
                              : isExpired
                                ? "Expired"
                                : "Pending";

                            return (
                              <div
                                key={index}
                                className={`bg-gradient-to-r ${bgGradient} border ${borderColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}
                              >
                                <div className="flex items-start">
                                  <div className="bg-white p-3 rounded-full mr-4 shadow-md relative overflow-hidden">
                                    {/* Animated background effect */}
                                    <div className="absolute inset-0 opacity-20">
                                      <div className="absolute inset-0 bg-white rounded-full animate-pulse"></div>
                                    </div>

                                    <img
                                      src="https://dropsearn.fra1.cdn.digitaloceanspaces.com/media/projects/logos/humanity-protocol_logo_1740112698.webp"
                                      alt="Humanity Protocol"
                                      className="h-6 w-6 relative z-10"
                                    />
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-medium text-gray-800 text-lg">
                                        {cred.type && cred.type.length > 0
                                          ? cred.type[cred.type.length - 1]
                                              .replace(/([A-Z])/g, " $1")
                                              .trim()
                                          : "Verified Credential"}
                                      </h4>
                                      <div className="text-right">
                                        <div className="text-sm text-gray-500">
                                          Issued: {formattedValidFrom}
                                        </div>
                                        <div
                                          className={`text-sm ${isExpired ? "text-red-500" : "text-gray-500"}`}
                                        >
                                          {isExpired
                                            ? "Expired: "
                                            : "Valid until: "}
                                          {formattedValidUntil}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                      <div className="bg-white bg-opacity-60 p-3 rounded-lg shadow-sm">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                                          Issuer
                                        </p>
                                        <p className="font-medium text-indigo-600 truncate">
                                          {cred.issuer}
                                        </p>
                                      </div>

                                      <div className="bg-white bg-opacity-60 p-3 rounded-lg shadow-sm">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                                          ID
                                        </p>
                                        <p className="font-mono text-xs truncate text-gray-700">
                                          {cred.id}
                                        </p>
                                      </div>

                                      {profile.humanId && (
                                        <div className="col-span-2 bg-white bg-opacity-60 p-3 rounded-lg shadow-sm">
                                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                                            Human ID
                                          </p>
                                          <div className="flex items-center">
                                            <img
                                              src="https://dropsearn.fra1.cdn.digitaloceanspaces.com/media/projects/logos/humanity-protocol_logo_1740112698.webp"
                                              alt="Humanity Protocol"
                                              className="h-4 mr-2"
                                            />
                                            <p className="font-medium text-indigo-600">
                                              {profile.humanId}
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      <div className="col-span-2 bg-white bg-opacity-60 p-3 rounded-lg shadow-sm mt-2">
                                        <div className="flex justify-between items-center mb-2">
                                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                                            Credential Subject
                                          </p>
                                          <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}
                                          >
                                            {statusText}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(
                                            cred.credentialSubject
                                          ).map(
                                            (
                                              [key, value]: [string, any],
                                              i: number
                                            ) => (
                                              <div
                                                key={i}
                                                className={`p-2 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} rounded`}
                                              >
                                                <div className="text-xs text-gray-500 capitalize">
                                                  {key
                                                    .replace(/([A-Z])/g, " $1")
                                                    .trim()}
                                                  :
                                                </div>
                                                <div className="font-medium text-gray-800 break-words">
                                                  {String(value)}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>

                                      <div className="col-span-2 flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                                        <div className="flex items-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                            <svg
                                              className="w-3 h-3 mr-1"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                            Verified
                                          </span>
                                        </div>

                                        <button className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md text-sm font-medium transition-colors duration-200 flex items-center">
                                          <svg
                                            className="w-4 h-4 mr-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                          </svg>
                                          View Full Details
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          <svg
                            className="absolute inset-0 text-gray-300 animate-pulse"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <svg
                            className="absolute inset-0 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">
                          No credentials found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                          You don't have any credentials yet. Credentials verify
                          your identity and attributes.
                        </p>
                        <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200">
                          Get Your First Credential
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-30"></div>
                      <div className="absolute inset-0 bg-teal-50 rounded-full animate-pulse"></div>
                      <svg
                        className="absolute inset-0 m-auto h-12 w-12 text-teal-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-xl font-medium text-gray-900">
                      No credential data
                    </h3>
                    <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                      Click the button below to fetch your credentials and
                      verify your identity.
                    </p>
                    <button
                      onClick={handleListCredentials}
                      className="mt-6 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-full hover:from-teal-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 flex items-center mx-auto"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      Fetch Credentials
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      }
    </div>
  );
}
