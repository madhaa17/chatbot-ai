"use client";

import { MessageStatusIcon } from "./MessageStatusIcon";

export function MessageStatusDemo() {
  const statusExamples = [
    {
      status: "pending" as const,
      message: "This message is being sent...",
      description: "Clock icon with spin animation",
    },
    {
      status: "delivered" as const,
      message: "This message was delivered successfully",
      description: "Double checkmark icon",
    },
    {
      status: "failed" as const,
      message: "This message failed to send",
      description: "X icon in red color",
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Message Status Icons Demo
      </h2>

      <div className="space-y-4">
        {statusExamples.map((example, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-end mb-2">
              <div className="flex flex-col max-w-[80%]">
                <div className="rounded-xl px-4 py-3 text-sm bg-blue-500 text-white rounded-br-none">
                  <p>{example.message}</p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <MessageStatusIcon
                    status={example.status}
                    role="user"
                    className="ml-2"
                  />
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Status:</strong> {example.status} - {example.description}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • <strong>Pending:</strong> Shown immediately when user sends a
            message
          </li>
          <li>
            • <strong>Delivered:</strong> Updated when server confirms receipt
          </li>
          <li>
            • <strong>Failed:</strong> Shown if message fails to send
          </li>
          <li>• Status icons only appear on user messages</li>
          <li>• Includes tooltips for better UX</li>
        </ul>
      </div>
    </div>
  );
}
