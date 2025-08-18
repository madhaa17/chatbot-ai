"use client";

import React, { memo, useMemo, lazy, Suspense } from "react";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

// Lazy load React Markdown to reduce initial bundle size
const ReactMarkdown = lazy(() => import("react-markdown"));

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

// Memoize markdown components to prevent recreation
const markdownComponents: Components = {
  code: memo(({ inline, className, children }: CodeComponentProps) => {
    if (inline) {
      return (
        <code className="px-1 py-0.5 bg-gray-200 text-gray-800 rounded text-sm">
          {children}
        </code>
      );
    }
    return null;
  }),
  pre: memo(({ children }) => {
    const codeElement = React.Children.toArray(
      children
    )[0] as React.ReactElement<{
      children?: React.ReactNode;
      className?: string;
    }>;
    const codeString = codeElement?.props?.children || "";
    const className = codeElement?.props?.className || "";
    const match = /language-(\w+)/.exec(className);
    const language = match ? match[1] : "";

    return <CodeBlock code={String(codeString).trim()} language={language} />;
  }),
  p: memo(({ children }) => <p className="mb-4 last:mb-0">{children}</p>),
  ul: memo(({ children }) => (
    <ul className="mb-4 list-disc pl-6">{children}</ul>
  )),
  ol: memo(({ children }) => (
    <ol className="mb-4 list-decimal pl-6">{children}</ol>
  )),
  li: memo(({ children }) => <li className="mb-1">{children}</li>),
  h1: memo(({ children }) => (
    <h1 className="text-2xl font-bold mb-4">{children}</h1>
  )),
  h2: memo(({ children }) => (
    <h2 className="text-xl font-bold mb-3">{children}</h2>
  )),
  h3: memo(({ children }) => (
    <h3 className="text-lg font-bold mb-2">{children}</h3>
  )),
  h4: memo(({ children }) => (
    <h4 className="text-base font-bold mb-2">{children}</h4>
  )),
  blockquote: memo(({ children }) => (
    <blockquote className="border-l-4 border-current pl-4 italic my-4 opacity-80">
      {children}
    </blockquote>
  )),
  a: memo(({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 hover:text-blue-800 underline"
      target="_blank"
      rel="noopener noreferrer">
      {children}
    </a>
  )),
  strong: memo(({ children }) => (
    <strong className="font-semibold">{children}</strong>
  )),
  em: memo(({ children }) => <em className="italic">{children}</em>),
};

// Loading fallback component
const MarkdownLoader = memo(() => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
));

export const MessageContent = memo(function MessageContent({
  content,
  isLoading = false,
}: MessageContentProps) {
  // Memoize the processed content
  const processedContent = useMemo(() => {
    if (isLoading) return "";
    return content.trim();
  }, [content, isLoading]);

  // If content is simple text without markdown, render directly
  const isSimpleText = useMemo(() => {
    const markdownIndicators = [
      "#",
      "*",
      "_",
      "`",
      "[",
      "](",
      ">",
      "-",
      "+",
      "1.",
    ];
    return !markdownIndicators.some((indicator) =>
      processedContent.includes(indicator)
    );
  }, [processedContent]);

  if (isLoading) {
    return <MarkdownLoader />;
  }

  // For simple text, avoid markdown overhead
  if (isSimpleText) {
    return (
      <div className="prose max-w-none">
        <p className="mb-4 last:mb-0 whitespace-pre-wrap">{processedContent}</p>
      </div>
    );
  }

  return (
    <div className="prose max-w-none">
      <Suspense fallback={<MarkdownLoader />}>
        <ReactMarkdown
          components={markdownComponents}
          remarkPlugins={[remarkGfm]}>
          {processedContent}
        </ReactMarkdown>
      </Suspense>
    </div>
  );
});
