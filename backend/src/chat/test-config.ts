import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('Configuration Check:');
console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT);
console.log('AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT);
console.log('API Key present:', !!process.env.AZURE_OPENAI_API_KEY);
console.log('Bing Key present:', !!process.env.AZURE_BING_SEARCH_KEY);