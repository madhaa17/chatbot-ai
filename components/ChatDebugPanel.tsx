"use client";

import { useState, useEffect } from "react";

interface CacheStats {
  lastFetchTime: number;
  cacheHits: number;
  cacheMisses: number;
  etag?: string;
  messageCount: number;
}

interface ChatDebugPanelProps {
  refreshHistory: () => Promise<void>;
  checkForUpdates: () => Promise<boolean>;
  messages: any[];
}

export function ChatDebugPanel({
  refreshHistory,
  checkForUpdates,
  messages,
}: ChatDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    lastFetchTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    messageCount: 0,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    setCacheStats((prev) => ({
      ...prev,
      messageCount: messages.length,
    }));
  }, [messages]);

  const handleRefresh = async () => {
    try {
      await refreshHistory();
      setCacheStats((prev) => ({
        ...prev,
        lastFetchTime: Date.now(),
        cacheMisses: prev.cacheMisses + 1,
      }));
      setLastUpdate("Refreshed history");
    } catch (error) {
      setLastUpdate("Error refreshing");
    }
  };

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    try {
      const hasUpdates = await checkForUpdates();
      setCacheStats((prev) => ({
        ...prev,
        [hasUpdates ? "cacheMisses" : "cacheHits"]:
          prev[hasUpdates ? "cacheMisses" : "cacheHits"] + 1,
      }));
      setLastUpdate(hasUpdates ? "New messages found" : "No new messages");
    } catch (error) {
      setLastUpdate("Error checking updates");
    } finally {
      setIsChecking(false);
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-mono z-50 hover:bg-gray-700 transition-colors"
        title="Show Cache Debug Panel">
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50 font-mono text-xs">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800">Cache Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600">Messages:</span>
            <div className="font-bold">{cacheStats.messageCount}</div>
          </div>
          <div>
            <span className="text-gray-600">Last Fetch:</span>
            <div className="font-bold">
              {formatTime(cacheStats.lastFetchTime)}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Cache Hits:</span>
            <div className="font-bold text-green-600">
              {cacheStats.cacheHits}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Cache Misses:</span>
            <div className="font-bold text-red-600">
              {cacheStats.cacheMisses}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleRefresh}
          className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors">
          🔄 Force Refresh
        </button>

        <button
          onClick={handleCheckUpdates}
          disabled={isChecking}
          className="w-full bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors disabled:opacity-50">
          {isChecking ? "⏳ Checking..." : "📡 Check Updates"}
        </button>

        {lastUpdate && (
          <div className="text-xs text-gray-600 bg-gray-100 p-1 rounded">
            {lastUpdate}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500">Cache Management Active ✅</div>
        <div className="text-xs text-gray-500">
          ETag Support: {cacheStats.etag ? "✅" : "⏳"}
        </div>
      </div>
    </div>
  );
}
