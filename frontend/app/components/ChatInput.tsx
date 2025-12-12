'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-lg px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-3">
          {/* Input container */}
          <div className="flex-1 relative">
            <div className="relative bg-slate-800/70 rounded-2xl border border-slate-700/50 
                           focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 
                           transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Shift+Enter for new line)"
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-transparent text-slate-100 placeholder-slate-500 
                          resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
                          scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                style={{ maxHeight: '200px' }}
              />
              
              {/* Character count (optional, shows when typing) */}
              {message.length > 0 && (
                <span className="absolute right-3 bottom-3 text-xs text-slate-500">
                  {message.length}
                </span>
              )}
            </div>
          </div>

          {/* Send/Stop button */}
          {isLoading ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 
                        text-red-400 hover:bg-red-500/30 hover:border-red-500/50 
                        transition-all duration-200 flex items-center justify-center"
              title="Stop generation"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 
                        text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 
                        hover:scale-105 active:scale-95 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        disabled:shadow-none flex items-center justify-center"
              title="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { label: '🔍 Search news', prompt: 'What are the latest AI news today?' },
            { label: '🎨 Generate image', prompt: 'Generate an image of a futuristic city at sunset' },
            { label: '💡 Explain', prompt: 'Explain quantum computing in simple terms' },
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => setMessage(item.prompt)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50 
                        rounded-lg border border-slate-700/50 hover:border-slate-600/50 
                        hover:text-slate-300 hover:bg-slate-800 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

