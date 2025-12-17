import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  provider: string;
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

export interface StreamChunk {
  type: 'text_chunk' | 'search_result' | 'image' | 'file' | 'agent_start' | 'agent_end' | 'error';
  content: any;
  agentType?: string;
  timestamp?: string;
}