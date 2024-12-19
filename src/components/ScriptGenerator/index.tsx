import React, { useState, useCallback, useEffect } from "react";
import { FileText, Mic, Paintbrush, Settings } from "lucide-react";
import { useAuth } from "../../components/context/AuthContext";
import { supabase } from "../../lib/supabase/client";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { Loader2, Wand2, Download, PlayCircle, HelpCircle } from "lucide-react";
import { LLMService } from "../../lib/llm";
import { ImageGenerationService } from "../../lib/imageService";
import { VoiceService } from "../../lib/voiceService";
import { VideoPlayer } from "../VideoComposition/Player";
import { ScriptGenerator } from "../../lib/scriptGen";
import { VOICES, VOICE_MODELS } from "../../lib/voiceConfig";
import {
  Script,
  LLMProvider,
  GeneratedContent,
  STYLE_PRESETS,
} from "../../lib/types";
import { Combobox } from "../ui/combobox";

interface ApiKeys {
  openai_key: string | null;
  anthropic_key: string | null;
  elevenlabs_key: string | null;
  leonardo_key: string | null;
}

const TABS = [
  { id: "content", label: "Content", icon: FileText },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "style", label: "Style", icon: Paintbrush },
  { id: "technical", label: "Technical", icon: Settings },
];

