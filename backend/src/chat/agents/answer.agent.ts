import { chatClient, azureConfig } from '../../config/azure';
import { SearchResult } from '../dto/chat.dto';

export interface AnswerAgentOptions {
  message: string;
  searchResults?: SearchResult[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function answerAgent(options: AnswerAgentOptions): Promise<string> {
  const { message, searchResults, conversationHistory = [] } = options;

  try {
    // Build system message with grounding if available
    let systemMessage = 'You are a helpful AI assistant.';
    
    if (searchResults && searchResults.length > 0) {
      systemMessage += '\n\nUse the following search results to ground your answer:\n\n';
      searchResults.forEach((result, index) => {
        systemMessage += `[${index + 1}] ${result.title}\n`;
        systemMessage += `${result.snippet}\n`;
        systemMessage += `Source: ${result.url}\n\n`;
      });
      systemMessage += 'Provide a comprehensive answer citing these sources when relevant.';
    }

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemMessage },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    console.log('[Answer Agent] Generating response...');

    const response = await chatClient.chat.completions.create({
      model: azureConfig.chat.deployment,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = response.choices[0].message?.content || '';
    console.log('[Answer Agent] Response generated successfully');

    return content;
  } catch (error: any) {
    console.error('[Answer Agent] Error:', error?.message || error);
    throw new Error(`Answer Agent failed: ${error?.message || 'Unknown error'}`);
  }
}

export async function* streamAnswerAgent(options: AnswerAgentOptions) {
  const { message, searchResults, conversationHistory = [] } = options;

  try {
    // Build system message
    let systemMessage = 'You are a helpful AI assistant.';
    
    if (searchResults && searchResults.length > 0) {
      systemMessage += '\n\nUse the following search results to ground your answer:\n\n';
      searchResults.forEach((result, index) => {
        systemMessage += `[${index + 1}] ${result.title}\n`;
        systemMessage += `${result.snippet}\n`;
        systemMessage += `Source: ${result.url}\n\n`;
      });
      systemMessage += 'Provide a comprehensive answer citing these sources when relevant.';
    }

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemMessage },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    console.log('[Answer Agent] Starting stream...');

    const stream = await chatClient.chat.completions.create({
      model: azureConfig.chat.deployment,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }

    console.log('[Answer Agent] Stream complete');
  } catch (error: any) {
    console.error('[Answer Agent] Stream error:', error?.message || error);
    yield `Error: ${error?.message || 'Stream failed'}`;
  }
}