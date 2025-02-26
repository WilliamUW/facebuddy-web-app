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
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p>
                        <strong>LinkedIn:</strong>{' '}
                        <a 
                          href={`https://linkedin.com/in/${detectedFaces[selectedFaceIndex].matchedProfile!.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          {detectedFaces[selectedFaceIndex].matchedProfile!.linkedin}
                        </a>
                      </p>
                    </div>
                  )}
                  
                  {detectedFaces[selectedFaceIndex].matchedProfile!.telegram && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p>
                        <strong>Telegram:</strong>{' '}
                        <a 
                          href={`https://t.me/${detectedFaces[selectedFaceIndex].matchedProfile!.telegram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          @{detectedFaces[selectedFaceIndex].matchedProfile!.telegram}
                        </a>
                      </p>
                    </div>
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