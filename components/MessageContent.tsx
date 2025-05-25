"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import type { Components } from "react-markdown";

interface MessageContentProps {
  content: string;
  isLoading?: boolean;
}

type CodeComponentProps = {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const markdownComponents: Components = {
  code: ({ inline, className, children }: CodeComponentProps) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";

    if (inline) {
      return (
        <code className="px-1 py-0.5 bg-gray-100 rounded text-sm">
          {children}
        </code>
      );
    }

    return (
      <div className="my-4">
        <CodeBlock code={String(children).trim()} language={language} />
      </div>
    );
  },
  pre: ({ children }) => <>{children}</>,
  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-blue-500 hover:underline"
      target="_blank"
      rel="noopener noreferrer">
      {children}
    </a>
  ),
};

export function MessageContent({ content, isLoading }: MessageContentProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:0.2s]"></span>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:0.4s]"></span>
        </div>
        {content && (
          <div className="text-gray-500 text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
