// src/components/Profile/ProfilePage.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../components/context/AuthContext";
import { supabase } from "../../lib/supabase/client";
import { Eye, EyeOff, Key, Loader2, Save, User } from "lucide-react";

interface ApiKeys {
  openai_key: string | null;
  anthropic_key: string | null;
  elevenlabs_key: string | null;
  leonardo_key: string | null;
}

interface VisibilityState {
  [key: string]: boolean;
}

export function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai_key: "",
    anthropic_key: "",
    elevenlabs_key: "",
    leonardo_key: "",
  });
  const [visibility, setVisibility] = useState<VisibilityState>({
    openai_key: false,
    anthropic_key: false,
    elevenlabs_key: false,
    leonardo_key: false,
  });

  useEffect(() => {
    fetchApiKeys();
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);

      if (!user) throw new Error("No user");

      const { error } = await supabase.from("user_api_keys").upsert({
        user_id: user.id,
        ...apiKeys,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setMessage({ type: "success", text: "API keys updated successfully!" });
    } catch (error) {
      console.error("Error updating API keys:", error);
      setMessage({ type: "error", text: "Error updating API keys" });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (key: string) => {
    setVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen gradient-bg py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="glass-card rounded-2xl overflow-hidden mb-8">
          <div className="p-8 border-b border-[#1D3B32]/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                <Key className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-50">API Keys</h1>
                <p className="text-emerald-200/70 text-sm">
                  Manage your API keys for various services
                </p>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-600/10">
                <User className="h-5 w-5 text-emerald-400" />
                <span className="text-emerald-200/70 text-sm">
                  Signed in as {user.email}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {message && (
              <div
                className={`glass-card p-4 rounded-xl border ${
                  message.type === "success"
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/5 border-red-500/20 text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="grid gap-6">
              {Object.entries(apiKeys).map(([key, value]) => {
                if (
                  key === "user_id" ||
                  key === "id" ||
                  key === "created_at" ||
                  key === "updated_at"
                )
                  return null;
                return (
                  <div key={key} className="space-y-2">
                    <label
                      htmlFor={key}
                      className="block text-sm font-medium text-emerald-200/70"
                    >
                      {key
                        .split("_")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </label>
                    <div className="relative">
                      <input
                        type={visibility[key] ? "text" : "password"}
                        id={key}
                        value={value || ""}
                        onChange={(e) =>
                          setApiKeys((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="neo-input w-full rounded-xl h-12 pr-10 text-emerald-50 
                          placeholder:text-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder={`Enter your ${key.split("_")[0]} API key`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleVisibility(key)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 
                          text-emerald-200/70 hover:text-emerald-200 transition-colors"
                      >
                        {visibility[key] ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 
                hover:from-emerald-500 hover:to-emerald-400 text-white font-medium 
                rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:hover:scale-100
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save API Keys
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
