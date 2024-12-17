// src/components/VideoComposition/Composition.tsx
import { AbsoluteFill, Audio, useVideoConfig } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearTiming } from "@remotion/transitions";
import { useEffect } from "react";
import { preloadImage } from "@remotion/preload";
import type { VideoCompositionProps } from "./types";
import React from "react";

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  audioUrl,
  images,
  script,
}) => {
  const { durationInFrames, fps } = useVideoConfig();
  const TRANSITION_DURATION = 30; // frames

  const getFrameForTime = (timeInSeconds: number): number =>
    Math.round(timeInSeconds * fps);

  useEffect(() => {
    if (!script?.conceptualSegments) return;

    // Log composition timing information
    console.log("Video composition setup:", {
      durationInFrames,
      fps,
      segmentCount: script.conceptualSegments.length,
      imageCount: images?.length,
    });

    script.conceptualSegments.forEach((segment, i) => {
      if (segment.timing) {
        console.log(`Segment ${i} timing:`, {
          start: getFrameForTime(segment.timing.start),
          end: getFrameForTime(segment.timing.end),
          duration: getFrameForTime(segment.timing.duration),
          theme: segment.conceptTheme,
        });
      }
    });

    // Preload images
    if (images) {
      images.forEach((img) => preloadImage(img.url));
    }
  }, [script, images, fps, durationInFrames]);

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
          const duration = endFrame - startFrame;

          // Find matching image by conceptual theme
          const matchingImage = images.find((img) => img.index === index);

          if (!matchingImage) {
            console.warn(`No matching image for segment ${index}`);
            return null;
          }

          return (
            <React.Fragment key={segment.index}>
              <TransitionSeries.Sequence durationInFrames={duration}>
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

              {index < script.conceptualSegments.length - 1 && (
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
    </AbsoluteFill>
  );
};
