// import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
// import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
// import { answerAgent, streamAnswerAgent } from './answer.agent';
// import { searchAgent, extractSearchQuery } from './search.agent';
// import { imageAgent, extractImagePrompt } from './image.agent';
// import { SearchResult } from '../dto/chat.dto';

// // ============================================================================
// // STATE DEFINITION
// // ============================================================================

// const GraphState = Annotation.Root({
//   messages: Annotation<BaseMessage[]>({
//     reducer: (prev, next) => [...prev, ...next],
//     default: () => [],
//   }),
//   userQuery: Annotation<string>({
//     reducer: (prev, next) => next ?? prev,
//     default: () => '',
//   }),
//   agentType: Annotation<'answer' | 'search' | 'image' | undefined>({
//     reducer: (prev, next) => next ?? prev,
//     default: () => undefined,
//   }),
//   searchResults: Annotation<SearchResult[] | undefined>({
//     reducer: (prev, next) => next ?? prev,
//     default: () => undefined,
//   }),
//   imageUrl: Annotation<string | undefined>({
//     reducer: (prev, next) => next ?? prev,
//     default: () => undefined,
//   }),
//   finalResponse: Annotation<string | undefined>({
//     reducer: (prev, next) => next ?? prev,
//     default: () => undefined,
//   }),
//   conversationHistory: Annotation<Array<{ role: 'user' | 'assistant'; content: string }>>({
//     reducer: (prev, next) => next ?? prev,
//     default: () => [],
//   }),
// });

// type GraphStateType = typeof GraphState.State;

// // ============================================================================
// // NODE FUNCTIONS
// // ============================================================================

// async function routerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
//   const query = state.userQuery.toLowerCase();
//   let agentType: 'answer' | 'search' | 'image' = 'answer';

//   console.log('[Router] Analyzing query:', state.userQuery);

//   // Image generation patterns
//   if (/image|draw|generate.*image|create.*image|picture|render|make.*picture|show me.*visual/i.test(query)) {
//     agentType = 'image';
//   }
//   // Search patterns
//   else if (/latest|recent|news|current|today|search|find|lookup|cite|source|compare|who (is|was)|when (did|was|is)|where (is|was)|what happened|how many/i.test(query)) {
//     agentType = 'search';
//   }

//   console.log(`[Router] Selected agent: ${agentType}`);

//   return {
//     agentType,
//     messages: [...state.messages, new SystemMessage(`Agent selected: ${agentType}`)],
//   };
// }

// async function searchNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
//   console.log('[Search Node] Executing search...');

//   const searchQuery = extractSearchQuery(state.userQuery);
//   const results = await searchAgent(searchQuery);

//   console.log(`[Search Node] Found ${results.length} results`);

//   return {
//     searchResults: results,
//     messages: [...state.messages, new SystemMessage(`Search completed: ${results.length} results`)],
//   };
// }

// async function answerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
//   console.log('[Answer Node] Generating response...');

//   const response = await answerAgent({
//     message: state.userQuery,
//     searchResults: state.searchResults,
//     conversationHistory: state.conversationHistory,
//   });

//   console.log('[Answer Node] Response generated');

//   return {
//     finalResponse: response,
//     messages: [...state.messages, new AIMessage(response)],
//   };
// }

// async function imageNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
//   console.log('[Image Node] Generating image...');

//   const imagePrompt = extractImagePrompt(state.userQuery);
//   const imageUrl = await imageAgent(imagePrompt);

//   console.log('[Image Node] Image generated');

//   // Convert null to undefined for type safety
//   const safeImageUrl = imageUrl || undefined;

//   return {
//     imageUrl: safeImageUrl,
//     finalResponse: `Image generated: ${imageUrl}`,
//     messages: [...state.messages, new AIMessage(`![Generated Image](${imageUrl})`)],
//   };
// }

// // ============================================================================
// // CONDITIONAL EDGES
// // ============================================================================

// function routeAfterRouter(state: GraphStateType): string {
//   if (state.agentType === 'image') {
//     return 'image';
//   } else if (state.agentType === 'search') {
//     return 'search';
//   }
//   return 'answer';
// }

// function routeAfterSearch(state: GraphStateType): string {
//   return 'answer';
// }

// // ============================================================================
// // BUILD GRAPH
// // ============================================================================

// export function createLangGraphAgent() {
//   const workflow = new StateGraph(GraphState);

//   // Add nodes
//   workflow.addNode('router', routerNode);
//   workflow.addNode('search', searchNode);
//   workflow.addNode('answer', answerNode);
//   workflow.addNode('image', imageNode);

