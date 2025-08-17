"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MessageStatusIcon } from "./MessageStatusIcon";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  status?: "pending" | "delivered" | "failed";
  tempId?: string;
}

interface VirtualizedChatListProps {
  messages: ChatMessage[];
  formatTime: (date?: Date) => string;
  containerRef: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
}

const ITEM_HEIGHT = 80; // Estimated height per message
const BUFFER_SIZE = 5; // Extra items to render outside viewport

export function VirtualizedChatList({
  messages,
  formatTime,
  containerRef,
  isLoading = false,
}: VirtualizedChatListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const listRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const startIdx = Math.max(
      0,
      Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE
    );
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const endIdx = Math.min(
      messages.length,
      startIdx + visibleCount + BUFFER_SIZE * 2
    );

    return {
      startIndex: startIdx,
      endIndex: endIdx,
      offsetY: startIdx * ITEM_HEIGHT,
    };
  }, [scrollTop, containerHeight, messages.length]);

  // Get visible messages
  const visibleMessages = useMemo(() => {
    return messages.slice(startIndex, endIndex);
  }, [messages, startIndex, endIndex]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    // Set initial height
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [containerRef]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isNearBottom && messages.length > 0) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 0);
    }
  }, [messages.length, containerRef]);

  const totalHeight = messages.length * ITEM_HEIGHT;

  return (
    <div
      ref={listRef}
      style={{
        height: totalHeight,
        position: "relative",
      }}>
      <div
        style={{
          transform: `translateY(${offsetY}px)`,
          position: "relative",
        }}>
        {visibleMessages.map((message, index) => {
          const actualIndex = startIndex + index;
          return (
            <MessageItem
              key={message.id}
              message={message}
              formatTime={formatTime}
              index={actualIndex}
            />
          );
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading messages...</span>
        </div>
      )}

      {/* Debug info - only in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono">
          <div>Total: {messages.length}</div>
          <div>
            Visible: {startIndex}-{endIndex}
          </div>
          <div>Rendered: {visibleMessages.length}</div>
          <div>Scroll: {scrollTop}px</div>
        </div>
      )}
    </div>
  );
}

interface MessageItemProps {
  message: ChatMessage;
  formatTime: (date?: Date) => string;
  index: number;
}

function MessageItem({ message, formatTime, index }: MessageItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading message content
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={messageRef}
      className={`mb-4 ${
        message.role === "user" ? "ml-auto max-w-[80%]" : "mr-auto max-w-[80%]"
      }`}
      style={{ minHeight: ITEM_HEIGHT }}>
      <div
        className={`p-3 rounded-lg ${
          message.role === "user"
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-800"
        }`}>
        {isVisible ? (
          <>
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <div className="flex items-center justify-between mt-1">
              {message.timestamp && (
                <div
                  className={`text-xs ${
                    message.role === "user" ? "text-blue-100" : "text-gray-500"
                  }`}>
                  {formatTime(message.timestamp)}
                </div>
              )}
              <MessageStatusIcon
                status={message.status}
                role={message.role}
                className="ml-2"
              />
            </div>
          </>
        ) : (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
        )}
      </div>
    </div>
  );
}
