'use client';

import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatContainer() {
  const { messages, isLoading, currentAgent, sendMessage, stopGeneration, clearMessages } = useChat();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur opacity-50" />
              <div className="relative w-full h-full bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700/50">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">LangGraph Agent</h1>
              <p className="text-xs text-slate-500">Multi-Agent AI • Azure Powered</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-xs text-slate-400">
                {isLoading ? 'Processing' : 'Ready'}
              </span>
            </div>

            {/* Clear chat button */}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                disabled={isLoading}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Message list */}
      <MessageList 
        messages={messages} 
        isLoading={isLoading} 
        currentAgent={currentAgent} 
      />

      {/* Input area */}
      <ChatInput 
        onSend={sendMessage} 
        isLoading={isLoading} 
        onStop={stopGeneration} 
      />
    </div>
  );
}

