'use client';

import ReactMarkdown from 'react-markdown';
import { Separator } from './ui/separator';

interface MarkdownPageProps {
  content: string;
}

export default function MarkdownPage({ content }: MarkdownPageProps) {
  return (
    <article className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold">{children}</h3>
          ),
          hr: () => <Separator />,
          a: ({ href, children }) => (
            <a href={href} className="text-blue-500 hover:underline">
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="space-y-1">{children}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
