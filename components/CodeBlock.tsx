"use client";

import React, { memo, useMemo, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language: string;
}

// Lazy load highlight.js to reduce bundle size
let hljs: any = null;
const loadHighlightJs = async () => {
  if (!hljs) {
    hljs = await import("highlight.js/lib/core");
    // Only load commonly used languages
    const javascript = await import("highlight.js/lib/languages/javascript");
    const typescript = await import("highlight.js/lib/languages/typescript");
    const python = await import("highlight.js/lib/languages/python");
    const css = await import("highlight.js/lib/languages/css");
    const html = await import("highlight.js/lib/languages/xml");
    const json = await import("highlight.js/lib/languages/json");

    hljs.default.registerLanguage("javascript", javascript.default);
    hljs.default.registerLanguage("typescript", typescript.default);
    hljs.default.registerLanguage("python", python.default);
    hljs.default.registerLanguage("css", css.default);
    hljs.default.registerLanguage("html", html.default);
    hljs.default.registerLanguage("xml", html.default);
    hljs.default.registerLanguage("json", json.default);
  }
  return hljs.default;
};

export const CodeBlock = memo(function CodeBlock({
  code,
  language,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the copy function
  const copyToClipboard = useMemo(() => {
    return async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    };
  }, [code]);

  // Load and highlight code
  useEffect(() => {
    let isMounted = true;

    const highlightCode = async () => {
      try {
        const hljs = await loadHighlightJs();

        if (!isMounted) return;

        if (language && hljs.getLanguage(language)) {
          const result = hljs.highlight(code, { language });
          setHighlightedCode(result.value);
        } else {
          const result = hljs.highlightAuto(code);
          setHighlightedCode(result.value);
        }
      } catch (error) {
        console.error("Error highlighting code:", error);
        setHighlightedCode(code); // Fallback to plain text
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    highlightCode();

    return () => {
      isMounted = false;
    };
  }, [code, language]);

  if (isLoading) {
    return (
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <span className="text-gray-300 text-sm font-mono">
            {language || "code"}
          </span>
          <div className="w-6 h-6 bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <span className="text-gray-300 text-sm font-mono">
          {language || "code"}
        </span>
        <button
          onClick={copyToClipboard}
          className="p-1 hover:bg-gray-700 rounded transition-colors duration-200"
          title="Copy code"
          aria-label="Copy code to clipboard">
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm">
          <code
            className="text-gray-100 font-mono"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
});
