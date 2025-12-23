'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, StreamChunk, SearchResult, FileResult, SummarySource } from '../types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Auto-detect if user wants a summary vs asking a specific question
function detectSummaryIntent(query: string, selectedText?: string): boolean {
  // If there's selected text, always treat as a question about that text
  if (selectedText && selectedText.trim().length > 0) {
    return false;
  }
  
  const q = query.toLowerCase().trim();
  
  // Empty query or very short → summary
  if (q.length === 0 || q.length < 5) {
    return true;
  }
  
  // Question indicators → NOT a summary request
  const questionPatterns = [
    /^(what|why|how|when|where|who|which|whose|whom)\b/i,
    /^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\b/i,
    /^(tell me|explain|describe|show me|find|list|give me|get me)\b/i,
    /\?$/,  // Ends with question mark
  ];
  
  for (const pattern of questionPatterns) {
    if (pattern.test(q)) {
      return false; // It's a question
    }
  }
  
  // Summary indicators → summary request
  const summaryPatterns = [
    /\b(summarize|summary|overview|main points|key points|tldr|tl;dr|gist)\b/i,
    /\b(what is this|what's this|about this)\s*(document|pdf|file)?$/i,
  ];
  
  for (const pattern of summaryPatterns) {
    if (pattern.test(q)) {
      return true; // It's a summary request
    }
  }
  
  // Default: if query is short and doesn't look like a question, summarize
  // If query is longer, treat as a question
  return q.split(/\s+/).length < 4;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentPdfName, setCurrentPdfName] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Upload document and get document ID + analysis + summary/sources for PDF
  const uploadDocument = async (file: File): Promise<{ 
    documentId: string; 
    analysis: any;
    summary?: string;
    summarySources?: SummarySource[];
  } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const isPdf = file.type === 'application/pdf';
      const endpoint = isPdf ? `${API_URL}/pdf/upload` : `${API_URL}/documents/upload`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Document upload failed');
      }

      const data = await response.json();
      
      if (isPdf) {
        // PDF endpoint returns: { documentId, summary, summarySources, ... }
        return { 
          documentId: data.documentId, 
          analysis: {
            summary: data.summary,
            keyPoints: [], // PDF endpoint doesn't provide keyPoints
          },
          summary: data.summary,
          summarySources: data.summarySources,
        };
      } else {
        // Document endpoint returns: { documentId, analysis, ... }
        return { documentId: data.documentId, analysis: data.analysis };
      }
    } catch (error) {
      console.error('Document upload error:', error);
      return null;
    }
  };

  // Get detailed summary (map-reduce) for a document
  const getDetailedSummary = async (
    documentId: string,
    assistantMessageId: string,
    pdfName?: string
  ) => {
    // Show progress
    setMessages(prev =>
      prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: 'Generating detailed summary...', type: 'loading' }
          : m
      )
    );

    const response = await fetch(`${API_URL}/pdf/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error('Summarization failed');
    }

    const result = await response.json();
    
    // Update message with detailed summary and sources
    setMessages(prev =>
      prev.map(m =>
        m.id === assistantMessageId
          ? { 
              ...m, 
              content: result.summary,
              type: 'text',
              agentType: 'pdf',
              pdfName,
              summarySources: result.sources,
            }
          : m
      )
    );

    return result;
  };

  // Query document with streaming
  const queryDocument = async (
    documentId: string,
    query: string,
    assistantMessageId: string,
    selectedText?: string,
    selectedPage?: number
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
              setCurrentAgent('document');
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    }
  };

  // Query PDF with streaming - sources are returned per-query from backend
  const queryPdf = async (
    documentId: string,
    query: string,
    assistantMessageId: string,
    selectedText?: string,
    selectedPage?: number,
    pdfName?: string
  ) => {
    const response = await fetch(`${API_URL}/pdf/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, query, selectedText, selectedPage }),
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
    let existingPdfName: string | undefined = pdfName;
    let querySources: SummarySource[] = []; // Sources specific to this query

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Capture query-specific sources (from relevant chunks)
            if (data.type === 'sources' && Array.isArray(data.content)) {
              querySources = data.content;
              // Update message with new sources immediately
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, summarySources: querySources, pdfName: existingPdfName }
                    : m
                )
              );
            }

            // Stream text chunks with the query-specific sources
            if (data.type === 'text_chunk') {
              accumulatedContent += data.content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: accumulatedContent, type: 'pdf', agentType: 'pdf', pdfName: existingPdfName, summarySources: querySources }
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

    return { content: accumulatedContent, sources: querySources };
  };

  const sendMessage = useCallback(async (content: string, attachedFile?: File, selectedText?: string, selectedPage?: number) => {
    if ((!content.trim() && !attachedFile) || isLoading) return;

    // Determine file type
    const isPdf = attachedFile?.type === 'application/pdf';
    const isDocument = attachedFile && (
      isPdf ||
      attachedFile.type.includes('word') ||
      attachedFile.type.startsWith('text/')
    );
    const isImage = attachedFile?.type.startsWith('image/');

    // Build user message content
    let displayContent = content.trim() || (attachedFile ? `Analyze this ${isImage ? 'image' : 'document'}` : '');
    if (selectedText) {
      const pageInfo = selectedPage ? ` (Page ${selectedPage})` : '';
      displayContent = `[About: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"${pageInfo}]\n\n${displayContent}`;
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: displayContent,
      type: 'text',
      pdfName: attachedFile?.name,
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
        setCurrentAgent(isPdf ? 'pdf' : (isImage ? 'image' : 'document'));
        
        // Show uploading status
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: `Uploading and processing ${isPdf ? 'PDF' : (isImage ? 'image' : 'document')}...`, type: 'loading' }
              : m
          )
        );

        // Upload document
        const result = await uploadDocument(attachedFile);
        
        if (!result) {
          throw new Error('Failed to upload file');
        }

        const userQuery = content.trim();
        const hasSources = result.summarySources && result.summarySources.length > 0;
        
        // Store document ID for subsequent queries with selected text
        if (isPdf) {
          setCurrentDocumentId(result.documentId);
          setCurrentPdfName(attachedFile.name);
        }

        // For PDFs: auto-detect if user wants summary vs asking a question
        if (isPdf) {
          const shouldSummarize = detectSummaryIntent(userQuery, selectedText);
          
          if (shouldSummarize) {
            // No specific question - provide detailed summary
            await getDetailedSummary(result.documentId, assistantMessageId, attachedFile.name);
          } else {
            // User asked a specific question - answer it directly
            await queryPdf(result.documentId, userQuery, assistantMessageId, selectedText, selectedPage, attachedFile.name);
          }
        } else {
          // Non-PDF or PDF without summary: use document query
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: 'Analyzing document...', type: 'loading' }
                : m
            )
          );

          await queryDocument(result.documentId, content.trim() || 'Summarize this document', assistantMessageId, selectedText, selectedPage);
        }
        
      } else if (currentDocumentId) {
        // Query existing PDF (with or without selected text)
        setCurrentAgent('pdf');
        
        const shouldSummarize = detectSummaryIntent(content.trim(), selectedText);
        
        if (shouldSummarize) {
          // No specific question - provide detailed summary
          await getDetailedSummary(currentDocumentId, assistantMessageId, currentPdfName || undefined);
        } else {
          // Answer question about selected text or general question
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: selectedText ? 'Analyzing selected text...' : 'Searching document...', type: 'loading', pdfName: currentPdfName || undefined }
                : m
            )
          );

          await queryPdf(currentDocumentId, content.trim(), assistantMessageId, selectedText, selectedPage, currentPdfName || undefined);
        }
        
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
  }, [messages, isLoading, currentDocumentId, currentPdfName]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearCurrentDocument = useCallback(() => {
    setCurrentDocumentId(null);
    setCurrentPdfName(null);
  }, []);

  return {
    messages,
    isLoading,
    currentAgent,
    sendMessage,
    stopGeneration,
    clearMessages,
    clearCurrentDocument,
  };
}
