'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, StreamChunk, SearchResult } from '../types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      type: 'text',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentAgent(null);

    // Create placeholder for assistant message
    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      type: 'loading',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Prepare conversation history
    const conversationHistory = messages
      .filter(m => m.type !== 'loading' && m.type !== 'error')
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';
      let searchResults: SearchResult[] = [];
      let imageUrl: string | undefined;
      let messageType: Message['type'] = 'text';
      let agentType: Message['agentType'];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'agent_start':
                  if (data.agentType) {
                    setCurrentAgent(data.agentType);
                    agentType = data.agentType as Message['agentType'];
                  }
                  break;

                case 'text_chunk':
                  accumulatedContent += data.content;
                  messageType = 'text';
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulatedContent, type: 'text', agentType }
                        : m
                    )
                  );
                  break;

                case 'search_result':
                  searchResults.push(data.content);
                  messageType = 'search_results';
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantMessageId
                        ? { ...m, searchResults: [...searchResults], type: 'search_results', agentType: 'search' }
                        : m
                    )
                  );
                  break;

                case 'image':
                  imageUrl = data.content;
                  messageType = 'image';
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantMessageId
                        ? { ...m, imageUrl, content: 'Generated image', type: 'image', agentType: 'image' }
                        : m
                    )
                  );
                  break;

                case 'error':
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantMessageId
                        ? { ...m, content: data.content, type: 'error' }
                        : m
                    )
                  );
                  break;

                case 'agent_end':
                  setCurrentAgent(null);
                  break;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Final update with all accumulated data
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: accumulatedContent || (imageUrl ? 'Generated image' : 'No response'),
                type: messageType,
                agentType,
                searchResults: searchResults.length > 0 ? searchResults : undefined,
                imageUrl,
              }
            : m
        )
      );

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: 'Request cancelled', type: 'error' }
              : m
          )
        );
      } else {
        console.error('Chat error:', error);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: `Error: ${error.message}`, type: 'error' }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      setCurrentAgent(null);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    currentAgent,
    sendMessage,
    stopGeneration,
    clearMessages,
  };
}

