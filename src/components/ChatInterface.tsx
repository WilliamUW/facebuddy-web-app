"use client";

import { ProfileData } from "./FaceRegistration";
import { useState } from "react";

type ChatResponse = {
  content: {
    text: string;
    functionCall?: {
      functionName: string;
      args: {
        recipientAddress?: string;
        amount?: string;
        ticker?: string;
        platform?: string;
        username?: string;
      };
    };
  };
  proof: {
    type: string;
    timestamp: number;
    metadata: {
      logId: string;
    };
  };
};

interface ChatInterfaceProps {
  profile?: ProfileData;
}

export default function ChatInterface({ profile }: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFunctionCall = (functionCall: ChatResponse['content']['functionCall']) => {
    if (!functionCall) return;

    switch (functionCall.functionName) {
      case 'connectOnLinkedin':
        if (profile?.linkedin) {
          window.open(`https://linkedin.com/in/${profile.linkedin}`, '_blank');
        }
        break;
      case 'connectOnTelegram':
        if (profile?.telegram) {
          window.open(`https://t.me/${profile.telegram}`, '_blank');
        }
        break;
      // Keep existing function calls
      default:
        console.log('Unknown function call:', functionCall.functionName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        "https://ai-quickstart.onrender.com/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt + JSON.stringify(profile)
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setResponse(data);
      
      // Handle function calls if present
      if (data.content.functionCall) {
        handleFunctionCall(data.content.functionCall);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your message..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <div className="mb-2">
            <h3 className="font-semibold">Response:</h3>
            <p>{response.content.text}</p>
          </div>
          {response.content.functionCall && (
            <div className="mt-2 p-2 bg-gray-200 rounded">
              <h4 className="font-semibold">Function Call:</h4>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(response.content.functionCall, null, 2)}
              </pre>
            </div>
          )}
          {response.proof && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Proof Type: {response.proof.type}</p>
              {response.proof.metadata.logId && (
                <p>Log ID: {response.proof.metadata.logId}</p>
              )}
              {response.proof.timestamp && (
                <p>
                  Timestamp:{" "}
                  {new Date(response.proof.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