//   // Set entry point
//   workflow.setEntryPoint('router');
  
//   // Add conditional edges with proper typing
//   workflow.addConditionalEdges(
//     'router',
//     routeAfterRouter,
//     ['search', 'answer', 'image']
//   );

//   workflow.addConditionalEdges(
//     'search',
//     routeAfterSearch,
//     ['answer']
//   );

//   workflow.addEdge('answer', END);
//   workflow.addEdge('image', END);

//   return workflow.compile();
// }

// // ============================================================================
// // STREAMING VERSION
// // ============================================================================

// async function streamingAnswerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
//   console.log('[Streaming Answer Node] Starting stream...');

//   const stream = await streamAnswerAgent({
//     message: state.userQuery,
//     searchResults: state.searchResults,
//     conversationHistory: state.conversationHistory,
//   });

//   let fullResponse = '';

//   for await (const chunk of stream) {
//     fullResponse += chunk;
//     process.stdout.write(chunk);
//   }

//   console.log('\n[Streaming Answer Node] Stream complete');

//   return {
//     finalResponse: fullResponse,
//     messages: [...state.messages, new AIMessage(fullResponse)],
//   };
// }

// export function createStreamingLangGraphAgent() {
//   const workflow = new StateGraph(GraphState);

//   workflow.addNode('router', routerNode);
//   workflow.addNode('search', searchNode);
//   workflow.addNode('answer', streamingAnswerNode);
//   workflow.addNode('image', imageNode);

//   // Set entry point
//   workflow.setEntryPoint('router');
  
//   // Add conditional edges
//   workflow.addConditionalEdges(
//     'router',
//     routeAfterRouter,
//     ['search', 'answer', 'image']
//   );

//   workflow.addConditionalEdges(
//     'search',
//     routeAfterSearch,
//     ['answer']
//   );

//   workflow.addEdge('answer', END);
//   workflow.addEdge('image', END);

//   return workflow.compile();
// }

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// export async function executeLangGraph(
//   userQuery: string,
//   conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
// ) {
//   const graph = createLangGraphAgent();

//   const initialState: GraphStateType = {
//     messages: [new HumanMessage(userQuery)],
//     userQuery,
//     conversationHistory,
//     agentType: undefined,
//     searchResults: undefined,
//     imageUrl: undefined,
//     finalResponse: undefined,
//   };

//   console.log('[LangGraph] Starting execution...');
  
//   try {
//     const result = await graph.invoke(initialState);
//     console.log('[LangGraph] Execution complete');
//     return result;
//   } catch (error: any) {
//     console.error('[LangGraph] Execution error:', error.message);
//     throw error;
//   }
// }

// export async function executeLangGraphStreaming(
//   userQuery: string,
//   conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
// ) {
//   const graph = createStreamingLangGraphAgent();

//   const initialState: GraphStateType = {
//     messages: [new HumanMessage(userQuery)],
//     userQuery,
//     conversationHistory,
//     agentType: undefined,
//     searchResults: undefined,
//     imageUrl: undefined,
//     finalResponse: undefined,
//   };

//   console.log('[LangGraph Streaming] Starting execution...');
  
//   try {
//     const result = await graph.invoke(initialState);
//     console.log('[LangGraph Streaming] Execution complete');
//     return result;
//   } catch (error: any) {
//     console.error('[LangGraph Streaming] Execution error:', error.message);
//     throw error;
//   }
// }

// export async function* streamLangGraphEvents(
//   userQuery: string,
//   conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
// ) {
//   const graph = createLangGraphAgent();

//   const initialState: GraphStateType = {
//     messages: [new HumanMessage(userQuery)],
//     userQuery,
//     conversationHistory,
//     agentType: undefined,
//     searchResults: undefined,
//     imageUrl: undefined,
//     finalResponse: undefined,
//   };

//   console.log('[LangGraph Events] Starting stream...');

//   try {
//     const stream = await graph.stream(initialState);

//     for await (const event of stream) {
//       yield event;
//     }

//     console.log('[LangGraph Events] Stream complete');
//   } catch (error: any) {
//     console.error('[LangGraph Events] Stream error:', error.message);
//     throw error;
//   }
// }


import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { answerAgent, streamAnswerAgent } from './answer.agent';
import { searchAgent, extractSearchQuery } from './search.agent';
import { imageAgent, extractImagePrompt } from './image.agent';
import { SearchResult } from '../dto/chat.dto';
import { chatClient, azureConfig } from '../../config/azure';

