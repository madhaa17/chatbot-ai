"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = language
    ? hljs.highlight(code, { language }).value
    : code;

  return (
    <div className="relative my-2 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
      {language && (
        <div className="px-4 py-2 bg-gray-100 text-gray-600 text-xs border-b border-gray-200 flex justify-between items-center">
          <span>{language}</span>
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Copy code">
            {copied ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy size={14} className="text-gray-500" />
            )}
          </button>
        </div>
      )}
      <div className="p-4 overflow-x-auto bg-white">
        <pre className="text-sm">
          <code
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
            className="hljs"
          />
        </pre>
      </div>
      {!language && (
        <button
          onClick={copyToClipboard}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-md hover:bg-gray-200 transition-colors"
          aria-label="Copy code">
          {copied ? (
            <Check size={14} className="text-green-600" />
          ) : (
            <Copy size={14} className="text-gray-500" />
          )}
        </button>
      )}
    </div>
  );
}
