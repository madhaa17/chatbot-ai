import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface CacheData {
  messages: ChatMessage[];
  chatId: string | null;
  lastUpdated: number;
  etag?: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Cache management
  const cacheRef = useRef<CacheData | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Load chat history on mount with cache check
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Optimized cache-aware history loading
  const loadChatHistory = useCallback(
    async (forceRefresh = false) => {
      try {
        const now = Date.now();

        // Check if we have valid cache and no force refresh
        if (
          !forceRefresh &&
          cacheRef.current &&
          now - lastFetchTime < CACHE_DURATION
        ) {
          setMessages(cacheRef.current.messages);
          setCurrentChatId(cacheRef.current.chatId);
          return;
        }

        // Prepare headers for conditional requests
        const headers: HeadersInit = {
          "Cache-Control": "no-cache",
        };

        // Add ETag for conditional requests if we have one
        if (cacheRef.current?.etag) {
          headers["If-None-Match"] = cacheRef.current.etag;
        }

        const response = await fetch("/api/chat/history", { headers });

        // Handle 304 Not Modified - use cached data
        if (response.status === 304 && cacheRef.current) {
          setLastFetchTime(now);
          return;
        }

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error occurred" }));
          throw new Error(
            errorData.error ||
              `Failed to load chat history (${response.status})`
          );
        }

        const data = await response.json();

        if (!data) {
          throw new Error("No data received from server");
        }

        const messages = data.messages || [];
        const processedMessages = messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }));

        // Update cache
        const etag = response.headers.get("etag");
        cacheRef.current = {
          messages: processedMessages,
          chatId: data.chatId,
          lastUpdated: now,
          etag: etag || undefined,
        };

        setMessages(processedMessages);
        setLastFetchTime(now);

        if (data.chatId) {
          setCurrentChatId(data.chatId);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        alert(
          "Failed to load chat history. Please refresh the page to try again."
        );
      }
    },
    [lastFetchTime]
  );

  // Optimistic update for new messages
  const addMessageOptimistically = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const newMessages = [...prev, message];

      // Update cache immediately
      if (cacheRef.current) {
        cacheRef.current.messages = newMessages;
        cacheRef.current.lastUpdated = Date.now();
      }

      return newMessages;
    });
  }, []);

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

    // Optimistic update - add message immediately
    addMessageOptimistically(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          chatId: currentChatId,
        }),
      });

      if (!response.ok) {
        // Rollback optimistic update on error
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));

        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(errorData.error || `Server error (${response.status})`);
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
                  const newMessages = [
                    ...others,
                    {
                      id: "streaming",
                      role: "assistant" as const,
                      content: streamedContent,
                    },
                  ];

                  // Update cache with streaming data
                  if (cacheRef.current) {
                    cacheRef.current.messages = newMessages;
                    cacheRef.current.lastUpdated = Date.now();
                  }

                  return newMessages;
                });
              }
              if (data.chatId && !currentChatId) {
                setCurrentChatId(data.chatId);
                if (cacheRef.current) {
                  cacheRef.current.chatId = data.chatId;
                }
              }
            } catch (e) {
              console.error("Error parsing streamed data:", e);
            }
          }
        }
      }

      // Replace the streaming message with a permanent one
      const finalMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: streamedContent,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const permanentMessages = prev.filter((msg) => msg.id !== "streaming");
        const newMessages = [...permanentMessages, finalMessage];

        // Update cache with final message
        if (cacheRef.current) {
          cacheRef.current.messages = newMessages;
          cacheRef.current.lastUpdated = Date.now();
          // Invalidate ETag since we have new data
          cacheRef.current.etag = undefined;
        }

        return newMessages;
      });
    } catch (error) {
      console.error("Streaming error:", error);

      // Add error message without optimistic update rollback
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };

      addMessageOptimistically(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAllChats = async () => {
    try {
      const response = await fetch("/api/chat/delete-all", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      // Clear local messages, chat ID, and cache
      setMessages([]);
      setCurrentChatId(null);
      cacheRef.current = null;
      setLastFetchTime(0);
    } catch (error) {
      console.error("Error deleting chats:", error);
      throw error;
    }
  };

  // Refresh history manually
  const refreshHistory = useCallback(() => {
    return loadChatHistory(true);
  }, [loadChatHistory]);

  // Check for new messages (polling alternative)
  const checkForUpdates = useCallback(async () => {
    if (!cacheRef.current?.etag) return;

    try {
      const response = await fetch("/api/chat/history", {
        headers: {
          "If-None-Match": cacheRef.current.etag,
          "Cache-Control": "no-cache",
        },
      });

      // If 304, no new messages
      if (response.status === 304) return false;

      // If 200, we have new messages
      if (response.ok) {
        await loadChatHistory(true);
        return true;
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    }

    return false;
  }, [loadChatHistory]);

  // Format time for display
  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return {
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
  };
}
