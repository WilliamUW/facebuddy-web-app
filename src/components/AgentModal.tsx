"use client";

import React from "react";

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: string[];
  transcript: string;
  recipientAddress: string | null;
}

export default function AgentModal({
  isOpen,
  onClose,
  steps,
  transcript,
  recipientAddress,
}: AgentModalProps) {
  if (!isOpen) return null;

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
            <p className="font-medium">Transcript:</p>
            <p className="text-gray-700">{transcript}</p>
          </div>

          {recipientAddress && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p className="font-medium">Recipient Address:</p>
              <p className="text-gray-700 font-mono text-sm break-all">
                {recipientAddress}
              </p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-semibold mb-3">Agent Steps:</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <p className="text-gray-800">{step}</p>
                    {index === steps.length - 1 && index !== 0 && (
                      <div className="mt-2">
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="ml-2 text-sm text-gray-500">
                          Processing...
                        </span>
                      </div>
                    )}
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
