// src/lib/types.ts

export type LLMProvider = 'gpt4' | 'claude';

// Generation-time segments (for content creation)
export interface GenerationSegment {
  content: string;
  index: number;
}

// Conceptual segments (for visual transitions)
export interface ConceptualSegment {
  content: string;
  conceptTheme: string;
  timing?: SegmentTiming;
  visualDescription?: string;
  index: number;
}

export interface TimingData {
  start: number;
  end: number;
  duration: number;
}

export interface Script {
  outline: string;
  rawContent: string;  // Complete unsegmented content
  conceptualSegments: ConceptualSegment[];
  style: string;
  totalDuration?: number;
  characterTimings?: CharacterTiming;
}

export interface GenerationConfig {
    topic: string;
    style: string;
    stylePreset: string;
    llmProvider: LLMProvider;
    generationSegmentCount: number;  // This is the key change
}

export interface GeneratedContent {
  script: Script;
  audioBlob: Blob;
  images?: GeneratedImage[];
  totalDuration: number;
}

export interface GeneratedImage {
  url: string;
  conceptTheme: string;  // Links image to conceptual segment
  index: number;
}

export interface CharacterTiming {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface SegmentTiming {
  start: number;
  end: number;
  duration: number;
  contentStart: number;
  contentEnd: number;
}

// Style presets remain unchanged
export const STYLE_PRESETS = [
  { name: 'Dynamic', uuid: '111dc692-d470-4eec-b791-3475abac4c46' },
  { name: '3D Render', uuid: 'debdf72a-91a4-467b-bf61-cc02bdeb69c6' },
  { name: 'Cinematic', uuid: '5632c7c-ddbb-4e2f-ba34-8456ab3ac436' },
  { name: 'Creative', uuid: '6fedbf1f-4a17-45ec-84fb-92fe524a29ef' },
  { name: 'HDR', uuid: '97c20e5c-1af6-4d42-b227-54d03d8f0727' },
  { name: 'Vibrant', uuid: 'dee282d3-891f-4f73-ba02-7f8131e5541b' }
];