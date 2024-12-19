// src/lib/voiceService.ts
import { CharacterTiming, SegmentTiming, Script, ConceptualSegment } from "./types";
import axios from 'axios';

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
  private apiKey: string;
  private readonly DEFAULT_TIMEOUT = 120000; // 120 seconds
  private readonly API_BASE = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.apiKey = apiKey;
  }

  async generateVoiceWithTimings(text: string, voiceId: string, modelId: string): Promise<TimedAudioResponse> {
    try {
      console.log('Starting voice generation:', { 
        voiceId, 
        modelId, 
        textLength: text.length
      });
      
      const response = await axios({
        method: 'POST',
        url: `${this.API_BASE}/text-to-speech/${voiceId}/with-timestamps`,
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          text,
          model_id: modelId,
          output_format: "mp3_44100_128"
        },
        timeout: this.DEFAULT_TIMEOUT,
        responseType: 'json'
      });

      const data = response.data as ElevenLabsResponse;

      if (!data.audio_base64 || !data.alignment) {
        throw new Error('Invalid response format from ElevenLabs');
      }

      const binaryAudio = atob(data.audio_base64);
      const arrayBuffer = new ArrayBuffer(binaryAudio.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryAudio.length; i++) {
        uint8Array[i] = binaryAudio.charCodeAt(i);
      }

      const audioBlob = new Blob([uint8Array], { type: 'audio/mpeg' });

      return {
        audio: audioBlob,
        characterTimings: {
          characters: data.alignment.characters,
          character_start_times_seconds: data.alignment.character_start_times_seconds,
          character_end_times_seconds: data.alignment.character_end_times_seconds
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        console.error('Request timed out:', error);
        throw new Error('Voice generation timed out - text may be too long or service is experiencing delays');
      }
      console.error('Error generating voice with timings:', error);
      throw error instanceof Error ? error : new Error('Unknown error in voice generation');
    }
  }


  // In VoiceService.ts
  calculateConceptualSegmentTimings(script: Script, characterTimings: CharacterTiming): Script {
    const { characters, character_start_times_seconds, character_end_times_seconds } = characterTimings;
    let currentPosition = 0;
    const lastCharacterEndTime = character_end_times_seconds[character_end_times_seconds.length - 1];

    // Normalize text while preserving important characters
    const normalizeText = (text: string): string => {
      return text
        .replace(/[\n\r]+/g, ' ')     // Replace newlines with spaces
        .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
        .trim();                      // Remove leading/trailing whitespace
    };

    // Create a mapping of original positions to normalized positions
    const createPositionMap = (originalText: string): number[] => {
      const positionMap: number[] = [];
      let normalizedIndex = 0;

      for (let i = 0; i < originalText.length; i++) {
        if (!/\s/.test(originalText[i]) || 
            (originalText[i] === ' ' && (i === 0 || !/\s/.test(originalText[i - 1])))) {
          positionMap[normalizedIndex] = i;
          normalizedIndex++;
        }
      }
      return positionMap;
    };

    // Prepare normalized content and position mapping
    const normalizedRawContent = normalizeText(script.rawContent);
    const positionMap = createPositionMap(script.rawContent);

    // Debug logging
    console.log('Timing calculation:', {
      rawContentLength: script.rawContent.length,
      normalizedLength: normalizedRawContent.length,
      segmentCount: script.conceptualSegments.length,
      characterCount: characters.length,
      totalDuration: lastCharacterEndTime
    });

    // Update each conceptual segment with timing information
    const updatedSegments = script.conceptualSegments.map((segment: ConceptualSegment, index: number) => {
      const normalizedSegmentContent = normalizeText(segment.content);
      const isLastSegment = index === script.conceptualSegments.length - 1;

      console.log(`Processing segment ${index}:`, {
        theme: segment.conceptTheme,
        contentLength: normalizedSegmentContent.length,
        contentPreview: normalizedSegmentContent.substring(0, 50),
        searchStartPosition: currentPosition,
        isLastSegment
      });

      // Find the segment's content in the normalized full text
      let segmentStart = normalizedRawContent.indexOf(normalizedSegmentContent, currentPosition);

      // Try fuzzy search if exact match fails
      if (segmentStart === -1) {
        // Try without some common punctuation
        const relaxedSegmentContent = normalizedSegmentContent.replace(/['"]/g, '');
        const relaxedRawContent = normalizedRawContent.replace(/['"]/g, '');
        segmentStart = relaxedRawContent.indexOf(relaxedSegmentContent, currentPosition);

        if (segmentStart === -1) {
          console.error('Segment match failed:', {
            segmentContent: normalizedSegmentContent,
            rawContentSection: normalizedRawContent.substring(
              currentPosition,
              currentPosition + 100
            ),
            currentPosition
          });
          throw new Error(`Could not find segment content in full text: ${normalizedSegmentContent.substring(0, 50)}...`);
        }
      }

      console.log('Found segment at position:', segmentStart);

      const segmentEnd = segmentStart + normalizedSegmentContent.length;
      currentPosition = segmentEnd;

      // Handle the case where segmentStart is -1
      const safeSegmentStart = Math.max(0, segmentStart);
      const originalStart = positionMap[safeSegmentStart] || 0;

      // Handle the case where segmentEnd is beyond the positionMap
      const safeSegmentEnd = Math.min(segmentEnd, positionMap.length);
      const originalEnd = positionMap[safeSegmentEnd - 1] + 1;

      // Find timing data for this segment using original text positions
      const safeOriginalEndForTimes = Math.min(originalEnd - 1, character_end_times_seconds.length - 1);
      let startTime = character_start_times_seconds[originalStart] || 0;
      let endTime = character_end_times_seconds[safeOriginalEndForTimes] || 0;

      // For the last segment, ensure it extends to the end of the audio
      if (isLastSegment) {
        endTime = lastCharacterEndTime;
        
        // Add a small buffer if needed
        const minSegmentDuration = 2.0; // Minimum 2 seconds for last segment
        if (endTime - startTime < minSegmentDuration) {
          endTime = Math.min(lastCharacterEndTime, startTime + minSegmentDuration);
        }
      }

      const timing: SegmentTiming = {
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
        contentStart: originalStart,
        contentEnd: originalEnd
      };

      console.log(`Segment ${index} timing:`, {
        start: timing.start,
        end: timing.end,
        duration: timing.duration,
        isLastSegment
      });

      return {
        ...segment,
        timing
      };
    });

    // Validate timing coverage
    const totalDuration = lastCharacterEndTime;
    const coveredDuration = updatedSegments.reduce((acc, segment) => {
      return segment.timing ? Math.max(acc, segment.timing.end) : acc;
    }, 0);

    if (coveredDuration < totalDuration * 0.98) { // Allow 2% margin
      console.warn('Timing coverage gap detected:', {
        totalDuration,
        coveredDuration,
        gap: totalDuration - coveredDuration
      });
    }

    return {
      ...script,
      conceptualSegments: updatedSegments
    };
  }
}