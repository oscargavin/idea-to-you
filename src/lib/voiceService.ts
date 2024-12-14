// src/lib/voiceService.ts
import { ElevenLabsClient } from "elevenlabs";

export class VoiceService {
    private client: ElevenLabsClient;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('ElevenLabs API key is required');
        }
        
        this.client = new ElevenLabsClient({
            apiKey,
        });
    }

    async generateVoice(text: string): Promise<Blob> {
        try {
          // Verify authentication first
          await this.client.voices.getAll();
          
          const audio = await this.client.generate({
            voice: "EiNlNiXeDU1pqqOPrYMO",
            model_id: "eleven_turbo_v2",
            text,
          });
      
          // Handle browser streaming
          const chunks: Uint8Array[] = [];
          for await (const chunk of audio) {
            chunks.push(chunk);
          }
      
          return new Blob(chunks, { type: 'audio/mpeg' });
        } catch (error) {
          console.error('Full error:', error);
          throw error;
        }
      }
}