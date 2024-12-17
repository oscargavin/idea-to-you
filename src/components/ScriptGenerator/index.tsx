// src/components/ScriptGenerator/index.tsx
import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { Loader2, Wand2, Download, PlayCircle } from "lucide-react";
import { LLMService } from "../../lib/llm";
import { ImageGenerationService } from "../../lib/imageService";
import { VoiceService } from "../../lib/voiceService";
import { VideoPlayer } from "../VideoComposition/Player";
import { ScriptGenerator } from "../../lib/scriptGen";
import {
  Script,
  LLMProvider,
  GeneratedContent,
  STYLE_PRESETS,
} from "../../lib/types";

interface ScriptGeneratorProps {
  openaiKey: string;
  anthropicKey: string;
  elevenLabsKey: string;
  leonardoKey: string;
}

export const ScriptGeneratorComponent: React.FC<ScriptGeneratorProps> = ({
  openaiKey,
  anthropicKey,
  elevenLabsKey,
  leonardoKey,
}) => {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [segmentCount, setSegmentCount] = useState<number>(2);
  const [generationSegmentCount, setGenerationSegmentCount] =
    useState<number>(2);
  const [stylePreset, setStylePreset] = useState(STYLE_PRESETS[0].uuid);
  const [provider, setProvider] = useState<LLMProvider>("gpt4");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  const calculateAudioDuration = async (audioBlob: Blob): Promise<number> => {
    const audioContext = new AudioContext();

    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get duration in seconds
      const duration = audioBuffer.duration;

      // Clean up
      await audioContext.close();

      return duration;
    } catch (error) {
      console.error("Error calculating audio duration:", error);

      // Fallback to original method if Web Audio API fails
      return new Promise((resolve) => {
        const audio = new Audio();
        const url = URL.createObjectURL(audioBlob);
        audio.addEventListener("loadedmetadata", () => {
          URL.revokeObjectURL(url);
          resolve(audio.duration);
        });
        audio.src = url;
      });
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setGeneratedContent(null);
      setVideoUrl(null);
      setAudioDuration(null);
      setCurrentStep("Initializing...");

      // Initialize services
      const llm = new LLMService({
        openaiKey,
        anthropicKey,
        provider,
      });

      const imageService = new ImageGenerationService(leonardoKey, llm);
      const voiceService = new VoiceService(elevenLabsKey);

      // Create script generator
      const generator = new ScriptGenerator({
        llm,
        imageService,
        voiceService,
      });

      // Then in the generate function:
      const content = await generator.generate(
        {
          topic,
          style,
          stylePreset,
          llmProvider: provider,
          generationSegmentCount, // Changed from segmentCount
        },
        setCurrentStep
      );
      // Handle audio duration and URL creation
      if (content.audioBlob) {
        const duration = await calculateAudioDuration(content.audioBlob);
        setAudioDuration(duration);
        const audioUrl = URL.createObjectURL(content.audioBlob);
        setVideoUrl(audioUrl);
      }

      setGeneratedContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
      setCurrentStep("");
    }
  };

  const handleDownloadScript = useCallback(() => {
    if (!generatedContent?.script) return;

    const scriptText = `
  Outline:
  ${generatedContent.script.outline}
  
  Raw Content:
  ${generatedContent.script.rawContent}
  
  Conceptual Segments:
  ${generatedContent.script.conceptualSegments
    .map((s) => `[${s.conceptTheme}]\n${s.content}`)
    .join("\n\n")}
    `.trim();

    const blob = new Blob([scriptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedContent]);

  const handleDownloadAudio = useCallback(() => {
    if (!generatedContent?.audioBlob) return;

    const url = URL.createObjectURL(generatedContent.audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "narration.mp3";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedContent]);

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-50">Idea To You</h1>
          <p className="mt-2 text-emerald-200/70">
            Create full-length videos with GenAI
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-0 bg-[#132C25]/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="border-b border-[#1D3B32]">
            <CardTitle className="text-2xl text-emerald-50 flex items-center gap-2">
              <Wand2 className="h-6 w-6" />
              Create New Video
            </CardTitle>
            <CardDescription className="text-emerald-200/70">
              Configure your settings and generate content
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Tabs defaultValue="content" className="space-y-6">
              <TabsList className="bg-[#0F231D] border-0 p-1">
                <TabsTrigger
                  value="content"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-emerald-200/70"
                >
                  Content
                </TabsTrigger>
                <TabsTrigger
                  value="style"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-emerald-200/70"
                >
                  Style
                </TabsTrigger>
                <TabsTrigger
                  value="technical"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-emerald-200/70"
                >
                  Technical
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-emerald-100">Topic</Label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="bg-[#0F231D] border-[#1D3B32] text-emerald-50 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="What's your video about?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-emerald-100">
                      Content Generation Segments
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={generationSegmentCount}
                      onChange={(e) =>
                        setGenerationSegmentCount(
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="bg-[#0F231D] border-[#1D3B32] text-emerald-50 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-emerald-100">Writing Style</Label>
                    <Input
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="bg-[#0F231D] border-[#1D3B32] text-emerald-50 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Educational, casual, formal, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-emerald-100">Visual Style</Label>
                    <Select value={stylePreset} onValueChange={setStylePreset}>
                      <SelectTrigger className="bg-[#0F231D] border-[#1D3B32] text-emerald-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#132C25] border-[#1D3B32]">
                        {STYLE_PRESETS.map((preset) => (
                          <SelectItem
                            key={preset.uuid}
                            value={preset.uuid}
                            className="text-emerald-100 hover:bg-[#1D3B32] focus:bg-[#1D3B32]"
                          >
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-emerald-100">AI Model</Label>
                  <Select
                    value={provider}
                    onValueChange={(value) => setProvider(value as LLMProvider)}
                  >
                    <SelectTrigger className="bg-[#0F231D] border-[#1D3B32] text-emerald-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#132C25] border-[#1D3B32]">
                      <SelectItem
                        value="gpt4"
                        className="text-emerald-100 hover:bg-[#1D3B32] focus:bg-[#1D3B32]"
                      >
                        GPT-4
                      </SelectItem>
                      <SelectItem
                        value="claude"
                        className="text-emerald-100 hover:bg-[#1D3B32] focus:bg-[#1D3B32]"
                      >
                        Claude
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-8">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic || !style}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-12 disabled:bg-emerald-900/30 disabled:text-emerald-200/50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Content...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Generate Video
                  </span>
                )}
              </Button>
            </div>

            {currentStep && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-emerald-400 animate-pulse flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentStep}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Content Card */}
        {generatedContent && (
          <Card className="mt-8 border-0 bg-[#132C25]/90 backdrop-blur-xl shadow-2xl">
            <CardHeader className="border-b border-[#1D3B32]">
              <CardTitle className="text-2xl text-emerald-50">
                Generated Content
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <Button
                    onClick={handleDownloadScript}
                    variant="outline"
                    className="bg-[#0F231D] border-[#1D3B32] text-emerald-50 hover:bg-[#1D3B32]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Script
                  </Button>
                  <Button
                    onClick={handleDownloadAudio}
                    variant="outline"
                    className="bg-[#0F231D] border-[#1D3B32] text-emerald-50 hover:bg-[#1D3B32]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Audio
                  </Button>
                </div>

                {videoUrl && generatedContent.images && audioDuration && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem
                      value="preview"
                      className="border-b-[#1D3B32]"
                    >
                      <AccordionTrigger className="text-emerald-50 hover:text-emerald-400">
                        <span className="flex items-center gap-2">
                          <PlayCircle className="h-4 w-4" />
                          Preview Video
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-lg overflow-hidden bg-black">
                          <VideoPlayer
                            audioUrl={videoUrl}
                            images={generatedContent.images}
                            script={generatedContent.script} // Add this line
                            durationInFrames={Math.ceil(audioDuration * 30)}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScriptGeneratorComponent;
