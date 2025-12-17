import axios from 'axios';
import { azureConfig } from '../../config/azure';
import { SearchResult } from '../dto/chat.dto';

/**
 * Search Agent using Azure Bing Search API
 */
export async function searchAgent(query: string): Promise<SearchResult[]> {
  try {
    console.log('[Search Agent] Searching for:', query);

    // Ensure endpoint includes the search path
    let endpoint = azureConfig.bing.endpoint;
    if (!endpoint.includes('/v7.0/search')) {
      endpoint = endpoint.replace(/\/$/, '') + '/v7.0/search';
    }

    const response = await axios.get(endpoint, {
      headers: {
        'Ocp-Apim-Subscription-Key': azureConfig.bing.apiKey,
      },
      params: {
        q: query,
        mkt: 'en-US',
        count: 5,
        textDecorations: true,
        textFormat: 'HTML',
      },
    });

    const webPages = response.data?.webPages?.value || [];
    
    const results: SearchResult[] = webPages.map((page: any) => ({
      title: page.name,
      snippet: page.snippet,
      url: page.url,
      date: page.dateLastCrawled || undefined,
      provider: 'bing',
    }));

    console.log(`[Search Agent] Found ${results.length} results`);

    return results;
  } catch (error: any) {
    console.error('[Search Agent] Error:', error?.response?.data || error?.message);
    
    // Return error as search result for graceful degradation
    return [{
      title: 'Search Error',
      snippet: `Failed to search: ${error?.message || 'Unknown error'}`,
      url: '',
      provider: 'bing',
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
