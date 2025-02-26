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
      } else {
        uploadFaceData(detectedFacesData);
        setDetectedFaces(detectedFacesData);

        // Auto-select the first face if any faces are detected
        if (detectedFacesData.length > 0) {
          setSelectedFaceIndex(0);
        }
      }
    } catch (error) {
      console.error("Error detecting faces:", error);
      alert("Error detecting faces. Please try again.");
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

    const selectedFace = detectedFaces[selectedFaceIndex];
    if (!selectedFace) return;

    const updatedFaces = detectedFaces.map((face, index) =>
      index === selectedFaceIndex ? { ...face, label: profile } : face
    );
    setDetectedFaces(updatedFaces);

    const savedFace: SavedFace = {
      label: profile,
      descriptor: selectedFace.descriptor,
    };

    onFaceSaved([savedFace]);
    alert(`Saved face for ${profile.name}!`);
    setProfile({ name: address ?? "", linkedin: "", telegram: "" });
    setSelectedFaceIndex(null);

    uploadFaceData(updatedFaces);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h2 className="text-xl font-bold">Profile</h2>
      <h2 className="text-l">Register by Taking a Picture of Yourself!</h2>

      <div className="flex flex-col md:flex-row w-full max-w-[900px] gap-4">
        {/* Left side: Webcam or captured image */}
        <div className="flex-1 w-full md:w-auto">
          <div className="rounded-xl overflow-hidden">
            {webcamError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
                <p>{webcamError}</p>
                <p className="text-sm mt-2">
                  Please try again after allowing camera access.
                </p>
              </div>
            ) : selectedImage ? (
              // Show captured image with face detection
              <div className="relative inline-block w-full">
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Selected"
                  className="w-full rounded-xl"
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
              // Show webcam
              <Webcam
                audio={false}
                height={720}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width={1280}
                videoConstraints={videoConstraints}
                onUserMediaError={handleUserMediaError}
                className="rounded-xl w-full"
              />
            )}
          </div>

          {/* Capture button (only show when webcam is visible) */}
          {!selectedImage && !webcamError && (
            <button
              onClick={capturePhoto}
              disabled={isCapturing}
              className={`mt-4 px-4 py-2 rounded text-white w-full ${
                isCapturing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isCapturing ? "Capturing..." : "Capture photo"}
            </button>
          )}

          {/* Retake photo button (only show when image is captured) */}
          {selectedImage && (
            <button
              onClick={() => setSelectedImage(null)}
              className="mt-4 px-4 py-2 rounded text-white w-full bg-gray-500 hover:bg-gray-600"
            >
              Retake photo
            </button>
          )}

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
        <div className="flex flex-col gap-4 w-full md:w-[300px]">
          {detectedFaces.length > 0 ? (
            <>
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-sm font-semibold mb-2">
                  Select Face to Label
                </h3>
                <div className="flex flex-col gap-2">
                  {detectedFaces.map((face, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedFaceIndex(index)}
                      className={`px-3 py-2 rounded text-left ${
                        selectedFaceIndex === index
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {typeof face.label === "string"
                        ? face.label
                        : face.label.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedFaceIndex !== null && (
                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="text-sm font-semibold mb-2">
                    Label Selected Face
                  </h3>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder={address}
                      className="px-2 py-1 border rounded w-full"
                    />
                    <input
                      type="text"
                      value={profile.linkedin || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          linkedin: e.target.value,
                        }))
                      }
                      placeholder="LinkedIn username (optional)"
                      className="px-2 py-1 border rounded w-full"
                    />
                    <input
                      type="text"
                      value={profile.telegram || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          telegram: e.target.value,
                        }))
                      }
                      placeholder="Telegram username (optional)"
                      className="px-2 py-1 border rounded w-full"
                    />
                    <button
                      onClick={saveFace}
                      disabled={!profile.name}
                      className={`px-4 py-2 rounded w-full ${
                        !profile.name
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600"
                      } text-white`}
                    >
                      Register Face
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="border rounded-lg p-4 bg-white h-full flex items-center justify-center">
              <p className="text-center text-gray-500">
                {selectedImage
                  ? "Processing image..."
                  : "Take a photo to register your face"}
              </p>
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
