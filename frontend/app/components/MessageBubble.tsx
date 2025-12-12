'use client';

import { Message } from '../types/chat';
import { SearchResultCard } from './SearchResultCard';
import { ImageDisplay } from './ImageDisplay';

interface MessageBubbleProps {
  message: Message;
}

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
              <span className="text-slate-400 text-sm">Thinking...</span>
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

          {/* Text response */}
          {message.type === 'text' && (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
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

