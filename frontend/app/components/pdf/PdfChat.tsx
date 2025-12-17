'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PdfMessage, Citation } from '../../types/pdf';
import { CitationList } from './CitationCard';

interface PdfChatProps {
  messages: PdfMessage[];
  isQuerying: boolean;
  selectedText: string;
  onSendMessage: (message: string) => void;
  onCitationClick?: (citation: Citation) => void;
  onClearSelection?: () => void;
}

export function PdfChat({
  messages,
  isQuerying,
  selectedText,
  onSendMessage,
  onCitationClick,
  onClearSelection,
}: PdfChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isQuerying) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 
                         flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Chat with PDF</h3>
            <p className="text-xs text-slate-400">Ask questions about your document</p>
          </div>
        </div>
      </div>

      {/* Selected Text Banner */}
      {selectedText && (
        <div className="mx-4 mt-3 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-purple-400 font-medium flex-shrink-0">
                Ask about:
              </span>
              <span className="text-xs text-slate-300 truncate">
                "{selectedText.substring(0, 40)}{selectedText.length > 40 ? '...' : ''}"
              </span>
            </div>
            <button
              onClick={onClearSelection}
              className="p-1 hover:bg-slate-700/50 rounded transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-slate-300 mb-1">Start a conversation</h4>
            <p className="text-xs text-slate-500 max-w-xs">
              Ask questions about your PDF or select text to inquire about specific sections
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-cyan-500/20 border-cyan-500/30'
                    : 'bg-slate-800/50 border-slate-700/50'
                } border rounded-2xl px-4 py-3`}
              >
                {/* Selected Text Context */}
                {message.selectedText && (
                  <div className="mb-2 px-2 py-1 bg-purple-500/10 rounded-lg text-xs text-purple-300">
                    Re: "{message.selectedText.substring(0, 30)}..."
                  </div>
                )}

                {/* Loading State */}
                {message.type === 'loading' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : message.type === 'error' ? (
                  <p className="text-sm text-red-400">{message.content}</p>
                ) : (
                  <>
                    {/* Message Content */}
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="text-sm text-slate-200 leading-relaxed mb-2 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-slate-100">{children}</strong>
                          ),
                          code: ({ children }) => (
                            <code className="px-1 py-0.5 bg-slate-700/50 rounded text-xs text-cyan-300">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <CitationList
                        citations={message.citations}
                        onCitationClick={onCitationClick}
                      />
                    )}
                  </>
                )}

                {/* Timestamp */}
                <p className="mt-2 text-[10px] text-slate-500">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedText ? "Ask about selected text..." : "Ask about the document..."}
            disabled={isQuerying}
            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl
                      text-sm text-slate-200 placeholder-slate-500
                      focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
                      disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isQuerying}
            className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl
                      text-white font-medium text-sm
                      hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all"
          >
            {isQuerying ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

