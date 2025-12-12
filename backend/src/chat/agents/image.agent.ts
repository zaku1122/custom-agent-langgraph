import { imageClient, azureConfig } from '../../config/azure';

export async function imageAgent(prompt: string): Promise<string | null> {
  try {
    console.log('[Image Agent] Generating image for:', prompt);

    const response = await imageClient.images.generate({
      model: azureConfig.image.deployment,
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
    });

    const imageData = response.data?.[0];

    if (!imageData) {
      console.error('[Image Agent] No image data returned');
      return 'https://via.placeholder.com/1024.png?text=No+Image+Generated';
    }

    // Azure DALL-E returns URL or base64
    if (imageData.url) {
      console.log('[Image Agent] Image generated successfully');
      return imageData.url;
    }

    if (imageData.b64_json) {
      console.log('[Image Agent] Image generated as base64');
      return `data:image/png;base64,${imageData.b64_json}`;
    }

    return 'https://via.placeholder.com/1024.png?text=Unknown+Image+Format';
  } catch (error: any) {
    console.error('[Image Agent] Error:', error?.message || error);
    
    // Return placeholder on error
    return 'https://via.placeholder.com/1024.png?text=Image+Generation+Error';
  }
}

// Helper to extract image prompt from user message
export function extractImagePrompt(message: string): string {
  let prompt = message
    .replace(/generate an image of/gi, '')
    .replace(/create an image of/gi, '')
    .replace(/draw/gi, '')
    .replace(/make a picture of/gi, '')
    .replace(/show me/gi, '')
    .trim();

  return prompt || message;
}