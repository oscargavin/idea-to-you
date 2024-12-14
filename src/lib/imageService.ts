// src/lib/imageService.ts
import { LLMService } from './llm';

export interface ImageGenerationConfig {
  prompt: string;
  styleUUID: string;
  width: number;
  height: number;
  num_images: number;
  alchemy: boolean;
  contrast: number;
  modelId: string;
}

export interface GeneratedImage {
  url: string;
  promptSegment: string;
  index: number;
}

export class ImageGenerationService {
  private apiKey: string;
  private llm: LLMService;
  private baseUrl = 'https://cloud.leonardo.ai/api/rest/v1/generations';

  constructor(apiKey: string, llm: LLMService) {
    if (!apiKey) {
      throw new Error('Leonardo API key is required');
    }
    this.apiKey = apiKey;
    this.llm = llm;
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateImage(config: ImageGenerationConfig): Promise<string[]> {
    try {
      if (config.prompt.length > 1500) {
        throw new Error(`Prompt exceeds maximum length of 1500 characters (current: ${config.prompt.length})`);
      }
  
      console.log(`[ImageGen] Starting generation for prompt: ${config.prompt.slice(0, 100)}...`);
      
      // Initial generation request
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          modelId: 'b2614463-296c-462a-9586-aafdb8f00e36',
          prompt: config.prompt,
          width: 1472,  // Maximum supported width while maintaining 16:9 ratio
          height: 832,  // Height adjusted to maintain 16:9 aspect ratio
          num_images: 1,
          // Remove optional parameters that might cause issues
        }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('maximum length')) {
          throw new Error('Prompt exceeds Leonardo AI\'s 1500 character limit');
        }
        throw new Error(`Failed to start generation: ${errorText}`);
      }
  
      const initialData = await response.json();
      console.log('[ImageGen] Initial response:', initialData);
  
      const generationId = initialData.sdGenerationJob?.generationId;
      if (!generationId) {
        throw new Error('No generation ID received');
      }
  
      console.log(`[ImageGen] Got generation ID: ${generationId}`);
  
      // Wait initial 20 seconds as in Python version
      console.log('[ImageGen] Waiting initial 15 seconds...');
      await this.sleep(15000);
  
      // Poll for results
      const resultResponse = await fetch(
        `${this.baseUrl}/${generationId}`,
        {
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
  
      if (!resultResponse.ok) {
        console.error('[ImageGen] Failed to get results:', await resultResponse.text());
        throw new Error('Failed to get generation results');
      }
  
      const resultData = await resultResponse.json();
      console.log('[ImageGen] Result data:', resultData);
  
      const imageUrl = resultData.generations_by_pk?.generated_images[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }
  
      console.log('[ImageGen] Successfully got image URL:', imageUrl);
      return [imageUrl];
  
    } catch (error) {
      console.error('[ImageGen] Error in generateImage:', error);
      throw error;
    }
  }

  async generateImagesFromScript(
    scriptSegments: string[],
    styleUUID: string,
    onProgress?: (progress: number) => void
  ): Promise<GeneratedImage[]> {
    console.log(`[ImageGen] Starting batch generation for ${scriptSegments.length} segments`);
    const generatedImages: GeneratedImage[] = [];
    const totalSegments = scriptSegments.length;

    for (let i = 0; i < totalSegments; i++) {
      try {
        console.log(`[ImageGen] Processing segment ${i + 1}/${totalSegments}`);
        const segment = scriptSegments[i];
        
        const imagePrompt = await this.convertScriptToImagePrompt(segment);
        console.log(`[ImageGen] Generated prompt for segment ${i + 1}`);

        const config: ImageGenerationConfig = {
          prompt: imagePrompt,
          styleUUID,
          width: 1920,
          height: 1080,
          num_images: 1,
          alchemy: false,
          contrast: 3,
          modelId: 'b2614463-296c-462a-9586-aafdb8f00e36'
        };

        const urls = await this.generateImage(config);
        
        if (urls.length > 0) {
          generatedImages.push({
            url: urls[0],
            promptSegment: segment,
            index: i
          });
          console.log(`[ImageGen] Successfully added image ${i + 1}`);
        }

        if (onProgress) {
          onProgress((i + 1) / totalSegments);
        }

        // Add a small delay between requests to avoid rate limiting
        if (i < totalSegments - 1) {
          await this.sleep(2000);
        }

      } catch (error) {
        console.error(`[ImageGen] Error processing segment ${i + 1}:`, error);
        throw error;
      }
    }

    console.log(`[ImageGen] Completed batch generation. Total images:`, generatedImages.length);
    return generatedImages;
  }

  private async convertScriptToImagePrompt(scriptSegment: string): Promise<string> {
    // First, truncate the script segment if it's too long
    // Leave room for the prompt template and suffixes (about 500 chars)
    const maxScriptLength = 800;
    const truncatedScript = scriptSegment.length > maxScriptLength 
      ? scriptSegment.slice(0, maxScriptLength) + '...'
      : scriptSegment;
  
    const prompt = `
  Convert this script segment into a concise, vivid image prompt.
  Focus on one key visual moment that captures the essence.
  Include: composition, lighting, atmosphere, and mood.
  Avoid: dialogue, narrative, and temporal elements.
  
  Script segment:
  ${truncatedScript}
  
  Create a brief, impactful image prompt (max 200 characters):`;
  
    let imagePrompt = await this.llm.generateContent(prompt);
    
    // Ensure the generated prompt isn't too long (leaving room for suffixes)
    const maxPromptLength = 1200;
    if (imagePrompt.length > maxPromptLength) {
      imagePrompt = imagePrompt.slice(0, maxPromptLength);
    }
  
    // Add standard suffixes while ensuring total length stays under 1500
    const suffixes = ", professional photography, cinematic lighting, photorealistic quality, 4K UHD";
    const totalPrompt = `${imagePrompt.trim()}${suffixes}`;
  
    // Final safety check
    if (totalPrompt.length > 1500) {
      return totalPrompt.slice(0, 1490) + "...";
    }
  
    return totalPrompt;
  }
}