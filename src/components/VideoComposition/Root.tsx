// src/components/VideoComposition/Root.tsx
import { Composition } from "remotion";
import { VideoComposition } from "./Composition";
import { videoCompositionSchema, type VideoCompositionProps } from "./types";

// Create a properly typed wrapper component
const RemotionVideoComposition = (props: Record<string, unknown>) => {
  const parsedProps = videoCompositionSchema.parse(props);
  return (
    <VideoComposition
      audioUrl={parsedProps.audioUrl}
      images={parsedProps.images}
      script={parsedProps.script}
    />
  );
};

export const RemotionRoot: React.FC = () => {
  // Define default props for the composition
  const defaultProps: VideoCompositionProps = {
    audioUrl: "",
    images: [],
    script: {
      outline: "",
      rawContent: "", // Add this
      conceptualSegments: [], // Changed from segments to conceptualSegments
      style: "",
      totalDuration: 0,
    },
  };

  return (
    <Composition
      id="MainVideo"
      component={RemotionVideoComposition}
      schema={videoCompositionSchema}
      durationInFrames={300}
      fps={30}
      width={1472}
      height={832}
      defaultProps={defaultProps}
    />
  );
};
