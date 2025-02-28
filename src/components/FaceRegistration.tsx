"use client";

import * as faceapi from "face-api.js";

import {issueCredentials, listCredentials} from "src/utility/humanityProtocol";
import { useEffect, useRef, useState } from "react";

import React from "react";
import Webcam from "react-webcam";
import {storeStringAndGetBlobId} from "src/utility/walrus";
import { uploadToIPFS } from "src/utility/faceDataStorage";
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
    twitter: "",
  });

  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(
    null
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);

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

    const hash = await storeStringAndGetBlobId(JSON.stringify(serializedData));
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
      setProfile({ name: address ?? "", linkedin: "", telegram: "", twitter: "" });
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
          setProfile({ name: address ?? "", linkedin: "", telegram: "", twitter: "" });
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
    setProfile({ name: address ?? "", linkedin: "", telegram: "", twitter: "" });
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
              : { name: `Face ${index + 1}`, linkedin: "", telegram: "", twitter: "" },
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

    await issueCredentials(profile.name, profile)

    // Generate random processing time between 1-3 seconds
    const processingTime = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms

    // Show loading spinner for the random duration
    setTimeout(() => {
      // Update UI after the random processing time
      setIsRegistering(false);
      setIsFaceRegistered(true);
    }, processingTime);
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0077B5" className="w-5 h-5">
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0088cc" className="w-5 h-5">
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1DA1F2" className="w-5 h-5">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path>
                      </svg>
                    </div>
                  </div>
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

      {/* Credentials Accordion - Only show when face is registered */}
      {(
        <div className="w-full max-w-[900px] mt-4 border rounded-lg overflow-hidden">
          <button
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="w-full p-4 bg-gray-100 text-left font-medium flex justify-between items-center"
          >
            <span>View Your Credentials</span>
            <svg
              className={`w-5 h-5 transition-transform ${
                isAccordionOpen ? "transform rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>
          
          {isAccordionOpen && (
            <div className="p-4 bg-white">
              {credentials ? (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Your Credentials</h3>
                  {credentials.error ? (
                    <p className="text-red-500">{credentials.error}</p>
                  ) : credentials.data && credentials.data.length > 0 ? (
                    <div className="space-y-4">
                      {credentials.data.map((cred: any, index: number) => (
                        <div key={index} className="border rounded p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="font-medium">Issuer:</div>
                            <div className="truncate">{cred.issuer}</div>
                            
                            <div className="font-medium">Valid From:</div>
                            <div>{new Date(cred.validFrom).toLocaleString()}</div>
                            
                            <div className="font-medium">Valid Until:</div>
                            <div>{cred.validUntil ? new Date(cred.validUntil).toLocaleString() : 'No expiration'}</div>
                            
                            <div className="font-medium">ID:</div>
                            <div className="truncate">{cred.id}</div>
                          </div>
                          
                          <div className="mt-2">
                            <div className="font-medium mb-1">Credential Subject:</div>
                            <div className="bg-gray-50 p-2 rounded">
                              {Object.entries(cred.credentialSubject).map(([key, value]: [string, any]) => (
                                <div key={key} className="grid grid-cols-2 gap-2">
                                  <div className="font-medium">{key}:</div>
                                  <div>{String(value)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No credentials found.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleListCredentials}
                    disabled={isLoadingCredentials}
                    className={`px-4 py-2 rounded text-white ${
                      isLoadingCredentials
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isLoadingCredentials ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading Credentials...
                      </span>
                    ) : (
                      "List Credentials"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
