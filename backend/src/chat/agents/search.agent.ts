import { azureConfig, chatClient } from '../../config/azure';
import { SearchResult } from '../dto/chat.dto';

/**
 * Search Agent using Azure OpenAI
 * Uses GPT's knowledge to provide search-like responses
 */
export async function searchAgent(query: string): Promise<SearchResult[]> {
  try {
    console.log('[Search Agent] Searching for:', query);

    const response = await chatClient.chat.completions.create({
      model: azureConfig.chat.deployment,
      messages: [
        {
          role: 'system',
          content: `You are a search assistant. Provide relevant, factual information about the query.
Format your response as a clear, informative summary with key facts and details.
If the topic requires recent information, mention that your knowledge has a cutoff date.`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';

    console.log('[Search Agent] Response generated successfully');

    return [{
      title: 'AI Search Result',
      snippet: content,
      url: '',
      provider: 'azure_openai',
    }];
  } catch (error: any) {
    console.error('[Search Agent] Error:', error?.message);
    return [{
      title: 'Search Error',
      snippet: `Unable to search: ${error?.message || 'Unknown error'}`,
      url: '',
      provider: 'error',
    }];
  }
}

// Helper function to extract search query from user message
export function extractSearchQuery(message: string): string {
  let query = message
    .replace(/search for/gi, '')
    .replace(/find/gi, '')
    .replace(/look up/gi, '')
    .replace(/tell me about/gi, '')
    .replace(/what (is|are|was|were)/gi, '')
    .trim();

  return query || message;
}
