// src/lib/voiceConfig.ts

export interface Voice {
    id: string;
    name: string;
    type: 'male' | 'female';
  }
  
  export interface VoiceModel {
    id: string;
    name: string;
    isDefault?: boolean;
  }
  
  export const VOICE_MODELS: VoiceModel[] = [
    { id: 'eleven_english_v1', name: 'Eleven English v1' },
    { id: 'eleven_multilingual_v1', name: 'Eleven Multilingual v1' },
    { id: 'eleven_turbo_v1', name: 'Eleven Turbo v1' },
    { id: 'eleven_turbo_v2', name: 'Eleven Turbo v2.5' },
    { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', isDefault: true },
  ];
  
  export const VOICES: Voice[] = [
    { id: 'EiNlNiXeDU1pqqOPrYMO', name: 'John Doe - Deep', type: 'male' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Arnold (Legacy)', type: 'male' },
    { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', type: 'male' },
    { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', type: 'male' },
    { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', type: 'male' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', type: 'male' },
    { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', type: 'female' },
    { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', type: 'male' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', type: 'male' },
    { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', type: 'male' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', type: 'male' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', type: 'female' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', type: 'female' },
    { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', type: 'male' },
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', type: 'female' },
    { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', type: 'female' },
    { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', type: 'male' },
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', type: 'male' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', type: 'female' },
    { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', type: 'male' },
  ];