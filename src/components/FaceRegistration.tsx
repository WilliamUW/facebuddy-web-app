"use client";

import * as faceapi from "face-api.js";

import { useEffect, useRef, useState } from "react";

import EthStorageUploader from "./EthStorageUploader";
import {uploadToIPFS} from "src/utility/faceDataStorage";
import { useAccount } from "wagmi";

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

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
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
    console.log("write data to ETHStorage", data)
    const hash = await uploadToIPFS(data)
    console.log("data uploaded " + hash)
  }

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

  const detectFaces = async () => {
    if (!imageRef.current || !canvasRef.current || !isModelLoaded) return;

    const displaySize = {
      width: imageRef.current.clientWidth,
      height: imageRef.current.clientHeight,
    };

    faceapi.matchDimensions(canvasRef.current, displaySize);

    const fullFaceDescriptions = await faceapi
      .detectAllFaces(imageRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(
      fullFaceDescriptions,
      displaySize
    );

    const detectedFacesData = resizedDetections.map(({ detection, descriptor }, index) => ({
      detection,
      descriptor,
      label: index === 0 ? profile : { name: `Face ${index + 1}`, linkedin: "", telegram: "" },
    }));

    uploadFaceData(detectedFacesData);

    setDetectedFaces(detectedFacesData);
    
    // Auto-select the first face if any faces are detected
    if (detectedFacesData.length > 0) {
      setSelectedFaceIndex(0);
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
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h2 className="text-xl font-bold">Profile</h2>
      <h2 className="text-l">Register by Taking a Picture of Yourself!</h2>

      <div className="flex flex-col md:flex-row w-full max-w-[900px] gap-4 ">
        {/* Left/Top side: Image upload and preview */}
        <div className="flex-1 w-full md:w-auto">
        <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="mb-4 w-full"
          />

          <div className="relative inline-block w-full">
            {selectedImage && (
              <>
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Selected"
                  className="w-full md:max-w-[450px] rounded-xl"
                  onLoad={detectFaces}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 z-10"
                />
              </>
            )}
          </div>
        </div>

        {/* Right/Bottom side: Face selection and labeling */}
        {detectedFaces.length > 0 && (
          <div className="flex flex-col gap-4 w-full md:w-[300px]">
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
                      setProfile((prev) => ({ ...prev, name: e.target.value }))
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
                    Save Face
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {detectedFaces.length > 0 && (
        <p className="text-sm text-gray-600">
          {selectedFaceIndex !== null
            ? `${
                typeof detectedFaces[selectedFaceIndex].label === "string"
                  ? detectedFaces[selectedFaceIndex].label
                  : detectedFaces[selectedFaceIndex].label.name
              } selected for labeling`
            : "Select a face from the list to label it"}
        </p>
      )}

<EthStorageUploader />

    </div>
  );
}
