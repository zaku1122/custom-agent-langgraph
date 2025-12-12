import { AzureOpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend root (works from both src/ and dist/)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_DEPLOYMENT',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Azure OpenAI Configuration
export const azureConfig = {
  chat: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
  },
  image: {
    endpoint: process.env.AZURE_OPENAI_IMAGE_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_IMAGE_API_KEY || process.env.AZURE_OPENAI_API_KEY!,
    deployment: process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'dall-e-3',
    apiVersion: process.env.AZURE_OPENAI_IMAGE_API_VERSION || '2024-02-01',
  },
};

// Create Azure OpenAI clients
export const chatClient = new AzureOpenAI({
  apiKey: azureConfig.chat.apiKey,
  endpoint: azureConfig.chat.endpoint,
  apiVersion: azureConfig.chat.apiVersion,
  deployment: azureConfig.chat.deployment,
});

export const imageClient = new AzureOpenAI({
  apiKey: azureConfig.image.apiKey,
  endpoint: azureConfig.image.endpoint,
  apiVersion: azureConfig.image.apiVersion,
  deployment: azureConfig.image.deployment,
});

// Logging utility for debugging
export function logAzureConfig() {
  console.log('Azure Configuration:');
  console.log('  Chat Endpoint:', azureConfig.chat.endpoint);
  console.log('  Chat Deployment:', azureConfig.chat.deployment);
  console.log('  Image Endpoint:', azureConfig.image.endpoint);
  console.log('  Image Deployment:', azureConfig.image.deployment);
  console.log('  Bing Endpoint:', azureConfig.bing.endpoint);
  console.log('  API Keys:', {
    chat: azureConfig.chat.apiKey ? '✓ Set' : '✗ Missing',
    image: azureConfig.image.apiKey ? '✓ Set' : '✗ Missing',
    bing: azureConfig.bing.apiKey ? '✓ Set' : '✗ Missing',
  });
}