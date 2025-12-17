'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, StreamChunk, SearchResult, Citation, FileResult } from '../types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Upload any document and get document ID + analysis
  const uploadDocument = async (file: File): Promise<{ documentId: string; analysis: any } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Document upload failed');
      }

      const data = await response.json();
      return { documentId: data.documentId, analysis: data.analysis };
    } catch (error) {
      console.error('Document upload error:', error);
      return null;
    }
  };

  // Query document with streaming
  const queryDocument = async (
    documentId: string,
    query: string,
    assistantMessageId: string
  ) => {
    const response = await fetch(`${API_URL}/documents/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, query }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error('Document query failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let accumulatedContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text_chunk') {
              accumulatedContent += data.content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: accumulatedContent, type: 'text', agentType: 'answer' }
                    : m
                )
              );
            }

            if (data.type === 'info') {
              // Document info received
              setCurrentAgent('document');
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    }
  };

  // Upload PDF and get document ID (legacy support)
  const uploadPdf = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/pdf/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('PDF upload failed');
      }

      const data = await response.json();
      return data.documentId;
    } catch (error) {
      console.error('PDF upload error:', error);
      return null;
    }
  };

  // Query PDF with streaming
  const queryPdf = async (
    documentId: string,
    query: string,
    assistantMessageId: string,
    selectedText?: string
  ) => {
    const response = await fetch(`${API_URL}/pdf/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, query, selectedText }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error('PDF query failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let accumulatedContent = '';
    let citations: Citation[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'citation') {
              citations.push(data.content);
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, citations: [...citations], type: 'pdf', agentType: 'pdf' }
                    : m
                )
              );
            }

            if (data.type === 'text_chunk') {
              accumulatedContent += data.content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: accumulatedContent, type: 'pdf', agentType: 'pdf', citations }
                    : m
                )
              );
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    }

    return { content: accumulatedContent, citations };
  };

  const sendMessage = useCallback(async (content: string, attachedFile?: File, selectedText?: string) => {
    if ((!content.trim() && !attachedFile) || isLoading) return;

    // Determine file type
    const isDocument = attachedFile && (
      attachedFile.type === 'application/pdf' ||
      attachedFile.type.includes('word') ||
      attachedFile.type.startsWith('text/')
    );
    const isImage = attachedFile?.type.startsWith('image/');

    // Build user message content
    let displayContent = content.trim() || (attachedFile ? `Analyze this ${isImage ? 'image' : 'document'}` : '');
    if (selectedText) {
      displayContent = `[About: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"]\n\n${displayContent}`;
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: displayContent,
      type: 'text',
      pdfName: attachedFile?.name, // Keep for backwards compatibility
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

    try {
      abortControllerRef.current = new AbortController();

      // If file is attached, handle it with document loader
      if (attachedFile) {
        setCurrentAgent(isImage ? 'image' : 'document');
        
        // Show uploading status
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: `Uploading and processing ${isImage ? 'image' : 'document'}...`, type: 'loading' }
              : m
          )
        );

        // Upload document
        const result = await uploadDocument(attachedFile);
        
        if (!result) {
          throw new Error('Failed to upload file');
        }

        // Show analysis first if available
        if (result.analysis?.summary) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessageId
                ? { 
                    ...m, 
                    content: `**Document Analysis:**\n\n${result.analysis.summary}\n\n**Key Points:**\n${result.analysis.keyPoints?.map((p: string) => `• ${p}`).join('\n') || 'N/A'}\n\n---\n\n*Answering your question...*`, 
                    type: 'text',
                    agentType: 'answer'
                  }
                : m
            )
          );
        }

        // Query the document
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId && m.content.includes('Answering your question')
              ? { ...m }
              : m.id === assistantMessageId
                ? { ...m, content: 'Analyzing document...', type: 'loading' }
                : m
          )
        );

        await queryDocument(result.documentId, content.trim() || 'Summarize this document', assistantMessageId);
        
      } else {
        // Regular chat flow (no PDF)
        const conversationHistory = messages
          .filter(m => m.type !== 'loading' && m.type !== 'error')
          .map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          }));

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

                  case 'file':
                    const fileResult: FileResult = data.content;
                    messageType = 'file';
                    setMessages(prev =>
                      prev.map(m =>
                        m.id === assistantMessageId
                          ? { ...m, fileResult, content: fileResult.description, type: 'file', agentType: 'file' }
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
      }

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
