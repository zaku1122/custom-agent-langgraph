import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';

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
}

export interface PdfChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  startChar: number;
  endChar: number;
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
}

// ============================================================================
// STREAM CHUNKS
// ============================================================================

export interface PdfStreamChunk {
  type: 'text_chunk' | 'citation' | 'processing' | 'error' | 'complete';
  content: any;
  timestamp?: string;
}

