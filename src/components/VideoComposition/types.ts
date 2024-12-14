// src/components/VideoComposition/types.ts
import { z } from 'zod';
import { GeneratedImage } from "../../lib/types";

// Define the interfaces
export interface VideoCompositionProps {
  audioUrl: string;
  images: GeneratedImage[];
}

export interface ImageSequenceProps {
  image: GeneratedImage;
}

export interface VideoPlayerProps {
  audioUrl: string;
  images: GeneratedImage[];
  durationInFrames: number;
}

// Create a complete schema for GeneratedImage that matches the interface
const generatedImageSchema = z.object({
  url: z.string(),
  promptSegment: z.string(),
  index: z.number()
});

// Create Zod schemas that match the interfaces
export const videoCompositionSchema = z.object({
  audioUrl: z.string(),
  images: z.array(generatedImageSchema)
});

export const imageSequenceSchema = z.object({
  image: generatedImageSchema
});

export const videoPlayerSchema = z.object({
  audioUrl: z.string(),
  images: z.array(generatedImageSchema),
  durationInFrames: z.number()
});

// Export inferred types from schemas if needed
export type VideoCompositionPropsFromSchema = z.infer<typeof videoCompositionSchema>;
export type ImageSequencePropsFromSchema = z.infer<typeof imageSequenceSchema>;
export type VideoPlayerPropsFromSchema = z.infer<typeof videoPlayerSchema>;

// Type assertion to ensure schema matches interface
type SchemaType = z.infer<typeof generatedImageSchema>;
type _TypesMatch = RequireExactlyOne<SchemaType, GeneratedImage>;
type RequireExactlyOne<T, U> = T extends U ? U extends T ? true : false : false;