// ============================================================================
// INTELLIGENT LLM-BASED ROUTER
// ============================================================================

interface RouterDecision {
  agent: 'answer' | 'search' | 'image';
  reasoning: string;
  confidence: number;
}

/**
 * LLM-based intelligent router that analyzes user intent
 * Much more accurate than regex-based routing
 */
async function intelligentRouter(query: string): Promise<RouterDecision> {
  const systemPrompt = `You are an intelligent router that analyzes user queries and determines which specialized agent should handle them.

Available agents:
1. **answer** - General Q&A, explanations, coding help, math, conversations, advice, creative writing
2. **search** - Queries requiring real-time/current information, news, recent events, factual lookups, comparisons
3. **image** - Requests to generate, create, draw, or visualize images/pictures/artwork

Analyze the user's query and respond with a JSON object:
{
  "agent": "answer" | "search" | "image",
  "reasoning": "Brief explanation of why this agent was chosen",
  "confidence": 0.0-1.0
}

Guidelines:
- Choose "image" if user wants to CREATE/GENERATE visual content (not just asking about images)
- Choose "search" if user needs CURRENT/RECENT information or facts that may have changed
- Choose "answer" for general questions, explanations, code, math, or conversations
- When in doubt between search and answer, prefer "answer" unless explicitly asking for recent/current info

Respond ONLY with the JSON object, no other text.`;

  try {
    console.log('[Intelligent Router] Analyzing query with LLM...');
    
    const response = await chatClient.chat.completions.create({
      model: azureConfig.chat.deployment,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      max_tokens: 150,
      temperature: 0.1, // Low temperature for consistent classification
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]) as RouterDecision;
      console.log(`[Intelligent Router] Decision: ${decision.agent} (confidence: ${decision.confidence})`);
      console.log(`[Intelligent Router] Reasoning: ${decision.reasoning}`);
      return decision;
    }
    
    // Fallback if JSON parsing fails
    console.log('[Intelligent Router] Failed to parse LLM response, defaulting to answer');
    return { agent: 'answer', reasoning: 'Fallback - could not parse LLM response', confidence: 0.5 };
    
  } catch (error: any) {
    console.error('[Intelligent Router] Error:', error.message);
    // Fallback to answer agent on error
    return { agent: 'answer', reasoning: 'Fallback - router error', confidence: 0.5 };
  }
}

// STATE DEFINITION

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  userQuery: Annotation<string>({
    reducer: (prev, next) => next ?? prev,
    default: () => '',
  }),
  agentType: Annotation<'answer' | 'search' | 'image' | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  searchResults: Annotation<SearchResult[] | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  imageUrl: Annotation<string | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  finalResponse: Annotation<string | undefined>({
    reducer: (prev, next) => next ?? prev,
    default: () => undefined,
  }),
  conversationHistory: Annotation<Array<{ role: 'user' | 'assistant'; content: string }>>({
    reducer: (prev, next) => next ?? prev,
    default: () => [],
  }),
});

type GraphStateType = typeof GraphState.State;

// NODE FUNCTIONS

async function routerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('[Router] Analyzing query:', state.userQuery);

  // Use LLM-based intelligent router
  const decision = await intelligentRouter(state.userQuery);
  
  const agentType = decision.agent;

  console.log(`[Router] Selected agent: ${agentType}`);
  console.log(`[Router] Confidence: ${(decision.confidence * 100).toFixed(0)}%`);

  return {
    agentType,
    messages: [...state.messages, new SystemMessage(`Agent selected: ${agentType} (${decision.reasoning})`)],
  };
}

async function searchNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('[Search Node] Executing search...');

  const searchQuery = extractSearchQuery(state.userQuery);
  const results = await searchAgent(searchQuery);

  console.log(`[Search Node] Found ${results.length} results`);

  return {
    searchResults: results,
    messages: [...state.messages, new SystemMessage(`Search completed: ${results.length} results`)],
  };
}

async function answerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('[Answer Node] Generating response...');

  const response = await answerAgent({
    message: state.userQuery,
    searchResults: state.searchResults,
    conversationHistory: state.conversationHistory,
  });

  console.log('[Answer Node] Response generated');

  return {
    finalResponse: response,
    messages: [...state.messages, new AIMessage(response)],
  };
}

async function imageNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('[Image Node] Generating image...');

  const imagePrompt = extractImagePrompt(state.userQuery);
  const imageUrl = await imageAgent(imagePrompt);

  console.log('[Image Node] Image generated');

  return {
  imageUrl: imageUrl || undefined,  // Convert null to undefined
  finalResponse: `Image generated: ${imageUrl}`,
  messages: [...state.messages, new AIMessage(`![Generated Image](${imageUrl})`)],
  };
}

