// src/components/VideoComposition/Player.tsx
import { Player } from "@remotion/player";
import React, { useEffect } from "react";
import { VideoComposition } from "./Composition";
import type { VideoPlayerProps } from "./types";

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  audioUrl,
  images,
  durationInFrames,
}) => {
  const compositionWidth = 1472;
  const compositionHeight = 832;

  useEffect(() => {
    console.log("VideoPlayer mounted with:", {
      audioUrl,
      imageCount: images.length,
      durationInFrames,
    });
  }, [audioUrl, images, durationInFrames]);

  return (
    <div className="relative w-full bg-black">
      <div
        className="relative"
        style={{
          aspectRatio: `${compositionWidth} / ${compositionHeight}`,
        }}
      >
        <Player
          component={VideoComposition}
          inputProps={{
            audioUrl,
            images,
          }}
          durationInFrames={durationInFrames}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          fps={30}
          style={{
            width: "100%",
            height: "100%",
          }}
          controls
          autoPlay
          loop
        />
      </div>
    </div>
  );
};
