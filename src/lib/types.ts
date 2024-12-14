// src/lib/types.ts

export type LLMProvider = 'gpt4' | 'claude';

export interface ScriptSegment {
    content: string;
    index: number;
    timing?: {
        start: number;
        end: number;
    };
}

export interface Script {
    outline: string;
    segments: ScriptSegment[];
    style: string;
    totalDuration?: number;
}

export interface GenerationConfig {
    topic: string;
    style: string;
    stylePreset: string;  // For Leonardo AI
    llmProvider: LLMProvider;
    segmentCount: number; // Changed from durationMinutes
}

export interface GeneratedContent {
    script: Script;
    audioBlob?: Blob;
    images?: GeneratedImage[];
    videoUrl?: string;
}

export interface GeneratedImage {
    url: string;
    promptSegment: string;
    index: number;
}

// Leonardo AI Style Presets
export const STYLE_PRESETS = [
    { name: 'Dynamic', uuid: '111dc692-d470-4eec-b791-3475abac4c46' },
    { name: '3D Render', uuid: 'debdf72a-91a4-467b-bf61-cc02bdeb69c6' },
    { name: 'Cinematic', uuid: '5632c7c-ddbb-4e2f-ba34-8456ab3ac436' },
    { name: 'Creative', uuid: '6fedbf1f-4a17-45ec-84fb-92fe524a29ef' },
    { name: 'HDR', uuid: '97c20e5c-1af6-4d42-b227-54d03d8f0727' },
    { name: 'Vibrant', uuid: 'dee282d3-891f-4f73-ba02-7f8131e5541b' }
];