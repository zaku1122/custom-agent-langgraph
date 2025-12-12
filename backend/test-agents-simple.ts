import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables first, before any imports that might use them
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('🧪 Testing Individual Agents\n');
console.log('This tests each agent in isolation to verify Azure connections\n');

// Test 1: Answer Agent - Tests Azure OpenAI GPT-4o connection
async function testAnswerAgent() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Test 1: Answer Agent (Azure OpenAI GPT-4o)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  //../backend/src/chat/agents/answer.agent
  //./src/chat/agents/answer.agent.ts


  try {
    const { answerAgent } = await import('./src/chat/agents/answer.agent.js');
    
    console.log('Query: "What is 2+2?"');
    console.log('Expected: Should return "4" or "2+2 equals 4"\n');
    
    const startTime = Date.now();
    const response = await answerAgent({
      message: 'What is 2+2?',
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Response received in ${duration}ms:`);
    console.log(response);
    console.log('\n✓ Answer Agent works correctly!\n');
    
    return true;
  } catch (error: any) {
    console.error('❌ Answer Agent failed:');
    console.error('Error:', error.message);
    console.error('\nThis usually means:');
    console.error('1. Azure OpenAI credentials are incorrect in .env');
    console.error('2. Azure OpenAI endpoint or deployment name is wrong');
    console.error('3. Azure OpenAI service is down or not accessible\n');
    return false;
  }
}

// Test 2: Search Agent - Tests Azure Bing Search connection
async function testSearchAgent() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Test 2: Search Agent (Azure Bing Search)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const { searchAgent } = await import('./src/chat/agents/search.agent.js');
    
    console.log('Query: "latest AI news"');
    console.log('Expected: Should return 5 search results with titles and URLs\n');
    
    const startTime = Date.now();
    const results = await searchAgent('latest AI news');
    const duration = Date.now() - startTime;
    
    console.log(`✅ Found ${results.length} results in ${duration}ms:\n`);
    
    results.slice(0, 3).forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   ${result.snippet.substring(0, 80)}...`);
      console.log(`   ${result.url}\n`);
    });
    
    if (results.length > 0 && results[0].title !== 'Search Error') {
      console.log('✓ Search Agent works correctly!\n');
      return true;
    } else {
      console.log('⚠️  Search returned error results - check Bing API key\n');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Search Agent failed:');
    console.error('Error:', error.message);
    console.error('\nThis usually means:');
    console.error('1. Azure Bing Search key is incorrect in .env');
    console.error('2. Bing Search endpoint is wrong');
    console.error('3. Bing Search quota exceeded\n');
    return false;
  }
}

// Test 3: Image Agent - Tests Azure DALL-E connection
async function testImageAgent() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎨 Test 3: Image Agent (Azure DALL-E 3)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const { imageAgent } = await import('./src/chat/agents/image.agent.js');
    
    console.log('Prompt: "a simple red circle"');
    console.log('Expected: Should return an image URL or base64 data\n');
    console.log('⏳ Generating image (this takes 10-30 seconds)...\n');
    
    const startTime = Date.now();
    const imageUrl = await imageAgent('a simple red circle');
    const duration = Date.now() - startTime;
    
    console.log(`✅ Image generated in ${duration}ms:`);
    console.log(imageUrl);
    
    if (imageUrl && !imageUrl.includes('placeholder')) {
      console.log('\n✓ Image Agent works correctly!');
      console.log('You can paste the URL in a browser to see the image\n');
      return true;
    } else {
      console.log('\n⚠️  Image generation returned placeholder - check DALL-E credentials\n');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Image Agent failed:');
    console.error('Error:', error.message);
    console.error('\nThis usually means:');
    console.error('1. Azure OpenAI Image credentials are incorrect');
    console.error('2. DALL-E deployment name is wrong');
    console.error('3. Image generation quota exceeded\n');
    return false;
  }
}

// Run all tests sequentially
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Multi-Agent Backend - Individual Agent Testing Suite    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const results = {
    answer: false,
    search: false,
    image: false,
  };
  
  // Test each agent with pauses between for readability
  results.answer = await testAnswerAgent();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.search = await testSearchAgent();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.image = await testImageAgent();
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Answer Agent:  ${results.answer ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Search Agent:  ${results.search ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Image Agent:   ${results.image ? '✅ PASS' : '❌ FAIL'}\n`);
  
  const allPassed = results.answer && results.search && results.image;
  
  if (allPassed) {
    console.log('🎉 All agents working! Ready for Stage 2 (LangGraph testing)');
  } else {
    console.log('⚠️  Some agents failed. Fix the issues above before proceeding.');
  }
  
  console.log('\n');
}

runAllTests().catch(console.error);