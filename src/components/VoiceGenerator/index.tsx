import React, { useState, useRef, useEffect } from "react";
import { VoiceService } from "../../lib/voiceService";

interface VoiceGeneratorProps {
  script: string;
  apiKey: string;
  voiceId: string;
  modelId: string;
}

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  script,
  apiKey,
  voiceId,
  modelId,
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

  const generateVoice = async () => {
    try {
      if (!apiKey) {
        throw new Error("ElevenLabs API key is required");
      }

      if (!voiceId || !modelId) {
        throw new Error("Voice and model selection are required");
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
        cleanedScript,
        voiceId,
        modelId
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
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={generateVoice}
          disabled={isGenerating}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-900/30 disabled:text-emerald-200/50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? "Generating..." : "Generate Voice"}
        </button>

        {audioBlob && (
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-[#1D3B32] text-emerald-50 rounded-lg hover:bg-[#2A4C43] transition-colors"
          >
            Download MP3
          </button>
        )}
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          Generating voice...
        </div>
      )}

      {audioUrl && (
        <div className="mt-4 p-4 bg-[#0F231D] border border-[#1D3B32] rounded-lg">
          <audio ref={audioRef} controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};
