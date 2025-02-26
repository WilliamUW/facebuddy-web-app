'use client';

import * as faceapi from 'face-api.js';

import { useEffect, useRef, useState } from 'react';

import { ProfileData } from './FaceRegistration';
import SendEthWrapper from './SendEthWrapper';

export interface SavedFace {
  label: ProfileData;
  descriptor: Float32Array;
}

interface DetectedFace {
  detection: faceapi.FaceDetection;
  descriptor: Float32Array;
  match: faceapi.FaceMatch;
  matchedProfile?: ProfileData;
}

interface Props {
  savedFaces: SavedFace[];
}

export default function FaceRecognition({ savedFaces }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (savedFaces.length > 0) {
      const labeledDescriptors = savedFaces.reduce((acc: faceapi.LabeledFaceDescriptors[], face) => {
        const existing = acc.find(ld => ld.label === face.label.name);
        if (existing) {
          existing.descriptors.push(face.descriptor);
        } else {
          acc.push(new faceapi.LabeledFaceDescriptors(face.label.name, [face.descriptor]));
        }
        return acc;
      }, []);

      faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptors);
    }
  }, [savedFaces]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setSelectedFaceIndex(null);
      setDetectedFaces([]);
    }
  };

  const detectFaces = async () => {
    if (!imageRef.current || !canvasRef.current || !isModelLoaded || !faceMatcher.current) return;

    const displaySize = {
      width: imageRef.current.clientWidth,
      height: imageRef.current.clientHeight
    };

    faceapi.matchDimensions(canvasRef.current, displaySize);

    const fullFaceDescriptions = await faceapi
      .detectAllFaces(imageRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(fullFaceDescriptions, displaySize);

    // Store detected faces with their matches
    const faces = resizedDetections.map(({ detection, descriptor }) => {
      const match = faceMatcher.current!.findBestMatch(descriptor);
      const matchedFace = savedFaces.find(face => face.label.name === match.label);
      return {
        detection,
        descriptor,
        match,
        matchedProfile: matchedFace?.label
      };
    });

    // Auto-select the first face that has a match and isn't unknown
    const firstMatchIndex = faces.findIndex(face => face.match.label !== 'unknown');
    if (firstMatchIndex !== -1) {
      setSelectedFaceIndex(firstMatchIndex);
    }

    setDetectedFaces(faces);
    drawFaces(faces);
  };

  const drawFaces = (faces: DetectedFace[]) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      faces.forEach(({ detection, match }, index) => {
        const isSelected = index === selectedFaceIndex;
        let label = `${match.label} (${Math.round(100 - match.distance * 100)}%)`;
        
        const drawBox = new faceapi.draw.DrawBox(detection.box, { 
          label,
          boxColor: isSelected ? '#00ff00' : '#ffd700'
        });
        drawBox.draw(canvasRef.current!);
      });
    }
  };

  useEffect(() => {
    if (detectedFaces.length > 0) {
      drawFaces(detectedFaces);
    }
  }, [selectedFaceIndex, detectedFaces]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h2 className="text-xl font-bold">Connect by Face</h2>
      <h2 className="text-l">Take a Picture to Pay or Connect!</h2>

      <div className="flex flex-col md:flex-row w-full max-w-[900px] gap-4">
        {/* Left/Top side: Image upload and preview */}
        <div className="flex-1 w-full md:w-auto">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="mb-4 w-full max-w-full"
          />
          
          <div className="relative w-full">
            {selectedImage && (
              <>
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Selected"
                  className="w-full max-w-full md:max-w-[450px] rounded-xl"
                  onLoad={detectFaces}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 z-10 w-full h-full"
                />
              </>
            )}
          </div>
        </div>

        {/* Right/Bottom side: Face selection and details */}
        {detectedFaces.length > 0 && (
          <div className="flex flex-col gap-4 w-full md:w-[300px]">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Detected Faces</h3>
              <div className="flex flex-col gap-2">
                {detectedFaces.map((face, index) => face.match.label != "unknown" && (
                  <button
                    key={index}
                    onClick={() => setSelectedFaceIndex(index)}
                    className={`px-3 py-2 rounded text-left w-full ${
                      selectedFaceIndex === index
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {`${face.match.label} (${Math.round(100 - face.match.distance * 100)}%)`}
                  </button>
                ))}
              </div>
            </div>

            {selectedFaceIndex !== null && detectedFaces[selectedFaceIndex].matchedProfile && (
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-sm font-semibold mb-2">Profile Details</h3>
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p><strong>Name:</strong> {detectedFaces[selectedFaceIndex].matchedProfile!.name}</p>
                  </div>
                  <SendEthWrapper recipientAddress={detectedFaces[selectedFaceIndex].matchedProfile!.name as `0x${string}`} />
  
                  {detectedFaces[selectedFaceIndex].matchedProfile!.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${detectedFaces[selectedFaceIndex].matchedProfile!.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0077b5] hover:bg-[#006399] text-white rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span>{detectedFaces[selectedFaceIndex].matchedProfile!.linkedin}</span>
                    </a>
                  )}
                  
                  {detectedFaces[selectedFaceIndex].matchedProfile!.telegram && (
                    <a
                      href={`https://t.me/${detectedFaces[selectedFaceIndex].matchedProfile!.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      <span>@{detectedFaces[selectedFaceIndex].matchedProfile!.telegram}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 