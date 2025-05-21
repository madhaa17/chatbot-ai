"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, ChevronDown, Bot, User } from "lucide-react";

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
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold ml-3 text-white">
            Chat Assistant
          </h1>
        </div>
        {/* <button className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-full transition-colors">
          <ChevronDown className="h-5 w-5" />
        </button> */}
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-70 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <p className="text-gray-300 text-center px-4 font-medium">
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
              {message.role === "assistant" && (
                <div className="flex items-center mb-1 ml-1">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-2">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Assistant
                  </span>
                </div>
              )}

              {message.role === "user" && (
                <div className="flex items-center justify-end mb-1 mr-1">
                  <span className="text-xs font-medium text-gray-400">You</span>
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center ml-2">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md rounded-tr-none"
                    : "bg-gray-800 text-gray-100 border border-gray-700 shadow-md rounded-tl-none"
                } ${
                  message.role === "assistant"
                    ? "prose prose-invert prose-sm max-w-none"
                    : ""
                }`}>
                {message.role === "assistant"
                  ? message.content.split("\n").map((text, i) => (
                      <p
                        key={i}
                        className={`${text.startsWith("• ") ? "ml-2" : ""} ${
                          i > 0 ? "mt-2" : ""
                        }`}>
                        {text}
                      </p>
                    ))
                  : message.content}
              </div>
              <span
                className={`text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  message.role === "user"
                    ? "text-right mr-1 text-gray-400"
                    : "ml-1 text-gray-400"
                }`}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isLoading && !messages.some((m) => m.id === "streaming") && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-gray-800 text-gray-100 border border-gray-700 shadow-md rounded-tl-none">
              <div className="flex items-center space-x-2">
                <div className="bg-gray-700 rounded-full p-1">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                </div>
                <span className="text-gray-300">Assistant is typing...</span>
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
          className="absolute bottom-24 right-6 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors">
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Input Area */}
      <div className="bg-gray-800 p-4 sticky bottom-0 shadow-inner">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 max-w-4xl mx-auto relative">
          {/* <button
            type="button"
            className="p-3 text-gray-400 hover:text-blue-400 focus:outline-none transition-colors absolute left-3 top-1/2 transform -translate-y-1/2">
            <Paperclip className="h-5 w-5" />
          </button> */}

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 pl-12 pr-12 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 bg-gray-700 shadow-md"
            disabled={isLoading}
          />

          {/* <button
            type="button"
            className="p-3 text-gray-400 hover:text-blue-400 focus:outline-none transition-colors absolute right-14 top-1/2 transform -translate-y-1/2">
            <Smile className="h-5 w-5" />
          </button> */}

          <button
            type="submit"
            className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
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
