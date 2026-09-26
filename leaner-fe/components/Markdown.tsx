"use client";

import ReactMarkdown from "react-markdown";
import { Components } from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownProps {
  content: string;
  className?: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 text-3xl font-bold text-gray-900">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 text-2xl font-semibold text-gray-800">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 text-xl font-medium text-gray-700">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 text-lg font-medium text-gray-700">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-1 text-base font-medium text-gray-600">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-1 text-sm font-medium text-gray-600">{children}</h6>
  ),
  p: ({ children }) => (
    <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 hover:text-blue-800 underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-gray-700">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-gray-300 pl-4 italic text-gray-600">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded bg-gray-100 px-1 py-0.5 text-sm font-mono text-gray-800"
          style={{
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            hyphens: "auto",
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="block rounded-md bg-gray-100 p-4 text-sm font-mono text-gray-800"
        style={{
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          hyphens: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="mb-4 rounded-md bg-gray-100 p-4"
      style={{
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        hyphens: "auto",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 bg-gray-50 px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 px-4 py-2">{children}</td>
  ),
  hr: () => <hr className="my-6 border-gray-300" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
};

export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div
      className={`prose prose-gray max-w-none ${className}`}
      style={{
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        hyphens: "auto",
      }}
    >
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