// CONDITIONAL EDGES

function routeAfterRouter(state: GraphStateType): string {
  if (state.agentType === 'image') {
    return 'image';
  } else if (state.agentType === 'search') {
    return 'search';
  }
  return 'answer';
}

function routeAfterSearch(state: GraphStateType): string {
  return 'answer';
}

// BUILD GRAPH

export function createLangGraphAgent() {
  // Cast to any to bypass strict type checking
  const workflow = new StateGraph(GraphState) as any;

  // Add nodes
  workflow.addNode('router', routerNode);
  workflow.addNode('search', searchNode);
  workflow.addNode('answer', answerNode);
  workflow.addNode('image', imageNode);

  // Add edges
  workflow.addEdge(START, 'router');
  
  workflow.addConditionalEdges('router', routeAfterRouter, {
    search: 'search',
    answer: 'answer',
    image: 'image',
  });

  workflow.addConditionalEdges('search', routeAfterSearch, {
    answer: 'answer',
  });

  workflow.addEdge('answer', END);
  workflow.addEdge('image', END);

  return workflow.compile();
}

// STREAMING VERSION

async function streamingAnswerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('[Streaming Answer Node] Starting stream...');

  const stream = await streamAnswerAgent({
    message: state.userQuery,
    searchResults: state.searchResults,
    conversationHistory: state.conversationHistory,
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    fullResponse += chunk;
    process.stdout.write(chunk);
  }

  console.log('\n[Streaming Answer Node] Stream complete');

  return {
    finalResponse: fullResponse,
    messages: [...state.messages, new AIMessage(fullResponse)],
  };
}

export function createStreamingLangGraphAgent() {
  // Cast to any to bypass strict type checking
  const workflow = new StateGraph(GraphState) as any;

  workflow.addNode('router', routerNode);
  workflow.addNode('search', searchNode);
  workflow.addNode('answer', streamingAnswerNode);
  workflow.addNode('image', imageNode);

  workflow.addEdge(START, 'router');
  
  workflow.addConditionalEdges('router', routeAfterRouter, {
    search: 'search',
    answer: 'answer',
    image: 'image',
  });

  workflow.addConditionalEdges('search', routeAfterSearch, {
    answer: 'answer',
  });

  workflow.addEdge('answer', END);
  workflow.addEdge('image', END);

  return workflow.compile();
}

// HELPER FUNCTIONS

export async function executeLangGraph(
  userQuery: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  const graph = createLangGraphAgent();

  const initialState: GraphStateType = {
    messages: [new HumanMessage(userQuery)],
    userQuery,
    conversationHistory,
    agentType: undefined,
    searchResults: undefined,
    imageUrl: undefined,
    finalResponse: undefined,
  };

  console.log('[LangGraph] Starting execution...');
  
  try {
    const result = await graph.invoke(initialState);
    console.log('[LangGraph] Execution complete');
    return result;
  } catch (error: any) {
    console.error('[LangGraph] Execution error:', error.message);
    throw error;
  }
}

export async function executeLangGraphStreaming(
  userQuery: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  const graph = createStreamingLangGraphAgent();

  const initialState: GraphStateType = {
    messages: [new HumanMessage(userQuery)],
    userQuery,
    conversationHistory,
    agentType: undefined,
    searchResults: undefined,
    imageUrl: undefined,
    finalResponse: undefined,
  };

  console.log('[LangGraph Streaming] Starting execution...');
  
  try {
    const result = await graph.invoke(initialState);
    console.log('[LangGraph Streaming] Execution complete');
    return result;
  } catch (error: any) {
    console.error('[LangGraph Streaming] Execution error:', error.message);
    throw error;
  }
}

export async function* streamLangGraphEvents(
  userQuery: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  const graph = createLangGraphAgent();

  const initialState: GraphStateType = {
    messages: [new HumanMessage(userQuery)],
    userQuery,
    conversationHistory,
    agentType: undefined,
    searchResults: undefined,
    imageUrl: undefined,
    finalResponse: undefined,
  };

  console.log('[LangGraph Events] Starting stream...');

  try {
    const stream = await graph.stream(initialState);

    for await (const event of stream) {
      yield event;
    }

    console.log('[LangGraph Events] Stream complete');
  } catch (error: any) {
    console.error('[LangGraph Events] Stream error:', error.message);
    throw error;
  }
}