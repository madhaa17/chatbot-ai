import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Load chat history from the database
  const loadChatHistory = async () => {
    try {
      const response = await fetch("/api/chat/history");

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(
          errorData.error || `Failed to load chat history (${response.status})`
        );
      }

      const data = await response.json();

      // Handle empty or invalid response data
      if (!data) {
        throw new Error("No data received from server");
      }

      // Initialize messages array even if empty
      const messages = data.messages || [];
      setMessages(
        messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }))
      );

      // Set chat ID if available
      if (data.chatId) {
        setCurrentChatId(data.chatId);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      // Show user-friendly error message
      alert(
        "Failed to load chat history. Please refresh the page to try again."
      );
    }
  };

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
        body: JSON.stringify({
          messages: [...messages, userMessage],
          chatId: currentChatId,
        }),
      });

      if (!response.ok) {
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
              if (data.chatId && !currentChatId) {
                setCurrentChatId(data.chatId);
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

      // Clear local messages and chat ID
      setMessages([]);
      setCurrentChatId(null);
    } catch (error) {
      console.error("Error deleting chats:", error);
      throw error;
    }
  };

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
  };
}
