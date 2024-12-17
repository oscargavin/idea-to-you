// src/lib/imageService.ts
import { LLMService } from './llm';
import pLimit from 'p-limit';
import { ConceptualSegment, GeneratedImage } from './types';

export interface ImageGenerationConfig {
  prompt: string;
  styleUUID: string;
  width: number;
  height: number;
  num_images: number;
  modelId: string;
}

interface GenerationJob {
  generationId: string;
  prompt: string;
  conceptTheme: string;
  index: number;
  retryCount: number;
}

export class ImageGenerationService {
  private apiKey: string;
  private llm: LLMService;
  private baseUrl = 'https://cloud.leonardo.ai/api/rest/v1/generations';
  
  // Rate limiting configuration
  private readonly REQUESTS_PER_MINUTE = 100;
  private readonly MIN_REQUEST_INTERVAL = (60 * 1000) / this.REQUESTS_PER_MINUTE;
  private readonly MAX_RETRIES = 3;
  private readonly POLLING_INTERVAL = 5000;
  private readonly INITIAL_WAIT = 15000;
  private readonly CONCURRENT_LIMIT = 10;

  private requestTimestamps: number[] = [];

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

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );

    if (this.requestTimestamps.length >= this.REQUESTS_PER_MINUTE) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestTimestamp);
      await this.sleep(waitTime);
    }

    const lastRequest = this.requestTimestamps[this.requestTimestamps.length - 1];
    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await this.sleep(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
    }

    this.requestTimestamps.push(Date.now());
  }

  async generateImagesFromSegments(
    segments: ConceptualSegment[],
    styleUUID: string,
    onProgress?: (progress: number) => void
  ): Promise<GeneratedImage[]> {
    console.log(`[ImageGen] Starting parallel generation for ${segments.length} conceptual segments`);
    
    const limit = pLimit(this.CONCURRENT_LIMIT);
    
    // Convert conceptual segments to image prompts
    const imagePrompts = await Promise.all(
      segments.map(segment => this.createImagePrompt(segment))
    );

    // Create generation jobs
    const jobs: GenerationJob[] = imagePrompts.map((prompt, index) => ({
      prompt,
      generationId: '',
      conceptTheme: segments[index].conceptTheme,
      index,
      retryCount: 0
    }));

    let completed = 0;
    const totalJobs = jobs.length;

    const results = await Promise.allSettled(
      jobs.map(job =>
        limit(async () => {
          const result = await this.processGenerationJob(job);
          completed++;
          if (onProgress) {
            onProgress(completed / totalJobs);
          }
          return result;
        })
      )
    );

    const generatedImages: GeneratedImage[] = [];
    const failures: number[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        generatedImages.push(result.value);
      } else {
        failures.push(index);
        console.error(`Failed to generate image ${index}:`, result.reason);
      }
    });

    if (failures.length > 0) {
      console.warn(`[ImageGen] Failed to generate ${failures.length} images at indices:`, failures);
      if (failures.length > totalJobs / 2) {
        throw new Error(`Too many failed generations: ${failures.length} out of ${totalJobs}`);
      }
    }

    return generatedImages.sort((a, b) => a.index - b.index);
  }

  private async createImagePrompt(segment: ConceptualSegment): Promise<string> {
    const prompt = `
Create a vivid, detailed image generation prompt for this concept:
Theme: ${segment.conceptTheme}
Description: ${segment.visualDescription || segment.content}

Focus on:
- Key visual elements
- Mood and atmosphere
- Composition and framing
- Lighting and color

Create a brief, descriptive prompt (max 200 characters):`;
  
    let imagePrompt = await this.llm.generateContent(prompt);
    const suffixes = ", professional photography, cinematic lighting, photorealistic quality, 4K UHD";
    
    // Ensure prompt doesn't exceed length limits
    const maxPromptLength = 1000;
    if (imagePrompt.length > maxPromptLength) {
      imagePrompt = imagePrompt.slice(0, maxPromptLength - suffixes.length);
    }
  
    return `${imagePrompt.trim()}${suffixes}`;
  }

  private async initiateGeneration(prompt: string): Promise<string> {
    await this.waitForRateLimit();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        modelId: 'b2614463-296c-462a-9586-aafdb8f00e36',
        prompt,
        width: 1472,
        height: 832,
        num_images: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(`Failed to start generation: ${errorText}`);
    }

    const data = await response.json();
    const generationId = data.sdGenerationJob?.generationId;
    
    if (!generationId) {
      throw new Error('No generation ID received');
    }

    return generationId;
  }

  private async pollForResults(generationId: string): Promise<string> {
    await this.waitForRateLimit();

    const response = await fetch(`${this.baseUrl}/${generationId}`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get generation results');
    }

    const data = await response.json();
    const imageUrl = data.generations_by_pk?.generated_images[0]?.url;

    if (!imageUrl) {
      throw new Error('Generation not complete or no image URL');
    }

    return imageUrl;
  }

  private async processGenerationJob(job: GenerationJob): Promise<GeneratedImage> {
    try {
      const generationId = await this.initiateGeneration(job.prompt);
      await this.sleep(this.INITIAL_WAIT);

      let retryCount = 0;
      let delay = this.POLLING_INTERVAL;

      while (retryCount < this.MAX_RETRIES) {
        try {
          const imageUrl = await this.pollForResults(generationId);
          return {
            url: imageUrl,
            conceptTheme: job.conceptTheme,
            index: job.index
          };
        } catch (error) {
          retryCount++;
          if (retryCount >= this.MAX_RETRIES) throw error;
          await this.sleep(delay);
          delay *= 2;
        }
      }

      throw new Error('Max retries exceeded');
    } catch (error) {
      console.error(`Failed to generate image for job ${job.index}:`, error);
      throw error;
    }
  }
}