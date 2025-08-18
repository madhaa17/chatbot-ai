import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  status?: "pending" | "delivered" | "failed";
  tempId?: string; // For optimistic updates
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

  const cacheRef = useRef<CacheData | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000;

  useEffect(() => {
    loadChatHistory();
  }, []);

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

        const headers: HeadersInit = {
          "Cache-Control": "no-cache",
        };

        if (cacheRef.current?.etag) {
          headers["If-None-Match"] = cacheRef.current.etag;
        }

        const response = await fetch("/api/chat/history", { headers });

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
          status: msg.role === "user" ? ("delivered" as const) : undefined, // Add delivered status for user messages
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

  const updateMessageStatus = useCallback(
    (messageId: string, status: "pending" | "delivered" | "failed") => {
      setMessages((prev) => {
        const newMessages = prev.map((msg) =>
          msg.id === messageId || msg.tempId === messageId
            ? { ...msg, status }
            : msg
        );

        // Update cache
        if (cacheRef.current) {
          cacheRef.current.messages = newMessages;
          cacheRef.current.lastUpdated = Date.now();
        }

        return newMessages;
      });
    },
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    const tempId = crypto.randomUUID();
    const userMessage: ChatMessage = {
      id: tempId,
      tempId,
      role: "user",
      content: input,
      timestamp: new Date(),
      status: "pending",
    };

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
        updateMessageStatus(tempId, "failed");

        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      updateMessageStatus(tempId, "delivered");

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
                      status: "pending" as const,
                    },
                  ];

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

      const finalMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: streamedContent,
        timestamp: new Date(),
        status: "delivered",
      };

      setMessages((prev) => {
        const permanentMessages = prev.filter((msg) => msg.id !== "streaming");
        const newMessages = [...permanentMessages, finalMessage];

        if (cacheRef.current) {
          cacheRef.current.messages = newMessages;
          cacheRef.current.lastUpdated = Date.now();

          cacheRef.current.etag = undefined;
        }

        return newMessages;
      });
    } catch (error) {
      console.error("Streaming error:", error);

      // Add error message
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        status: "failed",
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
  };
}
