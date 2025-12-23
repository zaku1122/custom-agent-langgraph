import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';

// ============================================================================
// CONFIGURABLE CHUNKING PARAMETERS
// ============================================================================

export interface ChunkingConfig {
  chunkSize: number;      // Default: 500
  overlap: number;        // Default: 50
  minChunkSize: number;   // Default: 100
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 250,  // Smaller chunks for more precise references
  overlap: 30,
  minChunkSize: 50,
};

// ============================================================================
// PDF UPLOAD & STORAGE
// ============================================================================

export interface PdfDocument {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: Date;
  totalPages: number;
  totalChunks: number;
  chunks: PdfChunk[];
  fullText: string;              // Store full text for summarization
  summary?: string;              // Map-reduce summary of full document
  chunkingConfig: ChunkingConfig; // Store config used for chunking
}

export interface PdfChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  startChar: number;
  endChar: number;
  embedding?: number[];          // Vector embedding for similarity search
  summary?: string;              // Individual chunk summary (map step)
}

// ============================================================================
// PDF QUERY & CITATION
// ============================================================================

export class PdfQueryDto {
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsString()
  selectedText?: string;

  @IsOptional()
  @IsNumber()
  selectedPage?: number;

  @IsOptional()
  @IsBoolean()
  useSummarization?: boolean; // Use map-reduce summarization

  @IsOptional()
  @IsString()
  sessionId?: string; // For conversation continuity (creates new if not provided)
}

// ============================================================================
// SUMMARIZATION DTOs
// ============================================================================

export class SummarizeDto {
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @IsOptional()
  @IsString()
  selectedText?: string; // Summarize specific text instead of full doc

  @IsOptional()
  @IsNumber()
  maxSummaryLength?: number; // Max tokens for final summary
}

// Source reference for a summary (like Gemini's sources) - CHUNK LEVEL for precise highlighting
export interface SummarySource {
  pageNumber: number;
  chunkId: string;
  chunkIndex: number;       // Chunk index for ordering (0, 1, 2...)
  text: string;             // FULL chunk text for highlighting (not preview)
  preview: string;          // Short preview for display (first 150 chars)
  contribution: string;     // What this source contributed to the summary
}

export interface ChunkSummaryWithSource {
  chunkId: string;
  chunkIndex: number;       // Chunk index for citation references
  summary: string;
  pageNumber: number;
  sourceText: string;       // FULL original chunk text for highlighting
  sourcePreview: string;    // Short preview for display
}

export interface SummarizeResponse {
  summary: string;
  documentId: string;
  chunkSummaries: ChunkSummaryWithSource[]; // Map step results WITH page refs
  sources: SummarySource[];                  // Aggregated sources for display
  processingTime: number; // ms
}

export interface Citation {
  pageNumber: number;
  chunkId: string;
  text: string;
  relevanceScore: number;
  startChar: number;
  endChar: number;
}

export interface PdfQueryResponse {
  answer: string;
  citations: Citation[];
  documentId: string;
  confidence: number;
  sessionId: string;           // Session ID for conversation continuity
  conversationLength: number;  // Number of messages in session
}

// ============================================================================
// PDF UPLOAD RESPONSE
// ============================================================================

export interface PdfUploadResponse {
  success: boolean;
  documentId: string;
  filename: string;
  totalPages: number;
  totalChunks: number;
  preview: string; // First 500 chars
  message: string;
  summary?: string; // Map-reduce summary
  summarySources?: SummarySource[]; // Sources for the summary (clickable page refs)
  chunkingConfig: ChunkingConfig; // Config used
}

// ============================================================================
// STREAM CHUNKS
// ============================================================================

export interface PdfStreamChunk {
  type: 'text_chunk' | 'citation' | 'processing' | 'error' | 'complete' | 'session_info' | 'sources';
  content: any;
  timestamp?: string;
}

// ============================================================================
// CONVERSATION MEMORY (Short-Term Memory)
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];    // For assistant messages with citations
}

export interface ConversationSession {
  id: string;
  documentId: string;
  documentName: string;
  messages: ConversationMessage[];
  createdAt: Date;
  lastActivityAt: Date;
}

// Configuration for memory management
export interface MemoryConfig {
  maxMessages: number;       // Max messages to keep in context (default: 10)
  maxTokensEstimate: number; // Rough token limit for history (default: 2000)
  sessionTimeoutMs: number;  // Auto-cleanup after inactivity (default: 30 min)
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxMessages: 10,
  maxTokensEstimate: 2000,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
};
