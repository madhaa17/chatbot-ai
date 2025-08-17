"use client";

import { Send, ChevronDown, Bot, Loader2, Trash2 } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { MessageContent } from "./MessageContent";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { ChatDebugPanel } from "./ChatDebugPanel";
import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

export default function Chat() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    showScrollButton,
    messagesEndRef,
    chatContainerRef,
    scrollToBottom,
    handleSubmit,
    formatTime,
    deleteAllChats,
    refreshHistory,
    checkForUpdates,
  } = useChat();

  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        avatarRef.current &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all chats? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAllChats();
    } catch (error) {
      alert("Failed to delete chats. Please try again.");
      console.error("Failed to delete chats:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-800">
              Chat Assistant
            </h1>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </div>
        <div className="relative" ref={avatarRef}>
          {session?.user?.image && (
            <Image
              width={40}
              height={40}
              src={session.user.image}
              alt={session.user.name!}
              className="h-10 w-10 rounded-full border-2 border-blue-500 object-cover cursor-pointer"
              title={session.user.name!}
              onClick={() => setDropdownOpen((v) => !v)}
            />
          )}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                onClick={() => {
                  setDropdownOpen(false);
                  handleDeleteAll();
                }}
                disabled={isDeleting || messages.length === 0}>
                Clear Chat
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                onClick={() => {
                  setDropdownOpen(false);
                  signOut();
                }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-blue-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot className="h-10 w-10 mb-2" />
            <p className="text-center text-sm">
              Send a message to start the conversation
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } transition-opacity duration-200 ease-in-out ${
              isLoading && message.id === "streaming"
                ? "opacity-70"
                : "opacity-100"
            }`}>
            <div className="flex flex-col max-w-[80%]">
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none shadow-sm"
                }`}>
                {message.role === "assistant" ? (
                  <MessageContent
                    content={message.content}
                    isLoading={message.id === "streaming" && isLoading}
                  />
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <p className="flex-1">{message.content}</p>
                    <MessageStatusIcon
                      status={message.status}
                      role={message.role}
                      className="flex-shrink-0 ml-2 self-end"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 bg-blue-500 text-white rounded-full p-2 shadow-md hover:bg-blue-600 transition-colors">
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 rounded-full bg-gray-100 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>

      <ChatDebugPanel
        refreshHistory={refreshHistory}
        checkForUpdates={checkForUpdates}
        messages={messages}
      />
    </div>
  );
}
