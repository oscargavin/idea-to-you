import React, { useState, useRef, useEffect } from "react";
import { VoiceService } from "../../lib/voiceService";

interface VoiceGeneratorProps {
  script: string;
  apiKey: string;
}

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  script,
  apiKey,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Clean up audio URL when component unmounts or when audioBlob changes
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Make sure to load the audio source
      if (audioRef.current) {
        audioRef.current.load();
      }

      return () => {
        URL.revokeObjectURL(url);
        setAudioUrl(null);
      };
    }
  }, [audioBlob]);

  // Clean script text for voice generation
  const cleanScriptText = (text: string): string => {
    return (
      text
        // Remove narrator timestamps like "**Narrator (0:00 - 0:10):**"
        .replace(/\*\*Narrator\s*\([^)]*\):\*\*/g, "")
        // Remove music cues like "[Opening Music]" or "[Transition Music]"
        .replace(/\[[^\]]*Music[^\]]*\]/g, "")
        // Remove any other stage directions in brackets
        .replace(/\[[^\]]*\]/g, "")
        // Remove extra whitespace and blank lines
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n")
    );
  };

  // src/components/VoiceGenerator/index.tsx
  const generateVoice = async () => {
    try {
      if (!apiKey) {
        throw new Error("ElevenLabs API key is required");
      }

      // Clean the script before sending to ElevenLabs
      const cleanedScript = cleanScriptText(script);

      setIsGenerating(true);
      setError(null);

      // Clean up previous audio URL if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const voiceService = new VoiceService(apiKey);
      const response = await voiceService.generateVoiceWithTimings(
        cleanedScript
      );
      // Extract just the audio blob from the response
      setAudioBlob(response.audio);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate voice";
      setError(errorMessage);
      console.error("Voice generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (audioBlob) {
      // Create a new URL specifically for downloading
      const downloadUrl = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "generated-voice.mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl); // Clean up the download URL
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={generateVoice}
          disabled={isGenerating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          {isGenerating ? "Generating..." : "Generate Voice"}
        </button>

        {audioBlob && (
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Download MP3
          </button>
        )}
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-blue-600">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          Generating voice...
        </div>
      )}

      {audioUrl && (
        <div className="mt-4">
          <audio ref={audioRef} controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};
