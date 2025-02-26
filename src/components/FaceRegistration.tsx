"use client";

import * as faceapi from "face-api.js";

import { useEffect, useRef, useState } from "react";

import EthStorageUploader from "./EthStorageUploader";
import { uploadToIPFS } from "src/utility/faceDataStorage";
import { useAccount } from "wagmi";
import Webcam from "react-webcam";
import React from "react";

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

  const webcamRef = useRef<Webcam>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    name: address ?? "",
    linkedin: "",
    telegram: "",
  });

  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(
    null
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  //   useEffect(() => {
  //     if (address) {
  //       setProfile(prev => ({ ...prev, name: address }));
  //     }
  //   }, [address]);

  const uploadFaceData = async (data: any) => {
    console.log("write data to ETHStorage", data);
    // Convert Float32Array to regular arrays before serializing
    const serializedData = data.map((face: any) => ({
      ...face,
      descriptor: Array.from(face.descriptor), // Convert Float32Array to regular array
    }));

    const hash = await uploadToIPFS(JSON.stringify(serializedData));
    console.log("data uploaded " + hash);
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
      setProfile({ name: address ?? "", linkedin: "", telegram: "" });
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
          setProfile({ name: address ?? "", linkedin: "", telegram: "" });
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
    setProfile({ name: address ?? "", linkedin: "", telegram: "" });
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
              : { name: `Face ${index + 1}`, linkedin: "", telegram: "" },
        })
      );

      if (detectedFacesData.length === 0) {
        alert("No faces detected. Please try again with a clearer image.");
        setIsSpinning(false);
      } else {
        uploadFaceData(detectedFacesData);

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
    await uploadFaceData(updatedFaces);

    // Generate random processing time between 1-3 seconds
    const processingTime = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms

    // Show loading spinner for the random duration
    setTimeout(() => {
      // Update UI after the random processing time
      setIsRegistering(false);
      setIsFaceRegistered(true);
    }, processingTime);
  };

  // Function to navigate to the Send page
  const goToSendPage = () => {
    // This will navigate to the "recognize" view which contains the Send functionality
    window.dispatchEvent(new CustomEvent("navigate-to-recognize"));
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h2 className="text-xl font-bold">Profile</h2>
      <h2 className="text-l">Register by Taking a Picture of Yourself!</h2>

      <div className="flex flex-col md:flex-row w-full max-w-[900px] gap-4">
        {/* Left side: Webcam or captured image */}
        <div className="flex-1 w-full md:w-auto">
          <div
            className="rounded-xl overflow-hidden h-full relative"
            style={{ minHeight: "400px" }}
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
                  onClick={goToSendPage}
                  className="px-4 py-2 rounded text-white w-full bg-blue-500 hover:bg-blue-600"
                >
                  &larr; Go to Send page
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
                    className={`px-2 py-1 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""}`}
                    disabled={isFaceRegistered || isRegistering}
                  />
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
                    className={`px-2 py-1 border rounded w-full ${isFaceRegistered ? "bg-gray-100 text-gray-500" : ""}`}
                    disabled={isFaceRegistered || isRegistering}
                  />
                </div>
              </div>
              {!isFaceRegistered && (
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
              )}
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

      {/* Comment out EthStorageUploader
      <EthStorageUploader />
      */}
    </div>
  );
}
