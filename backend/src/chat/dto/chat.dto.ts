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

export interface StreamChunk {
  type: 'text_chunk' | 'search_result' | 'image' | 'agent_start' | 'agent_end' | 'error';
  content: any;
  agentType?: string;
  timestamp?: string;
}