"use client";

import { Send, ChevronDown, Bot, Loader2, Trash2 } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { MessageContent } from "./MessageContent";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

// Memoized message component for better performance
const MemoizedMessage = memo(function Message({
  message,
  formatTime,
  isUser,
}: {
  message: any;
  formatTime: (date: Date) => string;
  isUser: boolean;
}) {
  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`group relative max-w-[75%] ${
          isUser ? "order-1" : "order-2"
        }`}>
        {/* Message bubble */}
        <div
          className={`
          relative px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md
          ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl"
              : "bg-white text-gray-800 rounded-2xl border border-gray-100"
          }
        `}
          style={{
            borderBottomRightRadius: isUser ? "4px" : "16px",
            borderBottomLeftRadius: isUser ? "16px" : "4px",
          }}>
          {/* Content */}
          <div className="relative z-10">
            <MessageContent content={message.content} />
          </div>
        </div>

        {/* Metadata */}
        <div
          className={`flex items-center gap-2 mt-1 px-2 ${
            isUser ? "justify-end" : "justify-start"
          }`}>
          <span
            className={`text-xs transition-opacity duration-200 ${
              isUser ? "text-gray-500" : "text-gray-400"
            } group-hover:opacity-100 opacity-60`}>
            {formatTime(new Date(message.timestamp))}
          </span>
          {isUser && (
            <div className="transition-opacity duration-200 group-hover:opacity-100 opacity-60">
              <MessageStatusIcon status={message.status} role={message.role} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default memo(function Chat() {
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
  } = useChat();

  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Memoize click outside handler
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      avatarRef.current &&
      !avatarRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, handleClickOutside]);

  // Memoize delete handler
  const handleDeleteAll = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all chat history? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAllChats();
    } catch (error) {
      console.error("Failed to delete chats:", error);
      alert("Failed to delete chat history. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteAllChats]);

  // Memoize form submission handler
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e);
      }
    },
    [input, isLoading, handleSubmit]
  );

  // Memoize user avatar image
  const userAvatar = session?.user?.image ? (
    <Image
      src={session.user.image}
      alt="User Avatar"
      width={32}
      height={32}
      className="rounded-full"
      priority={false}
      loading="lazy"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
      <span className="text-gray-600 text-sm font-medium">
        {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 font-bold text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">AI Chat</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteAll}
            disabled={isDeleting || messages.length === 0}
            title="Clear all messages"
            className="
    group relative w-9 h-9 
    text-gray-500 hover:text-red-600 
    bg-transparent hover:bg-red-50 
    rounded-lg 
    disabled:text-gray-300 disabled:hover:text-gray-300 
    disabled:hover:bg-transparent 
    disabled:cursor-not-allowed 
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-red-100
    flex items-center justify-center
  ">
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            )}
          </button>
          <div className="relative" ref={avatarRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              {userAvatar}
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session?.user?.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Welcome to AI Assistant</p>
              <p className="text-sm mt-1">
                Start a conversation by typing a message below
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MemoizedMessage
              key={message.id}
              message={message}
              formatTime={formatTime}
              isUser={message.role === "user"}
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-6 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10"
          aria-label="Scroll to bottom">
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            autoComplete="off"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            aria-label="Send message">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
});
