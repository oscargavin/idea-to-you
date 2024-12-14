// src/components/VideoComposition/Composition.tsx
import { AbsoluteFill, Audio, useVideoConfig } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearTiming } from "@remotion/transitions";
import { useEffect } from "react";
import { preloadImage } from "@remotion/preload";
import type { VideoCompositionProps, ImageSequenceProps } from "./types";
import React from "react";

const TRANSITION_DURATION = 30; // 1 second transition at 30fps

const ImageSequence: React.FC<ImageSequenceProps> = ({ image }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <img
        src={image.url}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          backgroundColor: "black",
        }}
        alt={`Scene ${image.index + 1}`}
      />
    </AbsoluteFill>
  );
};

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  audioUrl,
  images,
}) => {
  const { durationInFrames } = useVideoConfig();

  // Calculate frames per segment based on total duration and number of images
  const baseFramesPerSegment = Math.floor(
    (durationInFrames - (images.length - 1) * TRANSITION_DURATION) /
      images.length
  );
  // Add remaining frames to the last segment
  const remainingFrames =
    durationInFrames -
    baseFramesPerSegment * images.length -
    (images.length - 1) * TRANSITION_DURATION;

  useEffect(() => {
    if (!images?.length) return;

    console.log("Video composition details:", {
      totalFrames: durationInFrames,
      baseFramesPerSegment,
      remainingFrames,
      imageCount: images.length,
    });

    const unpreloaders = images.map((img) => preloadImage(img.url));
    return () => unpreloaders.forEach((unpreload) => unpreload());
  }, [images, durationInFrames, baseFramesPerSegment, remainingFrames]);

  if (!images?.length) {
    return (
      <AbsoluteFill style={{ backgroundColor: "black" }}>
        <div className="flex items-center justify-center text-white">
          Loading...
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Audio src={audioUrl} />
      <TransitionSeries>
        {images.map((image, index) => (
          <React.Fragment key={image.index}>
            <TransitionSeries.Sequence
              durationInFrames={
                index === images.length - 1
                  ? baseFramesPerSegment + remainingFrames
                  : baseFramesPerSegment
              }
            >
              <ImageSequence image={image} />
            </TransitionSeries.Sequence>
            {index < images.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
