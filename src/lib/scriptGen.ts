// src/lib/scriptGen.ts

import { LLMService } from './llm';
import { ImageGenerationService } from './imageService';
import { VoiceService } from './voiceService';
import {
  Script,
  GenerationSegment,
  ConceptualSegment,
  GenerationConfig,
  GeneratedContent
} from './types';

export class ScriptGenerator {
  private llm: LLMService;
  private imageService: ImageGenerationService;
  private voiceService: VoiceService;

  constructor(config: {
    llm: LLMService;
    imageService: ImageGenerationService;
    voiceService: VoiceService;
  }) {
    this.llm = config.llm;
    this.imageService = config.imageService;
    this.voiceService = config.voiceService;
  }

  async generate(config: GenerationConfig, onStep?: (step: string) => void): Promise<GeneratedContent> {
    try {
      // Step 1: Generate initial content using generation segments
      onStep?.('Generating initial content...');
      const { outline, rawContent } = await this.generateInitialContent(config);

      // Step 2: Identify conceptual breaks in the content
      onStep?.('Analyzing content structure...');
      const conceptualSegments = await this.identifyConceptualSegments(rawContent);

      // Step 3: Generate voice and get timing data
      onStep?.('Generating audio narration...');
      const voiceResponse = await this.voiceService.generateVoiceWithTimings(rawContent);

      // Step 4: Apply timing data to conceptual segments
      const scriptWithTimings: Script = {
        outline,
        rawContent,
        conceptualSegments,
        style: config.style,
        characterTimings: voiceResponse.characterTimings
      };

      // Step 5: Calculate precise timings for each conceptual segment
      const segmentedScript = this.voiceService.calculateConceptualSegmentTimings(
        scriptWithTimings,
        voiceResponse.characterTimings
      );

      // Step 6: Generate images for each conceptual segment
      onStep?.('Generating visuals...');
      const images = await this.imageService.generateImagesFromSegments(
        segmentedScript.conceptualSegments,
        config.stylePreset,
        (progress) => onStep?.(`Generating images: ${Math.round(progress * 100)}%`)
      );

      return {
        script: segmentedScript,
        audioBlob: voiceResponse.audio,
        images,
        totalDuration: this.calculateTotalDuration(segmentedScript)
      };
    } catch (error) {
      console.error('Error in content generation:', error);
      throw error;
    }
  }

  private async generateInitialContent(config: GenerationConfig): Promise<{
    outline: string;
    rawContent: string;
  }> {
    // Generate outline first
    const outline = await this.generateOutline(
      config.topic,
      config.style,
      config.generationSegmentCount
    );

    // Generate content in segments and combine
    const segments = [];
    for (let i = 0; i < config.generationSegmentCount; i++) {
      const segment = await this.generateSegment(
        config.topic,
        outline,
        config.style,
        i,
        config.generationSegmentCount
      );
      segments.push(segment);
    }

    // Combine all segments into raw content
    const rawContent = segments.map(s => s.content).join('\n\n');

    return { outline, rawContent };
  }

  // src/lib/scriptGen.ts - update the identifyConceptualSegments method
  private async identifyConceptualSegments(content: string): Promise<ConceptualSegment[]> {
    const prompt = `You are a script analyzer that returns ONLY valid JSON.
  Your task is to break this script into conceptual segments where visual imagery should change.
  Return a JSON array where each object represents a segment with these exact keys:
  - content: string with the segment text
  - conceptTheme: string describing the main theme
  - visualDescription: string describing what to show visually
  - index: number (starting from 0)

  Return ONLY the JSON array, no other text, no markdown, no code blocks.

  Script to analyze:
  ${content}`;

    let llmResponse = ''; // Declare outside try block to be accessible in catch

    try {
      // Store the response
      llmResponse = await this.llm.generateContent(prompt);

      // Clean up the response to handle potential markdown/code blocks
      const cleanedResponse = llmResponse
        .replace(/```json\n?/g, '')  // Remove JSON code block markers
        .replace(/```\n?/g, '')      // Remove any other code block markers
        .trim();                     // Remove any extra whitespace

      // Parse the cleaned response
      const parsed = JSON.parse(cleanedResponse);

      // Validate the structure
      if (!Array.isArray(parsed)) {
        throw new Error('Expected JSON array in response');
      }

      return parsed.map((segment: any, index: number) => ({
        content: segment.content || '',
        conceptTheme: segment.conceptTheme || `Segment ${index + 1}`,
        visualDescription: segment.visualDescription || '',
        index: segment.index || index
      }));

    } catch (error) {
      console.error('Error parsing conceptual segments:', error);
      console.log('Raw LLM response:', llmResponse);
      
      // Fallback: Create a single segment with the entire content
      return [{
        content: content,
        conceptTheme: 'Complete Content',
        visualDescription: 'Visual representation of the main topic',
        index: 0
      }];
    }
  }

  private calculateTotalDuration(script: Script): number {
    if (!script.conceptualSegments.length) return 0;
    const lastSegment = script.conceptualSegments[script.conceptualSegments.length - 1];
    return lastSegment.timing?.end || 0;
  }

  private async generateOutline(topic: string, style: string, segmentCount: number): Promise<string> {
    const prompt = `
Create a ${segmentCount}-part outline about "${topic}" that:
1. Flows naturally
2. Builds information progressively
3. Maintains engagement
4. Covers the topic comprehensively

Write in a ${style} style, optimized for spoken delivery.
Avoid technical markers or directions - focus on content.
`;

    return this.llm.generateContent(prompt);
  }

  private async generateSegment(
    topic: string,
    outline: string,
    style: string,
    index: number,
    totalSegments: number
  ): Promise<GenerationSegment> {
    const prompt = `
Write part ${index + 1} of ${totalSegments} about "${topic}" that:
- Follows a ${style} style
- Sounds natural when read aloud
- Includes vivid, visual details
- Flows from the outline naturally

Use natural language and avoid any technical directions.
`;

    const content = await this.llm.generateContent(prompt);
    return { content, index };
  }
}