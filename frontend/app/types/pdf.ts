// PDF types for the chat interface

export interface PdfDocument {
  id: string;
  name: string;
  pages: number;
  chunks?: number;
  uploadedAt: Date;
}

export interface Citation {
  pageNumber: number;
  chunkId: string;
  text: string;
  relevanceScore?: number;
  startChar: number;
  endChar: number;
}

export interface PdfUploadResponse {
  success: boolean;
  documentId: string;
  filename: string;
  totalPages: number;
  totalChunks: number;
  preview: string;
  message: string;
}

export interface PdfQueryResponse {
  answer: string;
  citations: Citation[];
  documentId: string;
  confidence: number;
}

export interface PdfStreamChunk {
  type: 'text_chunk' | 'citation' | 'processing' | 'error' | 'complete';
  content: any;
  timestamp?: string;
}

export interface PdfMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'loading' | 'error';
  citations?: Citation[];
  selectedText?: string;
  timestamp: Date;
}

