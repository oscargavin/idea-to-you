// src/lib/voiceService.ts
import { ElevenLabsClient } from "elevenlabs";
import { CharacterTiming, SegmentTiming, Script, ConceptualSegment } from "./types";

interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

export interface TimedAudioResponse {
  audio: Blob;
  characterTimings: CharacterTiming;
}

export class VoiceService {
  private client: ElevenLabsClient;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.client = new ElevenLabsClient({ apiKey });
  }

  async generateVoiceWithTimings(text: string): Promise<TimedAudioResponse> {
    try {
      const response = await this.client.textToSpeech.convertWithTimestamps(
        "JBFqnCBsd6RMkjVDRZzb",
        {
          text,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128"
        }
      ) as ElevenLabsResponse;

      if (!response.audio_base64 || !response.alignment) {
        throw new Error('Invalid response format from ElevenLabs');
      }

      const binaryAudio = atob(response.audio_base64);
      const arrayBuffer = new ArrayBuffer(binaryAudio.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryAudio.length; i++) {
        uint8Array[i] = binaryAudio.charCodeAt(i);
      }

      const audioBlob = new Blob([uint8Array], { type: 'audio/mpeg' });

      return {
        audio: audioBlob,
        characterTimings: {
          characters: response.alignment.characters,
          character_start_times_seconds: response.alignment.character_start_times_seconds,
          character_end_times_seconds: response.alignment.character_end_times_seconds
        }
      };
    } catch (error) {
      console.error('Error generating voice with timings:', error);
      throw error instanceof Error ? error : new Error('Unknown error in voice generation');
    }
  }

  calculateConceptualSegmentTimings(script: Script, characterTimings: CharacterTiming): Script {
    const { characters, character_start_times_seconds, character_end_times_seconds } = characterTimings;
    let currentPosition = 0;
    
    // Update each conceptual segment with timing information
    const updatedSegments = script.conceptualSegments.map((segment: ConceptualSegment) => {
      // Find the segment's content in the full text
      const segmentStart = script.rawContent.indexOf(segment.content, currentPosition);
      if (segmentStart === -1) {
        throw new Error(`Could not find segment content in full text: ${segment.content.substring(0, 50)}...`);
      }
      
      const segmentEnd = segmentStart + segment.content.length;
      currentPosition = segmentEnd;

      // Find timing data for this segment
      const startTime = character_start_times_seconds[segmentStart] || 0;
      const endTime = character_end_times_seconds[Math.min(segmentEnd - 1, character_end_times_seconds.length - 1)] || 0;

      const timing: SegmentTiming = {
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
        contentStart: segmentStart,
        contentEnd: segmentEnd
      };

      return {
        ...segment,
        timing
      };
    });

    return {
      ...script,
      conceptualSegments: updatedSegments
    };
  }

  logTimingAnalysis(script: Script) {
    if (!script.characterTimings) {
      console.warn('No character timings available for analysis');
      return;
    }

    console.log('=== Timing Analysis ===');
    script.conceptualSegments.forEach((segment, i) => {
      if (!segment.timing) {
        console.warn(`No timing data for segment ${i}`);
        return;
      }

      console.log(`Conceptual Segment ${i}:`);
      console.log(`Theme: ${segment.conceptTheme}`);
      console.log(`Content: ${segment.content.substring(0, 50)}...`);
      console.log(`Timing:`, segment.timing);

      if (i > 0) {
        const prevSegment = script.conceptualSegments[i - 1];
        if (!prevSegment.timing) {
          console.warn(`No timing data for previous segment ${i - 1}`);
          return;
        }

        const gap = segment.timing.start - prevSegment.timing.end;
        console.log(`Gap from previous segment: ${gap}s`);
      }
    });
  }
}