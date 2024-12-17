// src/components/VideoComposition/types.ts
import { z } from 'zod';
import { GeneratedImage, Script } from "../../lib/types";

export interface VideoCompositionProps {
  audioUrl: string;
  images: GeneratedImage[];
  script: Script;
}

export interface VideoPlayerProps {
  audioUrl: string;
  images: GeneratedImage[];
  script: Script;
  durationInFrames: number;
}

// Create Zod schemas that match the interfaces
const generatedImageSchema = z.object({
  url: z.string(),
  conceptTheme: z.string(),
  index: z.number()
});

export const videoCompositionSchema = z.object({
  audioUrl: z.string(),
  images: z.array(generatedImageSchema),
  script: z.any() // We'll use Script type from lib/types
});

export const videoPlayerSchema = z.object({
  audioUrl: z.string(),
  images: z.array(generatedImageSchema),
  script: z.any(),
  durationInFrames: z.number()
});