'use client';

import { useEffect, useRef } from 'react';
import { Message } from '../types/chat';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentAgent: string | null;
  onPageClick?: (pageNumber: number, textToHighlight?: string) => void;
}

export function MessageList({ messages, isLoading, currentAgent, onPageClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          {/* Animated logo/icon */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 
                            rounded-2xl blur-xl opacity-50 animate-pulse" />
            <div className="relative w-full h-full bg-slate-800/80 backdrop-blur rounded-2xl 
                            border border-slate-700/50 flex items-center justify-center">
              <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-100 mb-3">
            Multi-Agent AI Assistant
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Powered by LangGraph with specialized agents for answers, web search, and image generation.
          </p>

          {/* Quick action suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 
                           hover:border-emerald-500/30 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium mb-1">Ask Questions</p>
              <p className="text-slate-500 text-xs">Get detailed answers powered by GPT-4o</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 
                           hover:border-cyan-500/30 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium mb-1">Web Search</p>
              <p className="text-slate-500 text-xs">Find latest info with Bing grounding</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 
                           hover:border-purple-500/30 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium mb-1">Generate Images</p>
              <p className="text-slate-500 text-xs">Create visuals with DALL-E 3</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} onPageClick={onPageClick} />
        ))}

        {/* Agent activity indicator - don't show for document/pdf uploads (they have their own loading message) */}
        {isLoading && currentAgent && !['document', 'pdf'].includes(currentAgent) && (
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 ml-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span>
              {currentAgent === 'search' && 'Searching the web...'}
              {currentAgent === 'image' && 'Generating image...'}
              {currentAgent === 'answer' && 'Composing response...'}
              {!['search', 'image', 'answer'].includes(currentAgent) && 'Processing...'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
