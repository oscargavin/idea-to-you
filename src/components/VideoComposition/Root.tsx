// src/components/VideoComposition/Root.tsx
import { Composition } from "remotion";
import { VideoComposition } from "./Composition";
import { videoCompositionSchema, type VideoCompositionProps } from "./types";

// Create a properly typed wrapper component
const RemotionVideoComposition = (props: Record<string, unknown>) => {
  // Parse and validate props using the Zod schema
  const parsedProps = videoCompositionSchema.parse(props);

  // Now we can safely pass the validated props to the component
  return (
    <VideoComposition
      audioUrl={parsedProps.audioUrl}
      images={parsedProps.images}
    />
  );
};

export const RemotionRoot: React.FC = () => {
  // Define default props for the composition
  const defaultProps: VideoCompositionProps = {
    audioUrl: "",
    images: [],
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
