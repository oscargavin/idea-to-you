// src/lib/scriptGen.ts

import { LLMService } from './llm';
import { ImageGenerationService } from './imageService';
import { VoiceService } from './voiceService';
import {
  Script,
  GenerationSegment,
  ConceptualSegment,
  GenerationConfig,
  GeneratedContent,
  CharacterTiming
} from './types';

interface TransitionPoint {
  endPhrase: string;  // The distinctive phrase that marks the end of a segment
  conceptTheme: string;
  visualDescription: string;
}

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
      // Step 1: Generate initial content
      onStep?.('Generating initial content...');
      const { outline, rawContent } = await this.generateInitialContent(config);

      // Step 2: Generate voice first to get timing data
      onStep?.('Generating audio narration...');
      const voiceResponse = await this.voiceService.generateVoiceWithTimings(
        rawContent,
        config.voiceId,
        config.voiceModel
      );

      // Step 3: Identify segments using the new segmentation approach
      onStep?.('Analyzing content structure...');
      const conceptualSegments = await this.identifyConceptualSegments(rawContent, this.llm);

      // Step 4: Apply timing data to conceptual segments using character timings
      const scriptWithTimings: Script = {
        outline,
        rawContent,
        conceptualSegments,
        style: config.style,
        characterTimings: voiceResponse.characterTimings
      };

      // Step 5: Calculate precise timings for each segment
      const segmentedScript = this.calculateSegmentTimings(
        scriptWithTimings,
        voiceResponse.characterTimings
      );

      // Step 6: Generate images for each segment
      onStep?.('Generating visuals...');
      const images = await this.imageService.generateImagesFromSegments(
        segmentedScript.conceptualSegments,
        config.stylePreset,
        (progress) => onStep?.(`Generating images: ${Math.round(progress * 100)}%`)
      );

      // Calculate total duration from voice timings
      const totalDuration = this.calculateTotalDuration(voiceResponse.characterTimings);

      return {
        script: segmentedScript,
        audioBlob: voiceResponse.audio,
        images,
        totalDuration,
        showSubtitles: config.showSubtitles
      };
    } catch (error) {
      console.error('Error in content generation:', error);
      throw error;
    }
  }

  private calculateTotalDuration(timings: CharacterTiming): number {
    const lastIndex = timings.character_end_times_seconds.length - 1;
    return timings.character_end_times_seconds[lastIndex] || 0;
  }

  private calculateSegmentTimings(script: Script, timings: CharacterTiming): Script {
    const { characters, character_start_times_seconds, character_end_times_seconds } = timings;
    const totalDuration = this.calculateTotalDuration(timings);

    let currentPosition = 0;
    const updatedSegments = script.conceptualSegments.map((segment, index) => {
      // Find the segment's content in the full text
      const segmentContent = segment.content;
      const segmentStart = script.rawContent.indexOf(segmentContent, currentPosition);
      
      if (segmentStart === -1) {
        throw new Error(`Could not find segment content in script: ${segmentContent.substring(0, 50)}...`);
      }

      const segmentEnd = segmentStart + segmentContent.length;
      currentPosition = segmentEnd;

      // Find corresponding character timings
      const startTime = character_start_times_seconds[segmentStart] || 0;
      let endTime = character_end_times_seconds[Math.min(segmentEnd - 1, character_end_times_seconds.length - 1)] || 0;

      // For the last segment, ensure it extends to the end of the audio
      if (index === script.conceptualSegments.length - 1) {
        endTime = totalDuration;
      }

      return {
        ...segment,
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
          contentStart: segmentStart,
          contentEnd: segmentEnd
        }
      };
    });

    return {
      ...script,
      conceptualSegments: updatedSegments
    };
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

  private async identifyConceptualSegments(content: string, llm: LLMService): Promise<ConceptualSegment[]> {
    // Ask LLM to identify natural transition points
    const prompt = `Analyze this script and identify 2-5 natural transition points where the visual imagery should change.
  For each segment, provide:
  - endPhrase: A unique, distinctive 10-20 word phrase that marks the end of this segment (must be exact text from the script)
  - conceptTheme: Brief description of the main theme
  - visualDescription: Description of what to show visually
  
  Return ONLY a JSON array. Format:
  [
    {
      "endPhrase": "... exact ending phrase from script ...",
      "conceptTheme": "theme description",
      "visualDescription": "visual description"
    }
  ]
  
  Script to analyze:
  ${content}`;
  
    try {
      const response = await llm.generateContent(prompt);
      const transitions: TransitionPoint[] = JSON.parse(
        response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      );
  
      // Validate transitions
      if (!Array.isArray(transitions) || transitions.length === 0) {
        throw new Error('Invalid transitions format');
      }
  
      // Convert transitions to segments
      const segments: ConceptualSegment[] = [];
      let currentPosition = 0;
  
      for (let i = 0; i < transitions.length; i++) {
        const transition = transitions[i];
        
        // Find the end of this segment in the content
        const endPosition = content.indexOf(transition.endPhrase, currentPosition);
        if (endPosition === -1) {
          console.warn(`Could not find transition phrase: ${transition.endPhrase}`);
          continue;
        }
  
        // Extract segment content
        const segmentContent = content.slice(
          currentPosition,
          endPosition + transition.endPhrase.length
        );
  
        segments.push({
          content: segmentContent,
          conceptTheme: transition.conceptTheme,
          visualDescription: transition.visualDescription,
          index: i
        });
  
        currentPosition = endPosition + transition.endPhrase.length;
      }
  
      // Add final segment if there's remaining content
      if (currentPosition < content.length) {
        segments.push({
          content: content.slice(currentPosition),
          conceptTheme: "Closing Segment",
          visualDescription: "Final visual representation",
          index: segments.length
        });
      }
  
      // Validate complete coverage
      const totalContent = segments.map(s => s.content).join('');
      if (totalContent.length !== content.length) {
        console.warn('Content coverage mismatch. Adding fallback segment.');
        return [{
          content: content,
          conceptTheme: 'Complete Content',
          visualDescription: 'Visual representation of the content',
          index: 0
        }];
      }
  
      return segments;
    } catch (error) {
      console.error('Error identifying segments:', error);
      // Fallback to single segment
      return [{
        content: content,
        conceptTheme: 'Complete Content',
        visualDescription: 'Visual representation of the content',
        index: 0
      }];
    }
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

Remember, here is the ${outline} for the whole script.

Use natural language and avoid any technical directions.

`;

    const content = await this.llm.generateContent(prompt);
    return { content, index };
  }
}