"use client";

import { useMemo } from "react";
import { XCircle, Clock9, CheckCheck } from "lucide-react";

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
          icon: <Clock9 className="w-4 h-4" />,
          color: "text-blue-700",
          tooltip: "Sending...",
        };
      case "delivered":
        return {
          icon: <CheckCheck className="w-4 h-4" />,
          color: "text-blue-700",
          tooltip: "Delivered",
        };
      case "failed":
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: "text-red-200",
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
