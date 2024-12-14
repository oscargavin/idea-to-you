// src/App.tsx
import { ScriptGeneratorComponent } from "./components/ScriptGenerator";

function App() {
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const leonardoKey = import.meta.env.VITE_LEONARDO_API_KEY;

  return (
    <div className="min-h-screen bg-[#0B1512]">
      {" "}
      {/* Deep forest green background */}
      <ScriptGeneratorComponent
        openaiKey={openaiKey}
        anthropicKey={anthropicKey}
        elevenLabsKey={elevenLabsKey}
        leonardoKey={leonardoKey}
      />
    </div>
  );
}

export default App;