export const ScriptGeneratorComponent: React.FC = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [style, setStyle] = useState("");
  const [generationSegmentCount, setGenerationSegmentCount] =
    useState<number>(1);
  const [stylePreset, setStylePreset] = useState(STYLE_PRESETS[0].uuid);
  const [provider, setProvider] = useState<LLMProvider>("gpt4");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const defaultVoice = VOICES.find(
      (voice) => voice.id === "EiNlNiXeDU1pqqOPrYMO"
    );
    return defaultVoice ? defaultVoice.id : "";
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    const defaultModel = VOICE_MODELS.find((model) => model.isDefault);
    return defaultModel ? defaultModel.id : "";
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  const voiceOptions = VOICES.map((voice) => ({
    value: voice.id,
    label: `${voice.name} (${voice.type})`,
  }));

  const modelOptions = VOICE_MODELS.map((model) => ({
    value: model.id,
    label: model.name,
  }));

  // Fetch API keys when component mounts
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from("user_api_keys")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        if (data) {
          setApiKeys(data);
        }
      } catch (error) {
        console.error("Error fetching API keys:", error);
        setError(
          "Failed to fetch API keys. Please check your profile settings."
        );
      }
    };

    fetchApiKeys();
  }, [user]);

  const calculateAudioDuration = async (audioBlob: Blob): Promise<number> => {
    const audioContext = new AudioContext();

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      await audioContext.close();
      return duration;
    } catch (error) {
      console.error("Error calculating audio duration:", error);
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

  const validateApiKeys = () => {
    if (!apiKeys) {
      throw new Error("Please set up your API keys in the profile page first.");
    }

    const requiredKeys = {
      OpenAI: apiKeys.openai_key,
      Anthropic: apiKeys.anthropic_key,
      ElevenLabs: apiKeys.elevenlabs_key,
      Leonardo: apiKeys.leonardo_key,
    };

    const missingKeys = Object.entries(requiredKeys)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required API keys: ${missingKeys.join(
          ", "
        )}. Please set them up in your profile.`
      );
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setGeneratedContent(null);
      setVideoUrl(null);
      setAudioDuration(null);
      setCurrentStep("Validating API keys...");

      // Validate API keys
      validateApiKeys();

      if (!apiKeys) {
        throw new Error("API keys not available");
      }

      if (!selectedVoice) {
        throw new Error("Please select a voice");
      }
      if (!selectedModel) {
        throw new Error("Please select a voice model");
      }

      console.log("Using voice:", selectedVoice); // Debug log
      console.log("Using model:", selectedModel); // Debug log

      // Initialize services with database-stored API keys
      const llm = new LLMService({
        openaiKey: apiKeys.openai_key!,
        anthropicKey: apiKeys.anthropic_key!,
        provider,
      });

      const imageService = new ImageGenerationService(
        apiKeys.leonardo_key!,
        llm
      );
      const voiceService = new VoiceService(apiKeys.elevenlabs_key!);

      setCurrentStep("Initialising services...");

      // Create script generator
      const generator = new ScriptGenerator({
        llm,
        imageService,
        voiceService,
      });

      // Generate content with subtitles setting
      const content = await generator.generate(
        {
          topic,
          keyPoints,
          style,
          stylePreset,
          llmProvider: provider,
          generationSegmentCount,
          voiceId: selectedVoice,
          voiceModel: selectedModel,
          showSubtitles,
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

      // Update generated content with subtitles setting
      setGeneratedContent({
        ...content,
        showSubtitles, // Include subtitles setting in generated content
      });
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
    <div className="min-h-screen gradient-bg">
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-emerald-50 mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 to-emerald-400">
              Idea To You
            </span>
          </h1>
          <p className="text-lg text-emerald-200/70 font-light">
            Create full-length videos with GenAI
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
          <div className="border-b border-[#1D3B32]/30 p-8">
            <div className="flex items-center gap-3 mb-3">
              <Wand2 className="h-6 w-6 text-emerald-400" />
              <h2 className="text-2xl font-semibold text-emerald-50">
                Create New Video
              </h2>
            </div>
            <p className="text-emerald-200/70">
              Configure your settings and generate content
            </p>
          </div>

          <div className="p-8">
            <Tabs defaultValue="content" className="space-y-8">
              <TabsList className="bg-[#0F231D]/50 border border-[#1D3B32]/30 p-1 rounded-xl w-full flex">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex-1 tab-highlight px-3 sm:px-6 py-2 rounded-lg 
                      data-[state=active]:bg-emerald-600 data-[state=active]:text-white 
                      text-emerald-200/70 transition-all duration-300"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <div className="min-h-[250px] lg:min-h-[250px]">
                <TabsContent value="content">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-emerald-100 text-sm font-medium mb-2 block">
                        Topic
                      </Label>
                      <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="neo-input w-full rounded-xl h-12 text-emerald-50 
                          placeholder:text-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="What's your video about?"
                      />
                    </div>

                    <div>
                      <Label className="text-emerald-100 text-sm font-medium mb-2 block">
                        Key Talking Points
                      </Label>
                      <Textarea
                        value={keyPoints}
                        onChange={(e) => setKeyPoints(e.target.value)}
                        className="neo-input w-full rounded-xl min-h-[120px] text-emerald-50 
                          placeholder:text-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                        placeholder="Enter key points to cover in your video (optional)"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="voice">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-emerald-100 text-sm font-medium mb-2 block">
                        Voice
                      </Label>
                      <Combobox
                        options={voiceOptions}
                        value={selectedVoice || ""} // Ensure we never pass undefined
                        onValueChange={(value) => {
                          console.log("Voice selected:", value); // Debug log
                          setSelectedVoice(value);
                        }}
                        placeholder="Select a voice"
                      />
                    </div>

                    <div>
                      <Label className="text-emerald-100 text-sm font-medium mb-2 block">
                        Voice Model
                      </Label>
                      <Combobox
                        options={modelOptions}
                        value={selectedModel || ""} // Ensure we never pass undefined
                        onValueChange={(value) => {
                          console.log("Model selected:", value); // Debug log
                          setSelectedModel(value);
                        }}
                        placeholder="Select a voice model"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="style">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-emerald-100 text-sm font-medium mb-2 block">
                        Writing Style
                      </Label>
                      <Input
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="neo-input w-full rounded-xl h-12 text-emerald-50 
                          placeholder:text-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Educational, casual, formal, etc."
                      />
                    </div>

                    <div>
                      <Label className="text-emerald-100 text-sm font-medium mb-2 block">
                        Visual Style
                      </Label>
                      <Select
                        value={stylePreset}
                        onValueChange={setStylePreset}
                      >
                        <SelectTrigger className="neo-input h-12 rounded-xl">
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

                <TabsContent value="technical">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-emerald-100 text-sm font-medium mb-2 block">
                        AI Model
                      </Label>
                      <Select
                        value={provider}
                        onValueChange={(value) =>
                          setProvider(value as LLMProvider)
                        }
                      >
                        <SelectTrigger className="neo-input h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#132C25] border-[#1D3B32]">
                          <SelectItem
                            value="gpt4"
                            className="text-emerald-100 hover:bg-[#1D3B32] focus:bg-[#1D3B32]"
                          >
                            GPT-4o
                          </SelectItem>
                          <SelectItem
                            value="claude"
                            className="text-emerald-100 hover:bg-[#1D3B32] focus:bg-[#1D3B32]"
                          >
                            Claude Sonnet 3.5
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-emerald-100 text-sm font-medium">
                          Content Generation Segments
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-emerald-400/70" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#132C25] border-[#1D3B32] text-emerald-50">
                              <p>
                                Number of segments to generate. Each segment is
                                typically 2 minutes long.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
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
                        className="neo-input w-full rounded-xl h-12 text-emerald-50 placeholder:text-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                          <Label
                            htmlFor="show-subtitles"
                            className="text-emerald-100 text-sm font-medium"
                          >
                            Show Subtitles
                          </Label>
                          <span className="text-emerald-200/70 text-xs">
                            Add automatically synchronized subtitles to the
                            video
                          </span>
                        </div>
                        <Switch
                          id="show-subtitles"
                          checked={showSubtitles}
                          onCheckedChange={setShowSubtitles}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="mt-8">
              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !topic ||
                  !style ||
                  !selectedVoice ||
                  !selectedModel
                }
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 
                  hover:from-emerald-500 hover:to-emerald-400 text-white font-medium 
                  rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                  shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed
                  disabled:hover:scale-100"
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
              <div className="mt-4 glass-card p-4 rounded-xl border border-emerald-500/20">
                <p className="text-emerald-400 animate-pulse flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentStep}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 glass-card p-4 rounded-xl border border-red-500/20">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Generated Content Card */}
        {generatedContent && (
          <div className="mt-8 glass-card rounded-2xl overflow-hidden">
            <div className="border-b border-[#1D3B32]/30 p-8">
              <h2 className="text-2xl font-semibold text-emerald-50">
                Generated Content
              </h2>
            </div>
            <div className="p-8">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <Button
                    onClick={handleDownloadScript}
                    variant="outline"
                    className="neo-input hover:bg-[#1D3B32] transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Script
                  </Button>
                  <Button
                    onClick={handleDownloadAudio}
                    variant="outline"
                    className="neo-input hover:bg-[#1D3B32] transition-colors"
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
                        <div className="rounded-xl overflow-hidden bg-black">
                          <VideoPlayer
                            audioUrl={videoUrl}
                            images={generatedContent.images}
                            script={generatedContent.script}
                            durationInFrames={Math.ceil(audioDuration * 30)}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
