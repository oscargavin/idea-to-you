// src/lib/scriptGen.ts
import { LLMService } from './llm';
import { ImageGenerationService } from './imageService';
import { VoiceService } from './voiceService';
import { Script, ScriptSegment, GenerationConfig, GeneratedContent } from './types';

interface ScriptGeneratorConfig {
  llm: LLMService;
  imageService: ImageGenerationService;
  voiceService: VoiceService;
}

export class ScriptGenerator {
  private llm: LLMService;
  private imageService: ImageGenerationService;
  private voiceService: VoiceService;

  constructor(config: ScriptGeneratorConfig) {
    this.llm = config.llm;
    this.imageService = config.imageService;
    this.voiceService = config.voiceService;
  }

  async generate(config: GenerationConfig, onStep?: (step: string) => void): Promise<GeneratedContent> {
    try {
      // Phase 1: Generate script
      onStep?.('Generating master outline...');
      const script = await this.generateScript(config, onStep);

      // Phase 2: Generate audio
      onStep?.('Generating audio narration...');
      const audioBlob = await this.generateAudio(script);
      
      // Phase 3: Calculate number of images needed based on audio duration
      onStep?.('Processing audio segments...');
      const audioDuration = await this.getAudioDuration(audioBlob);
      const numberOfImages = Math.floor(audioDuration / 12); // One image per 12 seconds
      
      // Phase 4: Generate image prompts based on script timing
      const imagePrompts = await this.createImageSegments(script.segments, numberOfImages);
      
      // Phase 5: Generate images
      onStep?.('Generating visuals...');
      const images = await this.imageService.generateImagesFromScript(
        imagePrompts,
        config.stylePreset,
        (progress) => onStep?.(`Generating images: ${Math.round(progress * 100)}%`)
      );

      return {
        script,
        audioBlob,
        images
      };
    } catch (error) {
      console.error('Error in content generation:', error);
      throw error;
    }
  }

  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    const audioContext = new AudioContext();
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      await audioContext.close();
      return duration;
    } catch (error) {
      console.error('Error getting audio duration:', error);
      throw new Error('Failed to get audio duration');
    }
  }

  private async createImageSegments(scriptSegments: ScriptSegment[], numberOfImages: number): Promise<string[]> {
    // Combine all content
    const fullText = scriptSegments.map(s => s.content).join(' ');
    
    // Calculate how many words should be in each image segment
    const words = fullText.split(' ');
    const wordsPerImageSegment = Math.ceil(words.length / numberOfImages);
    
    // Create segments for each image
    const imagePrompts: string[] = [];
    
    for (let i = 0; i < numberOfImages; i++) {
      const start = i * wordsPerImageSegment;
      const end = Math.min(start + wordsPerImageSegment, words.length);
      const segmentText = words.slice(start, end).join(' ');
      
      // Generate a scene description for this segment of text
      const prompt = `
Convert this script segment into a detailed visual scene description.
Focus on the key visual elements that should appear in a single compelling image.

Script segment:
${segmentText}

Create a detailed image generation prompt for this scene:`;

      const imagePrompt = await this.llm.generateContent(prompt);
      imagePrompts.push(imagePrompt);
    }
    
    return imagePrompts;
  }

  private async generateScript(config: GenerationConfig, onStep?: (step: string) => void): Promise<Script> {
    // Generate outline
    const outline = await this.generateOutline(config.topic, config.style, config.segmentCount);

    // Generate initial segments
    const segments: ScriptSegment[] = [];
    let previousContent: string | null = null;
    
    for (let i = 0; i < config.segmentCount; i++) {
      onStep?.(`Generating segment ${i + 1}/${config.segmentCount}...`);
      
      const segment = await this.generateSegment(
        config.topic,
        outline,
        config.style,
        previousContent,
        i,
        config.segmentCount
      );

      segments.push(segment);
      
      if (i < config.segmentCount - 1) {
        previousContent = await this.llm.compressContent(segment.content);
      }
    }

    // Generate bridges
    onStep?.('Refining transitions...');
    for (let i = 0; i < segments.length - 1; i++) {
      const bridge = await this.generateBridge(
        segments[i].content,
        segments[i + 1].content,
        config.style
      );
      segments[i].content = `${segments[i].content}\n\n${bridge}`;
    }

    return {
      outline,
      segments,
      style: config.style,
      totalDuration: config.segmentCount * 60 // Approximate duration based on segments
    };
  }

  private async generateAudio(script: Script): Promise<Blob> {
    const fullText = script.segments.map(s => s.content).join(' ');
    return await this.voiceService.generateVoice(fullText);
  }

  private async generateOutline(topic: string, style: string, segmentCount: number): Promise<string> {
    const prompt = `
Create a ${segmentCount}-segment outline about "${topic}" that:
1. Flows naturally like a well-written article or documentary
2. Builds information progressively
3. Maintains audience engagement
4. Covers the topic comprehensively

Important:
- Write for spoken delivery
- Avoid timestamps, segment markers, or narrative directions
- Focus on content that will sound natural when read aloud
- Consider natural topic transitions
- Write in a ${style} style

Format as a clear outline divided into ${segmentCount} logical sections.
`;

    return this.llm.generateContent(prompt);
  }

  private async generateSegment(
    topic: string,
    outline: string,
    style: string,
    previousContent: string | null,
    index: number,
    totalSegments: number
  ): Promise<ScriptSegment> {
    let prompt = `
Write a segment about "${topic}" that:
- Follows a ${style} style
- Sounds natural when read aloud
- Builds on previous content
- Maintains narrative momentum
- Uses natural language
- Includes vivid, filmable details

Guidelines:
- Write in a conversational tone
- Focus on the content itself
- Avoid any meta-references
- Don't include technical directions
- Create engaging, substantive content
- Include visual descriptions that can be turned into images

Context:
Current section: ${index + 1} of ${totalSegments}
Outline: ${outline}
`;

    if (previousContent) {
      prompt += `\nPrevious content:\n${previousContent}\n\nContinue the narrative naturally from this point.`;
    }

    const content = await this.llm.generateContent(prompt);
    return { content, index };
  }

  private async generateBridge(currentContent: string, nextContent: string, style: string): Promise<string> {
    const prompt = `
Create a natural bridge between these two segments that:
1. Maintains the ${style} style
2. Creates a smooth thematic transition
3. Connects ideas logically
4. Avoids obvious transitional phrases
5. Sounds natural when spoken
6. Maintains visual continuity

Guidelines:
- Keep it concise (1-2 sentences)
- Don't mention segments or timing
- Don't use mechanical transitions like "next" or "moving on"
- Focus on thematic or narrative connections
- Maintain the established tone and style
- Consider visual flow between scenes

Current content:
${currentContent}

Next content:
${nextContent}

Write a natural bridge that connects these ideas:`;

    return this.llm.generateContent(prompt);
  }
}