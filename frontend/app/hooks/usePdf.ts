'use client';

import { useState, useCallback } from 'react';
import {
  PdfDocument,
  PdfUploadResponse,
  PdfMessage,
  Citation,
  PdfStreamChunk,
} from '../types/pdf';

const API_BASE = 'http://localhost:3001';

export function usePdf() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<PdfMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  // ============================================================================
  // PDF UPLOAD
  // ============================================================================

  const uploadPdf = useCallback(async (file: File): Promise<PdfUploadResponse | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/pdf/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data: PdfUploadResponse = await response.json();
      
      setDocument({
        id: data.documentId,
        name: data.filename,
        pages: data.totalPages,
        chunks: data.totalChunks,
        uploadedAt: new Date(),
      });

      // Add system message
      setMessages([{
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: `📄 **${data.filename}** uploaded successfully!\n\n**Pages:** ${data.totalPages}\n**Chunks:** ${data.totalChunks}\n\nYou can now ask questions about this document. Try selecting text in the PDF viewer to ask about specific sections.`,
        type: 'text',
        timestamp: new Date(),
      }]);

      return data;
    } catch (error: any) {
      setUploadError(error.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ============================================================================
  // PDF QUERY (Streaming)
  // ============================================================================

  const queryPdf = useCallback(async (query: string) => {
    if (!document) return;

    setIsQuerying(true);

    // Add user message
    const userMessage: PdfMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      type: 'text',
      selectedText: selectedText || undefined,
      timestamp: new Date(),
    };

    // Add loading message
    const loadingMessage: PdfMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      type: 'loading',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);

    try {
      const response = await fetch(`${API_BASE}/pdf/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          query,
          selectedText: selectedText || undefined,
          selectedPage: selectedPage || undefined,
        }),
      });

      if (!response.ok) throw new Error('Query failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let content = '';
      let citations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: PdfStreamChunk = JSON.parse(line.slice(6));

              if (chunk.type === 'text_chunk') {
                content += chunk.content;
                // Update message content
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (newMessages[lastIndex]?.type === 'loading' || newMessages[lastIndex]?.role === 'assistant') {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content,
                      type: 'text',
                      citations,
                    };
                  }
                  return newMessages;
                });
              }

              if (chunk.type === 'citation') {
                citations.push(chunk.content);
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (newMessages[lastIndex]?.role === 'assistant') {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      citations,
                    };
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip malformed chunks
            }
          }
        }
      }

      // Clear selection after query
      setSelectedText('');
      setSelectedPage(null);

    } catch (error: any) {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${error.message}`,
          type: 'error',
          timestamp: new Date(),
        };
        return newMessages;
      });
    } finally {
      setIsQuerying(false);
    }
  }, [document, selectedText, selectedPage]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const clearDocument = useCallback(() => {
    setDocument(null);
    setMessages([]);
    setSelectedText('');
    setSelectedPage(null);
  }, []);

  const handleTextSelection = useCallback((text: string, page?: number) => {
    setSelectedText(text);
    if (page) setSelectedPage(page);
  }, []);

  return {
    // State
    document,
    isUploading,
    uploadError,
    messages,
    isQuerying,
    selectedText,
    selectedPage,
    
    // Actions
    uploadPdf,
    queryPdf,
    clearDocument,
    handleTextSelection,
    setSelectedText,
    setSelectedPage,
  };
}

