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
  children?: React.ReactNode;
}

export default function AgentModal({
  isOpen,
  onClose,
  steps,
  transcript,
  children,
}: AgentModalProps) {
  const [processedSteps, setProcessedSteps] = useState<
    {
      message: string;
      type: StepType;
      status: "processing" | "completed";
      timestamp: number;
      id: number;
    }[]
  >([]);

  // For modal animation
  const [isVisible, setIsVisible] = useState(false);

  // Handle modal visibility
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);

      // Add ESC key event listener
      const handleEscKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

      // Add the event listener
      document.addEventListener("keydown", handleEscKey);

      // Clean up the event listener
      return () => {
        document.removeEventListener("keydown", handleEscKey);
      };
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  // Process steps when they change
  useEffect(() => {
    if (steps.length === 0) return;

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
      if (
        lowerMessage.includes("swap") ||
        lowerMessage.includes("weth to usdc") ||
        lowerMessage.includes("ready to send")
      )
        return "token-swap";
      if (
        lowerMessage.includes("connect") ||
        lowerMessage.includes("establish")
      )
        return "connection";
      if (
        (lowerMessage.includes("0x") && lowerMessage.includes("transaction")) ||
        (lowerMessage.includes("0x") && lowerMessage.includes("complete"))
      )
        return "tx-hash";
      return "default";
    };

    // Determine if this is a processing or completed step
    const isProcessingStep = (message: string): boolean => {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes("scanning") ||
        lowerMessage.includes("prompting") ||
        lowerMessage.includes("executing") ||
        lowerMessage.includes("processing") ||
        (lowerMessage.includes("connecting") &&
          !lowerMessage.includes("established"))
      );
    };

    // Create new processed steps from the current steps array
    const newProcessedSteps = steps.map((step, index) => {
      return {
        message: step,
        type: getStepType(step),
        status: isProcessingStep(step) ? "processing" : "completed",
        timestamp: Date.now(),
        id: Date.now() + index, // Ensure unique IDs
      };
    });

    setProcessedSteps(
      newProcessedSteps as {
        message: string;
        type: StepType;
        status: "processing" | "completed";
        timestamp: number;
        id: number;
      }[]
    );
  }, [steps]);

  // Reset steps when modal is closed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setProcessedSteps([]);
      }, 300); // Wait for close animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

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
    <div
      className={`fixed inset-0 bg-black flex items-center justify-center z-50 transition-opacity duration-300 ${
        isVisible
          ? "opacity-100 bg-opacity-50"
          : "opacity-0 bg-opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden transition-all duration-300 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">FaceBuddy Agent</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
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
                key={step.id}
                className={`${getStepColor(step.type)} text-white rounded-lg shadow-sm transition-all duration-300 animate-fadeIn`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  opacity: 0,
                  animationFillMode: "forwards",
                }}
              >
                <div className="flex items-center p-3">
                  <div className="flex-shrink-0 mr-3">
                    {step.status === "processing" ? (
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-medium text-sm animate-fadeScale">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm transition-all duration-300">
                      {step.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Render children if provided */}
        {children && <div className="px-4 pb-4">{children}</div>}

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-fadeScale {
          animation: fadeScale 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
