// src/components/VideoComposition/Composition.tsx
import { AbsoluteFill, Audio, useVideoConfig } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearTiming } from "@remotion/transitions";
import { useEffect } from "react";
import { preloadImage } from "@remotion/preload";
import type { VideoCompositionProps } from "./types";
import React from "react";
import { Subtitles } from "./Subtitles";

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  audioUrl,
  images,
  script,
}) => {
  const { durationInFrames, fps } = useVideoConfig();
  const TRANSITION_DURATION = 30; // frames

  // Convert time in seconds to frame number
  const getFrameForTime = (timeInSeconds: number): number => {
    const frame = Math.round(timeInSeconds * fps);
    return Math.max(0, Math.min(frame, durationInFrames));
  };

  // Log composition details and preload images
  useEffect(() => {
    if (!script?.conceptualSegments) return;

    console.log("Video composition setup:", {
      durationInFrames,
      fps,
      segmentCount: script.conceptualSegments.length,
      imageCount: images?.length,
      audioUrl,
    });

    // Log timing information for each segment
    script.conceptualSegments.forEach((segment, i) => {
      if (segment.timing) {
        console.log(`Segment ${i} timing:`, {
          theme: segment.conceptTheme,
          startTime: segment.timing.start,
          endTime: segment.timing.end,
          duration: segment.timing.duration,
          contentRange: `${segment.timing.contentStart}-${segment.timing.contentEnd}`,
        });
      }
    });

    // Preload all images
    images?.forEach((img) => preloadImage(img.url));
  }, [script, images, fps, durationInFrames, audioUrl]);

  // Validate required props
  if (!script?.conceptualSegments || !images?.length) {
    console.warn("Missing required props:", {
      hasSegments: !!script?.conceptualSegments,
      imageCount: images?.length,
    });
    return null;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Audio track */}
      <Audio src={audioUrl} />

      {/* Visual transitions */}
      <TransitionSeries>
        {script.conceptualSegments.map((segment, index) => {
          if (!segment.timing) {
            console.warn(`Missing timing for segment ${index}`);
            return null;
          }

          const startFrame = getFrameForTime(segment.timing.start);
          const endFrame = getFrameForTime(segment.timing.end);
          const isLastSegment = index === script.conceptualSegments.length - 1;

          // Calculate segment duration in frames
          const segmentDuration = isLastSegment
            ? durationInFrames - startFrame // Ensure last segment reaches the end
            : endFrame - startFrame;

          // Find matching image
          const matchingImage = images.find((img) => img.index === index);
          if (!matchingImage) {
            console.error(`No matching image for segment ${index}`);
            return null;
          }

          // Log render details for debugging
          console.log(`Rendering segment ${index}:`, {
            startFrame,
            endFrame,
            duration: segmentDuration,
            isLastSegment,
            imageUrl: matchingImage.url,
          });

          return (
            <React.Fragment key={segment.index}>
              <TransitionSeries.Sequence durationInFrames={segmentDuration}>
                <AbsoluteFill style={{ backgroundColor: "black" }}>
                  <img
                    src={matchingImage.url}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    alt={`Scene: ${segment.conceptTheme}`}
                  />
                </AbsoluteFill>
              </TransitionSeries.Sequence>

              {/* Add fade transition between segments */}
              {!isLastSegment && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({
                    durationInFrames: TRANSITION_DURATION,
                  })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Overlay subtitles if available */}
      {script.characterTimings && (
        <Subtitles characterTimings={script.characterTimings} />
      )}
    </AbsoluteFill>
  );
};
