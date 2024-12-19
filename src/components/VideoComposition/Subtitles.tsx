// src/components/VideoComposition/Subtitles.tsx
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";

interface SubtitleProps {
  characterTimings: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  maxLineLength?: number;
}

interface Phrase {
  text: string;
  startTime: number;
  endTime: number;
}

const FONT_SIZE = 32;
const FONT_FAMILY = "Arial, sans-serif";
const LINE_HEIGHT = 1.5;
const MAX_LINE_WIDTH = 1200;
const FADE_DURATION = 0.1; // Duration in seconds for fade transitions

export const Subtitles: React.FC<SubtitleProps> = ({
  characterTimings,
  maxLineLength = 80,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeInSeconds = frame / fps;

  // Function to clean and prepare text for splitting
  const prepareText = (text: string): string => {
    // Move trailing punctuation to the end of the current phrase
    return text.replace(/^([,.:;!?])\s+/, " $1").trim();
  };

  // Convert character timings to phrases
  const phrases = useMemo(() => {
    const result: Phrase[] = [];
    let currentPhrase = "";
    let phraseStartTime = 0;
    let lastCharEndTime = 0;
    let currentLength = 0;
    let buffer = "";

    const commitPhrase = () => {
      if (buffer.trim()) {
        const cleanedPhrase = prepareText(buffer);
        if (cleanedPhrase) {
          result.push({
            text: cleanedPhrase,
            startTime: phraseStartTime,
            endTime: lastCharEndTime - FADE_DURATION,
          });
        }
      }
      buffer = "";
      currentLength = 0;
    };

    for (let i = 0; i < characterTimings.characters.length; i++) {
      const char = characterTimings.characters[i];
      const startTime = characterTimings.character_start_times_seconds[i];
      const endTime = characterTimings.character_end_times_seconds[i];

      const nextChar = characterTimings.characters[i + 1] || "";
      const isWordBoundary = char === " " || char === "\n";
      const isPunctuation = /[,.:;!?]/.test(char);

      if (
        !buffer ||
        /[.!?]/.test(char) ||
        (currentLength >= maxLineLength && isWordBoundary)
      ) {
        if (buffer) {
          commitPhrase();
        }
        phraseStartTime = startTime;
      }

      buffer += char;
      currentLength++;
      lastCharEndTime = endTime;

      if (
        /[.!?]/.test(char) ||
        (isPunctuation && isWordBoundary) ||
        (currentLength >= maxLineLength && isWordBoundary)
      ) {
        commitPhrase();
      }
    }

    if (buffer) {
      commitPhrase();
    }

    return result;
  }, [characterTimings, maxLineLength]);

  // Find current phrase with fade timing
  const currentPhrase = useMemo(() => {
    const fadeDurationFrames = FADE_DURATION * fps;
    return phrases.find((phrase) => {
      const startFrame = phrase.startTime * fps;
      const endFrame = phrase.endTime * fps;
      return frame >= startFrame && frame <= endFrame + fadeDurationFrames;
    });
  }, [phrases, frame, fps]);

  // Calculate opacity - moved to useMemo to maintain hook consistency
  const opacity = useMemo(() => {
    if (!currentPhrase) return 0;
    const startFrame = currentPhrase.startTime * fps;
    const endFrame = currentPhrase.endTime * fps;
    const fadeFrames = FADE_DURATION * fps;

    if (frame < startFrame + fadeFrames) {
      return (frame - startFrame) / fadeFrames;
    } else if (frame > endFrame) {
      return 1 - (frame - endFrame) / fadeFrames;
    }
    return 1;
  }, [currentPhrase, frame, fps]);

  // Split current phrase into lines based on width
  const lines = useMemo(() => {
    if (!currentPhrase) return [];
    const words = currentPhrase.text.split(" ");
    const result: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const lineWidth = measureText({
        text: testLine,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE,
      }).width;

      if (lineWidth > MAX_LINE_WIDTH) {
        if (currentLine) result.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      result.push(currentLine);
    }

    return result;
  }, [currentPhrase]);

  // Always render the container, even if empty
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: LINE_HEIGHT * FONT_SIZE * 0.5,
        opacity,
        transition: `opacity ${FADE_DURATION}s ease-in-out`,
      }}
    >
      {currentPhrase &&
        lines.map((line, lineIndex) => (
          <div
            key={`${currentPhrase.startTime}-${lineIndex}`}
            style={{
              fontSize: FONT_SIZE,
              fontFamily: FONT_FAMILY,
              color: "white",
              textAlign: "center",
              textShadow: `
              -2px -2px 0 #000,  
               2px -2px 0 #000,
              -2px  2px 0 #000,
               2px  2px 0 #000,
               0 3px 6px rgba(0,0,0,0.5)
            `,
              padding: "0.5em 1em",
              lineHeight: LINE_HEIGHT,
              fontWeight: 500,
              letterSpacing: "0.02em",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              borderRadius: "8px",
              maxWidth: "90%",
            }}
          >
            {line}
          </div>
        ))}
    </div>
  );
};
