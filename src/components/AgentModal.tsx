"use client";

import React, { useEffect, useState } from "react";

// Define step types for different colors
type StepType =
  | "face-scan"
  | "agent-call"
  | "token-swap"
  | "connection"
  | "tx-hash"
  | "default";

interface StepData {
  id: number;
  message: string;
  type: StepType;
  isCompleted: boolean;
  startTime: number;
}

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: string[];
  transcript: string;
}

export default function AgentModal({
  isOpen,
  onClose,
  steps,
  transcript,
}: AgentModalProps) {
  const [processedSteps, setProcessedSteps] = useState<StepData[]>([]);

  // Process incoming steps
  useEffect(() => {
    if (steps.length === 0) return;

    // Determine step type based on content
    const getStepType = (message: string): StepType => {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("scan") || lowerMessage.includes("face"))
        return "face-scan";
      if (
        lowerMessage.includes("agent") ||
        lowerMessage.includes("ai") ||
        lowerMessage.includes("response")
      )
        return "agent-call";
      if (lowerMessage.includes("swap") || lowerMessage.includes("token"))
        return "token-swap";
      if (lowerMessage.includes("connect")) return "connection";
      if (lowerMessage.includes("0x") || lowerMessage.includes("hash"))
        return "tx-hash";
      return "default";
    };

    // Update or add steps
    const newProcessedSteps = [...processedSteps];

    // Process the latest step
    const latestRawStep = steps[steps.length - 1];
    const existingStepIndex = newProcessedSteps.findIndex((step) =>
      step.message.includes(latestRawStep.split(":")[0])
    );

    if (existingStepIndex >= 0) {
      // Update existing step
      newProcessedSteps[existingStepIndex] = {
        ...newProcessedSteps[existingStepIndex],
        message: latestRawStep,
        isCompleted: true,
      };
    } else {
      // Add new step
      newProcessedSteps.push({
        id: newProcessedSteps.length,
        message: latestRawStep,
        type: getStepType(latestRawStep),
        isCompleted: false,
        startTime: Date.now(),
      });
    }

    setProcessedSteps(newProcessedSteps);
  }, [steps]);

  // Ensure steps stay visible for at least 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setProcessedSteps((prevSteps) =>
        prevSteps.map((step) => {
          if (!step.isCompleted && Date.now() - step.startTime >= 1000) {
            return { ...step, isCompleted: true };
          }
          return step;
        })
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [processedSteps]);

  if (!isOpen) return null;

  // Get background color based on step type
  const getBackgroundColor = (type: StepType) => {
    switch (type) {
      case "token-swap":
        return "bg-pink-500";
      case "agent-call":
        return "bg-blue-500";
      case "face-scan":
        return "bg-yellow-500";
      case "connection":
        return "bg-green-500";
      case "tx-hash":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">FaceBuddy Agent</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-gray-700">{transcript}</p>
          </div>

          <div className="mb-4">
            <div className="space-y-3">
              {processedSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-4 p-3 rounded-lg text-white ${getBackgroundColor(step.type)}`}
                >
                  <div className="flex-shrink-0">
                    {step.isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
