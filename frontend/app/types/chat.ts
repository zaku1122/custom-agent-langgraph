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

// Sources for summaries (like Gemini's sources) - CHUNK LEVEL for precise highlighting
export interface SummarySource {
  pageNumber: number;
  chunkId: string;
  chunkIndex: number;       // Source index (0-based) - [Source X] where X = chunkIndex + 1
  text: string;             // FULL chunk text for highlighting
  preview: string;          // Short preview for display (first 150 chars)
  contribution: string;     // What this source contributed to the summary
}

export interface FileResult {
  filename: string;
  mimeType: string;
  data: string; // Base64 encoded
  tablePreview: {
    headers: string[];
    rows: string[][];
  };
  description: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'search_results' | 'error' | 'loading' | 'pdf' | 'file' | 'summary';
  agentType?: 'answer' | 'search' | 'image' | 'pdf' | 'file';
  searchResults?: SearchResult[];
  imageUrl?: string;
  citations?: Citation[];
  summarySources?: SummarySource[]; // Sources for summary with clickable page refs
  pdfName?: string;  // Name of attached PDF
  fileResult?: FileResult; // Generated file data
  timestamp: Date;
}

export interface StreamChunk {
  type: 'text_chunk' | 'search_result' | 'image' | 'file' | 'agent_start' | 'agent_end' | 'error' | 'citation' | 'processing';
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
  type: 'text' | 'image' | 'search_results' | 'file' | 'error';
  content: string | SearchResult[] | FileResult;
  agentType?: 'answer' | 'search' | 'image' | 'file';
  metadata?: {
    model?: string;
    timestamp?: string;
    searchResults?: SearchResult[];
    fileResult?: FileResult;
  };
}
