// src/components/VideoComposition/types.ts
import type { GeneratedImage, Script } from "../../lib/types";

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

export interface SegmentTiming {
  start: number;
  end: number;
  duration: number;
  contentStart: number;
  contentEnd: number;
}