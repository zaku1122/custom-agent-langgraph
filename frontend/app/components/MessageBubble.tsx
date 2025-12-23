'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Citation, SummarySource } from '../types/chat';
import { SearchResultCard } from './SearchResultCard';
import { ImageDisplay } from './ImageDisplay';
import { FileDisplay } from './FileDisplay';

interface MessageBubbleProps {
  message: Message;
  onPageClick?: (pageNumber: number, textToHighlight?: string) => void;
}

// Sources Button Component - shows clickable sources with text previews
function SourcesButton({ 
  sources, 
  onSourceClick 
}: { 
  sources: SummarySource[]; 
  onSourceClick?: (pageNumber: number, textToHighlight?: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors w-full"
      >
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-medium text-slate-300">
          Sources ({sources.length})
        </span>
        <svg 
          className={`w-4 h-4 ml-auto text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {sources.map((source, idx) => (
            <div key={source.chunkId || idx} className="flex gap-2">
              {/* Navigate button */}
              <button
                onClick={() => onSourceClick?.(source.pageNumber, source.text)}
                className="flex-1 flex items-start gap-3 px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors text-left"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-cyan-400">Page {source.pageNumber}</span>
                    <span className="text-[10px] text-slate-500">• Click to highlight</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3">{source.preview || source.text?.substring(0, 150)}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Source Reference Component - inline numbered badges like ① ② ③
function SourceRef({ 
  sourceIndex, 
  source, 
  onClick 
}: { 
  sourceIndex: number; 
  source?: SummarySource;
  onClick?: (pageNumber: number, textToHighlight?: string) => void;
}) {
  const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
  const displayNumber = sourceIndex < 20 ? circledNumbers[sourceIndex] : `[${sourceIndex + 1}]`;

  return (
    <button
      onClick={() => source && onClick?.(source.pageNumber, source.text)}
      className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.5 text-xs font-medium 
                 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors cursor-pointer"
      title={source ? `Page ${source.pageNumber}: ${source.preview?.substring(0, 100) || ''}...` : `Source ${sourceIndex + 1}`}
    >
      {displayNumber}
    </button>
  );
}

// Process text to replace source citations with clickable badges
function TextWithSourceRefs({ 
  text, 
  sources, 
  onSourceClick 
}: { 
  text: string; 
  sources?: SummarySource[];
  onSourceClick?: (pageNumber: number, textToHighlight?: string) => void;
}) {
  if (!sources || sources.length === 0) return <>{text}</>;

  // Match multiple citation patterns LLMs commonly use:
  // [Source 1], [Source 1, 2], [Sources 1, 2], [Source 1, p. 1], [1], (Source 1), etc.
  const patterns = [
    /\[Sources?\s*[\d,\s;p.\-–and]+\]/gi,           // [Source 1], [Sources 1, 2], [Source 1-3]
    /\[(?:Ref|Reference)s?\s*[\d,\s;p.\-–and]+\]/gi, // [Ref 1], [Reference 1, 2]
    /\[\d+(?:\s*[,;]\s*\d+)*\]/g,                    // [1], [1, 2, 3], [1; 2]
    /\(Sources?\s*[\d,\s;p.\-–and]+\)/gi,           // (Source 1), (Sources 1, 2)
  ];
  
  // Combine all patterns
  const combinedPattern = new RegExp(
    patterns.map(p => p.source).join('|'),
    'gi'
  );

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Extract all numbers from the match
    const fullMatch = match[0];
    const allNumbers = fullMatch.match(/\d+/g) || [];
    
    // For patterns like "1-3" or "1–3", expand the range
    const expandedNumbers: number[] = [];
    const rangeMatch = fullMatch.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      for (let i = start; i <= end && i <= sources.length; i++) {
        expandedNumbers.push(i);
      }
    } else {
      allNumbers.forEach(n => expandedNumbers.push(parseInt(n)));
    }
    
    // Get unique numbers and create refs
    const uniqueNums = [...new Set(expandedNumbers)].filter(n => n > 0 && n <= sources.length);
    
    if (uniqueNums.length > 0) {
      uniqueNums.forEach((num, i) => {
        const sourceIdx = num - 1;
        const source = sources[sourceIdx];
        if (source) {
          parts.push(
            <SourceRef 
              key={`${match!.index}-${i}-${num}`}
              sourceIndex={sourceIdx} 
              source={source}
              onClick={onSourceClick}
            />
          );
        }
      });
    } else {
      // No valid source numbers found, keep original text
      parts.push(fullMatch);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

// Citation Card Component
function CitationCard({ 
  citation, 
  index,
  onPageClick 
}: { 
  citation: Citation; 
  index: number;
  onPageClick?: (pageNumber: number, textToHighlight?: string) => void;
}) {
  return (
    <button
      onClick={() => onPageClick?.(citation.pageNumber, citation.text)}
      className="w-full p-3 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-orange-500/30 transition-colors text-left"
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 
                       flex items-center justify-center text-xs font-bold text-white">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-orange-400">Page {citation.pageNumber}</span>
            <span className="text-[10px] text-slate-500">• Click to highlight</span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">"{citation.text}"</p>
        </div>
      </div>
    </button>
  );
}

// Markdown components with custom styling and source ref support
const createMarkdownComponents = (sources?: SummarySource[], onSourceClick?: (pageNumber: number, textToHighlight?: string) => void) => ({
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
  p: ({ children }: any) => {
    const processChildren = (child: any): any => {
      if (typeof child === 'string') {
        return <TextWithSourceRefs text={child} sources={sources} onSourceClick={onSourceClick} />;
      }
      return child;
    };
    
    const processed = Array.isArray(children) 
      ? children.map((child, i) => <span key={i}>{processChildren(child)}</span>)
      : processChildren(children);
    
    return <p className="text-slate-200 leading-relaxed mb-3 last:mb-0">{processed}</p>;
  },
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-slate-200">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-200">{children}</ol>
  ),
  li: ({ children }: any) => {
    const processChildren = (child: any): any => {
      if (typeof child === 'string') {
        return <TextWithSourceRefs text={child} sources={sources} onSourceClick={onSourceClick} />;
      }
      return child;
    };
    
    const processed = Array.isArray(children) 
      ? children.map((child, i) => <span key={i}>{processChildren(child)}</span>)
      : processChildren(children);
    
    return <li className="text-slate-200">{processed}</li>;
  },
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
});

export function MessageBubble({ message, onPageClick }: MessageBubbleProps) {
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
      case 'file':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
      case 'file':
        return 'File Agent';
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
      case 'file':
        return 'from-emerald-500 to-green-600';
      default:
        return 'from-emerald-500 to-teal-600';
    }
  };

  // Create markdown components with source ref support
  const MarkdownComponents = createMarkdownComponents(message.summarySources, onPageClick);

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
              {/* Show sources button for summaries */}
              {message.summarySources && message.summarySources.length > 0 && (
                <SourcesButton sources={message.summarySources} onSourceClick={onPageClick} />
              )}
            </div>
          )}

          {/* PDF response with citations and sources */}
          {message.type === 'pdf' && (
            <div className="space-y-4">
              {/* Answer text with source refs */}
              <div className="prose-custom">
                <ReactMarkdown components={MarkdownComponents}>
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Summary Sources (for initial summary) */}
              {message.summarySources && message.summarySources.length > 0 && (
                <SourcesButton sources={message.summarySources} onSourceClick={onPageClick} />
              )}

              {/* Citations (for Q&A responses) */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-300 mb-3">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium">Citations ({message.citations.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {message.citations.map((citation, index) => (
                      <CitationCard 
                        key={citation.chunkId} 
                        citation={citation} 
                        index={index}
                        onPageClick={onPageClick}
                      />
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

          {/* File response */}
          {message.type === 'file' && message.fileResult && (
            <FileDisplay fileResult={message.fileResult} />
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
