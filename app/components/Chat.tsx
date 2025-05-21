"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, ChevronDown } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if we should show the scroll to bottom button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isNotAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedContent = "";

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                streamedContent += data.content;
                setMessages((prev) => {
                  const others = prev.filter((msg) => msg.id !== "streaming");
                  return [
                    ...others,
                    {
                      id: "streaming",
                      role: "assistant",
                      content: streamedContent,
                    },
                  ];
                });
              }
            } catch (e) {
              console.error("Error parsing streamed data:", e);
            }
          }
        }
      }

      // Replace the streaming message with a permanent one
      setMessages((prev) => {
        const permanentMessages = prev.filter((msg) => msg.id !== "streaming");
        return [
          ...permanentMessages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: streamedContent,
            timestamp: new Date(),
          },
        ];
      });
    } catch (error) {
      console.error("Streaming error:", error);
      // Show error message to user
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format time for display
  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <span className="text-white font-semibold text-lg">AI</span>
          </div>
          <h1 className="text-xl font-semibold ml-3 text-gray-800">
            Chat Assistant
          </h1>
        </div>
        <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-indigo-50 to-white">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-70 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <p className="text-gray-600 text-center px-4 font-medium">
              Send a message to start the conversation
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } group`}>
            <div className="flex flex-col max-w-[85%] sm:max-w-[75%]">
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md rounded-tr-none"
                    : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-none"
                }`}>
                {message.content}
              </div>
              <span
                className={`text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  message.role === "user"
                    ? "text-right mr-1 text-gray-500"
                    : "ml-1 text-gray-500"
                }`}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isLoading && !messages.some((m) => m.id === "streaming") && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-none">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-4 bg-indigo-600 text-white rounded-full p-2 shadow-lg hover:bg-indigo-700 transition-colors">
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0 shadow-inner">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 max-w-4xl mx-auto relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 pl-12 pr-12 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-gray-50 shadow-sm"
            disabled={isLoading}
          />

          <button
            type="submit"
            className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
