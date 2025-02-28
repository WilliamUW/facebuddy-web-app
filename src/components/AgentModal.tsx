"use client";

import React from "react";

interface Step {
  label: string;
  isLoading: boolean;
  type: "scan" | "agent" | "connection" | "token" | "transaction" | "hash";
}

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: Step[];
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
  if (!isOpen) return null;

  const getStepColor = (type: Step["type"]): string => {
    switch (type) {
      case "scan":
        return "bg-yellow-500";
      case "agent":
        return "bg-gray-500";
      case "connection":
        return "bg-green-500";
      case "token":
        return "bg-blue-500";
      case "transaction":
        return "bg-pink-500";
      case "hash":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-slideIn">
        {/* Header */}
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

        {/* Transcript */}
        {transcript && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-700">{transcript}</p>
          </div>
        )}

        {/* Steps */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`${getStepColor(step.type)} text-white rounded-lg p-3 flex items-center gap-3 animate-stepIn`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {step.isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                <span
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: step.label }}
                ></span>
              </div>
            ))}
          </div>
        </div>

        {/* Children (e.g. face detection results) */}
        {children && <div className="px-4 pb-4">{children}</div>}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes stepIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .animate-stepIn {
          animation: stepIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
