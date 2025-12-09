import ReactMarkdown, { Options } from 'react-markdown';
import Link from 'next/link';

const Markdown = ({ children }: Options) => {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <Link href={href || ''} target="_blank" className="underline">
            {children}
          </Link>
        ),
        ul: ({ children }) => <ul className="list-disc pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

export default Markdown;
