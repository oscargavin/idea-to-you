// src/components/Profile/ProfilePage.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../components/context/AuthContext";
import { supabase } from "../../lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen bg-[#0B1512] py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-[#132C25]/90 backdrop-blur-xl shadow-2xl rounded-xl p-8">
          <h1 className="text-2xl font-bold text-emerald-50 mb-6">API Keys</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            {Object.entries(apiKeys).map(([key, value]) => {
              if (
                key === "user_id" ||
                key === "id" ||
                key === "created_at" ||
                key === "updated_at"
              )
                return null;
              return (
                <div key={key} className="space-y-1">
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
                      className="mt-1 block w-full rounded-md bg-[#0F231D] border-[#1D3B32] text-emerald-50 px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(key)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-emerald-200/70 hover:text-emerald-200 transition-colors"
                    >
                      {visibility[key] ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving..." : "Save API Keys"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
