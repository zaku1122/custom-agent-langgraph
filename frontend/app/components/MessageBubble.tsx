'use client';

import ReactMarkdown from 'react-markdown';
import { Message, Citation } from '../types/chat';
import { SearchResultCard } from './SearchResultCard';
import { ImageDisplay } from './ImageDisplay';

interface MessageBubbleProps {
  message: Message;
}

// Citation Card Component
function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  return (
    <div className="p-3 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-orange-500/30 transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 
                       flex items-center justify-center text-xs font-bold text-white">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-orange-400">Page {citation.pageNumber}</span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">"{citation.text}"</p>
        </div>
      </div>
    </div>
  );
}

// Markdown components with custom styling
const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold text-slate-100 mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-bold text-slate-100 mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-semibold text-slate-200 mt-3 mb-2">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-base font-semibold text-slate-200 mt-2 mb-1">{children}</h4>
  ),
  p: ({ children }: any) => (
    <p className="text-slate-200 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-slate-200">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-200">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-slate-200">{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-slate-100">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-slate-300">{children}</em>
  ),
  code: ({ inline, children }: any) => {
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 bg-slate-700/50 rounded text-cyan-300 text-sm font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="block bg-slate-900/80 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono text-slate-200 border border-slate-700/50">
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => (
    <pre className="bg-slate-900/80 rounded-lg p-4 my-3 overflow-x-auto border border-slate-700/50">
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-cyan-500 pl-4 my-3 text-slate-300 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: any) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-slate-700" />,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border border-slate-700 rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-slate-800">{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-slate-700">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-slate-800/50">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-2 text-sm text-slate-300">{children}</td>
  ),
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Agent icon based on type
  const getAgentIcon = () => {
    switch (message.agentType) {
      case 'search':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
    }
  };

  const getAgentLabel = () => {
    switch (message.agentType) {
      case 'search':
        return 'Search Agent';
      case 'image':
        return 'Image Agent';
      case 'pdf':
        return 'PDF Agent';
      default:
        return 'Answer Agent';
    }
  };

  const getAgentColor = () => {
    switch (message.agentType) {
      case 'search':
        return 'from-cyan-500 to-blue-600';
      case 'image':
        return 'from-purple-500 to-pink-600';
      case 'pdf':
        return 'from-red-500 to-orange-500';
      default:
        return 'from-emerald-500 to-teal-600';
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white 
                          rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg shadow-indigo-500/20">
            {/* Show PDF attachment badge if present */}
            {message.pdfName && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-xs font-medium truncate">{message.pdfName}</span>
              </div>
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex justify-end mt-1">
            <span className="text-xs text-slate-500">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%] md:max-w-[75%]">
        {/* Agent badge */}
        {message.agentType && message.type !== 'loading' && (
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                            bg-gradient-to-r ${getAgentColor()} text-white shadow-sm`}>
              {getAgentIcon()}
              {getAgentLabel()}
            </div>
          </div>
        )}

        {/* Message content */}
        <div className="bg-slate-800/70 backdrop-blur border border-slate-700/50 
                        rounded-2xl rounded-tl-sm px-5 py-4 shadow-xl">
          
          {/* Loading state */}
          {message.type === 'loading' && (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-slate-400 text-sm">{message.content || 'Thinking...'}</span>
            </div>
          )}

          {/* Error state */}
          {message.type === 'error' && (
            <div className="flex items-start gap-3 text-red-400">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{message.content}</p>
            </div>
          )}

          {/* Text response with Markdown */}
          {message.type === 'text' && (
            <div className="prose-custom">
              <ReactMarkdown components={MarkdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* PDF response with citations */}
          {message.type === 'pdf' && (
            <div className="space-y-4">
              {/* Answer text */}
              <div className="prose-custom">
                <ReactMarkdown components={MarkdownComponents}>
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-300 mb-3">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium">Sources ({message.citations.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {message.citations.map((citation, index) => (
                      <CitationCard key={citation.chunkId} citation={citation} index={index} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search results */}
          {message.type === 'search_results' && message.searchResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300 mb-3">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Found {message.searchResults.length} sources</span>
              </div>
              <div className="space-y-3">
                {message.searchResults.map((result, index) => (
                  <SearchResultCard key={index} result={result} index={index} />
                ))}
              </div>
              {message.content && message.content !== 'No response' && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <ReactMarkdown components={MarkdownComponents}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Image response */}
          {message.type === 'image' && message.imageUrl && (
            <div>
              <div className="flex items-center gap-2 text-slate-300 mb-3">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Generated Image</span>
              </div>
              <ImageDisplay imageUrl={message.imageUrl} />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex mt-1">
          <span className="text-xs text-slate-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
