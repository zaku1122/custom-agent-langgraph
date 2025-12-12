import { Injectable, Logger } from '@nestjs/common';
import { ChatMessageDto, ChatResponse, StreamChunk } from './dto/chat.dto';
import { executeLangGraph, streamLangGraphEvents } from './agents/langgraph.agent';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /**
   * Non-streaming chat - returns complete response
   */
  async chat(chatMessageDto: ChatMessageDto): Promise<ChatResponse> {
    const { message, conversationHistory = [] } = chatMessageDto;

    try {
      this.logger.log(`Processing message: ${message}`);

      // Execute LangGraph
      const result = await executeLangGraph(message, conversationHistory);

      // Format response based on agent type
      if (result.agentType === 'image') {
        return {
          type: 'image',
          content: result.imageUrl || '',
          agentType: 'image',
          metadata: {
            model: 'dall-e-3',
            timestamp: new Date().toISOString(),
          },
        };
      }

      if (result.agentType === 'search' && result.searchResults) {
        return {
          type: 'search_results',
          content: result.searchResults,
          agentType: 'search',
          metadata: {
            timestamp: new Date().toISOString(),
            searchResults: result.searchResults,
          },
        };
      }

      // Default: text response
      return {
        type: 'text',
        content: result.finalResponse || 'No response generated',
        agentType: result.agentType || 'answer',
        metadata: {
          model: 'gpt-4o',
          timestamp: new Date().toISOString(),
          searchResults: result.searchResults,
        },
      };
    } catch (error: any) {
      this.logger.error(`Chat error: ${error.message}`, error.stack);

      return {
        type: 'error',
        content: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Streaming chat - yields chunks via async generator
   */
  async *chatStream(chatMessageDto: ChatMessageDto): AsyncGenerator<StreamChunk> {
    const { message, conversationHistory = [] } = chatMessageDto;

    try {
      this.logger.log(`Streaming message: ${message}`);

      // Yield start event
      yield {
        type: 'agent_start',
        content: { message: 'Processing...' },
        timestamp: new Date().toISOString(),
      };

      // Stream events from LangGraph
      const eventStream = streamLangGraphEvents(message, conversationHistory);

      for await (const event of eventStream) {
        const nodeName = Object.keys(event)[0];
        const nodeData = event[nodeName];

        this.logger.debug(`Node: ${nodeName}`);

        // Emit node-specific events
        if (nodeName === 'router') {
          yield {
            type: 'agent_start',
            content: { agent: nodeData.agentType },
            agentType: nodeData.agentType,
            timestamp: new Date().toISOString(),
          };
        }

        if (nodeName === 'search' && nodeData.searchResults) {
          for (const result of nodeData.searchResults) {
            yield {
              type: 'search_result',
              content: result,
              timestamp: new Date().toISOString(),
            };
          }
        }

        if (nodeName === 'image' && nodeData.imageUrl) {
          yield {
            type: 'image',
            content: nodeData.imageUrl,
            timestamp: new Date().toISOString(),
          };
        }

        if (nodeName === 'answer' && nodeData.finalResponse) {
          // Stream answer in chunks
          const response = nodeData.finalResponse;
          const chunkSize = 50;

          for (let i = 0; i < response.length; i += chunkSize) {
            yield {
              type: 'text_chunk',
              content: response.slice(i, i + chunkSize),
              timestamp: new Date().toISOString(),
            };
            
            // Small delay for better UX
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      }

      // Yield end event
      yield {
        type: 'agent_end',
        content: { message: 'Complete' },
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      this.logger.error(`Stream error: ${error.message}`, error.stack);

      yield {
        type: 'error',
        content: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}