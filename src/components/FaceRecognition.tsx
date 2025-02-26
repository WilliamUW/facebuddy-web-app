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
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.2647 2.42778C21.98 2.19091 21.6364 2.03567 21.2704 1.97858C20.9044 1.92149 20.5299 1.96469 20.1866 2.10357L2.26566 9.87023C1.88241 10.0336 1.55618 10.3101 1.33033 10.6654C1.10448 11.0207 0.989836 11.4377 1.00003 11.8627C1.01023 12.2876 1.14483 12.6982 1.38939 13.0424C1.63395 13.3865 1.97485 13.6468 2.36566 13.7909L6.92816 15.3815L8.77316 21.0471C8.80901 21.1601 8.86343 21.2659 8.93441 21.3596C8.99118 21.4345 9.05743 21.5027 9.13191 21.5627C9.25172 21.6549 9.38722 21.7246 9.53191 21.7684C9.67659 21.8121 9.82812 21.8291 9.97816 21.819H10.0157C10.4286 21.819 10.8257 21.6596 11.1226 21.3721L14.2507 18.3721L18.3694 21.5721C18.7163 21.8471 19.1457 21.9984 19.5882 21.9996C20.0321 21.9996 20.4619 21.8459 20.8069 21.5684C21.0016 21.4071 21.1576 21.2063 21.2647 20.9796C21.3718 20.7529 21.4275 20.5056 21.4282 20.2552V3.74466C21.4278 3.44741 21.3617 3.15442 21.2351 2.88691C21.1085 2.6194 20.9247 2.38448 20.6976 2.19841L22.2647 2.42778ZM19.5882 20.2496L14.6819 16.4371L11.9882 18.9746L12.6944 14.8221L18.7132 8.96841L8.99441 13.9221L4.13816 12.2221L19.5882 5.43091V20.2496Z" fill="currentColor"/>
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