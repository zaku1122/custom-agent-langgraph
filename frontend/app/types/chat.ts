// Message types for the chat interface

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  provider: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'search_results' | 'error' | 'loading';
  agentType?: 'answer' | 'search' | 'image';
  searchResults?: SearchResult[];
  imageUrl?: string;
  timestamp: Date;
}

export interface StreamChunk {
  type: 'text_chunk' | 'search_result' | 'image' | 'agent_start' | 'agent_end' | 'error';
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

