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
  const [processedSteps, setProcessedSteps] = useState<
    {
      message: string;
      type: StepType;
      status: "processing" | "completed";
      timestamp: number;
    }[]
  >([]);

  // Process steps when they change
  useEffect(() => {
    if (steps.length === 0) return;

    const currentStep = steps[steps.length - 1];

    // Determine step type
    const getStepType = (message: string): StepType => {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("scan") || lowerMessage.includes("face"))
        return "face-scan";
      if (
        lowerMessage.includes("agent") ||
        lowerMessage.includes("prompt") ||
        lowerMessage.includes("response")
      )
        return "agent-call";
      if (lowerMessage.includes("swap") || lowerMessage.includes("token"))
        return "token-swap";
      if (
        lowerMessage.includes("connect") ||
        lowerMessage.includes("establish")
      )
        return "connection";
      if (
        lowerMessage.includes("0x") ||
        lowerMessage.includes("transaction") ||
        lowerMessage.includes("hash")
      )
        return "tx-hash";
      return "default";
    };

    // Check if we're updating an existing step or adding a new one
    const stepKey = currentStep.split(":")[0]?.trim();
    const existingIndex = processedSteps.findIndex((s) =>
      s.message.toLowerCase().startsWith(stepKey.toLowerCase())
    );

    if (existingIndex >= 0) {
      // Update existing step
      const updatedSteps = [...processedSteps];
      updatedSteps[existingIndex] = {
        ...updatedSteps[existingIndex],
        message: currentStep,
        status: "completed",
      };
      setProcessedSteps(updatedSteps);
    } else {
      // Add new step
      setProcessedSteps([
        ...processedSteps,
        {
          message: currentStep,
          type: getStepType(currentStep),
          status: "processing",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [steps]);

  // Ensure processing steps show for at least 1 second
  useEffect(() => {
    const processingSteps = processedSteps.filter(
      (step) => step.status === "processing"
    );

    if (processingSteps.length === 0) return;

    const timers = processingSteps.map((step) => {
      const elapsed = Date.now() - step.timestamp;
      const delay = Math.max(0, 1000 - elapsed);

      return setTimeout(() => {
        setProcessedSteps((current) =>
          current.map((s) => (s === step ? { ...s, status: "completed" } : s))
        );
      }, delay);
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [processedSteps]);

  // Reset steps when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setProcessedSteps([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Get background color for step type
  const getStepColor = (type: StepType): string => {
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">FaceBuddy Agent</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-5 h-5"
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

        {transcript && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-700">{transcript}</p>
          </div>
        )}

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            {processedSteps.map((step, index) => (
              <div
                key={index}
                className={`${getStepColor(step.type)} text-white rounded-lg shadow-sm transition-all duration-200`}
              >
                <div className="flex items-center p-3">
                  <div className="flex-shrink-0 mr-3">
                    {step.status === "processing" ? (
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-medium text-sm">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{step.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
