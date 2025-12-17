import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { chatClient, azureConfig } from './src/config/azure.js';

interface RouterDecision {
  agent: 'answer' | 'search' | 'image';
  reasoning: string;
  confidence: number;
}

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

  const response = await chatClient.chat.completions.create({
    model: azureConfig.chat.deployment,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    max_tokens: 150,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as RouterDecision;
  }
  
  return { agent: 'answer', reasoning: 'Fallback', confidence: 0.5 };
}

async function testRouter() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       🧠 Testing Intelligent LLM Router                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const testQueries = [
    // Should route to ANSWER
    { query: "What is 2+2?", expected: "answer" },
    { query: "Explain quantum computing", expected: "answer" },
    { query: "Write a Python function to sort a list", expected: "answer" },
    { query: "What's the meaning of life?", expected: "answer" },
    
    // Should route to SEARCH
    { query: "What's the latest news about AI?", expected: "search" },
    { query: "Who won the Super Bowl this year?", expected: "search" },
    { query: "What's the current stock price of Apple?", expected: "search" },
    { query: "What happened in the news today?", expected: "search" },
    
    // Should route to IMAGE
    { query: "Generate an image of a sunset", expected: "image" },
    { query: "Draw a picture of a cat", expected: "image" },
    { query: "Create artwork of a futuristic city", expected: "image" },
    { query: "Make me a picture of mountains", expected: "image" },
    
    // Tricky edge cases
    { query: "How do images work in neural networks?", expected: "answer" },
    { query: "Tell me about the latest image generation models", expected: "search" },
    { query: "I need a visual representation of data flow", expected: "image" },
  ];

  let correct = 0;
  let total = testQueries.length;

  for (const test of testQueries) {
    process.stdout.write(`Testing: "${test.query.substring(0, 40)}..." `);
    
    try {
      const decision = await intelligentRouter(test.query);
      const isCorrect = decision.agent === test.expected;
      
      if (isCorrect) {
        correct++;
        console.log(`✅ ${decision.agent} (${(decision.confidence * 100).toFixed(0)}%)`);
      } else {
        console.log(`❌ Got ${decision.agent}, expected ${test.expected}`);
        console.log(`   Reasoning: ${decision.reasoning}`);
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Results: ${correct}/${total} correct (${((correct/total)*100).toFixed(0)}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testRouter().catch(console.error);

