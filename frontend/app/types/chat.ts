// Message types for the chat interface

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  provider: string;
}

export interface Citation {
  pageNumber: number;
  chunkId: string;
  text: string;
  relevanceScore?: number;
  startChar: number;
  endChar: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'search_results' | 'error' | 'loading' | 'pdf';
  agentType?: 'answer' | 'search' | 'image' | 'pdf';
  searchResults?: SearchResult[];
  imageUrl?: string;
  citations?: Citation[];
  pdfName?: string;  // Name of attached PDF
  timestamp: Date;
}

export interface StreamChunk {
  type: 'text_chunk' | 'search_result' | 'image' | 'agent_start' | 'agent_end' | 'error' | 'citation' | 'processing';
  content: any;
  agentType?: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface ChatResponse {
  type: 'text' | 'image' | 'search_results' | 'error';
  content: string | SearchResult[];
  agentType?: 'answer' | 'search' | 'image';
  metadata?: {
    model?: string;
    timestamp?: string;
    searchResults?: SearchResult[];
  };
}
