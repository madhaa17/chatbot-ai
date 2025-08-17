"use client";

import { useMemo } from "react";

interface MessageStatusIconProps {
  status?: "pending" | "delivered" | "failed";
  role: "user" | "assistant";
  className?: string;
}

export function MessageStatusIcon({
  status,
  role,
  className = "",
}: MessageStatusIconProps) {
  // Only show status for user messages
  if (role !== "user" || !status) {
    return null;
  }

  const iconConfig = useMemo(() => {
    switch (status) {
      case "pending":
        return {
          icon: (
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          ),
          color: "text-blue-200",
          tooltip: "Sending...",
        };
      case "delivered":
        return {
          icon: (
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
              <path d="M16 6L7 17l-1-1" />
            </svg>
          ),
          color: "text-blue-200",
          tooltip: "Delivered",
        };
      case "failed":
        return {
          icon: (
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ),
          color: "text-red-300",
          tooltip: "Failed to send",
        };
      default:
        return null;
    }
  }, [status]);

  if (!iconConfig) return null;

  return (
    <div
      className={`inline-flex items-center ${iconConfig.color} ${className}`}
      title={iconConfig.tooltip}>
      {status === "pending" && (
        <div className="animate-spin">{iconConfig.icon}</div>
      )}
      {status !== "pending" && iconConfig.icon}
    </div>
  );
}
