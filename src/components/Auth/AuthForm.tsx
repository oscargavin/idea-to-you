// src/components/Auth/AuthForm.tsx
import { useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { Mail, Lock, Loader2, LogIn, UserPlus } from "lucide-react";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error signing in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      alert("Check your email for the confirmation link!");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error signing up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="glass-card w-full max-w-md space-y-8 rounded-2xl p-8 animate-float">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600/10 mb-4">
            <div className="text-3xl">🎥</div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-emerald-50">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 to-emerald-400">
              Idea To You
            </span>
          </h2>
          <p className="text-emerald-200/70">
            Sign in to your account or create a new one
          </p>
        </div>

        <form className="mt-8 space-y-6">
          {error && (
            <div className="glass-card rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-emerald-200/70 mb-2"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-emerald-500/50" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neo-input w-full rounded-xl h-12 pl-10 text-emerald-50 
                    placeholder:text-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-emerald-200/70 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-emerald-500/50" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neo-input w-full rounded-xl h-12 pl-10 text-emerald-50 
                    placeholder:text-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              onClick={handleSignIn}
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 
                hover:from-emerald-500 hover:to-emerald-400 text-white font-medium 
                rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:hover:scale-100
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 h-12 neo-input hover:bg-[#1D3B32] text-emerald-50
                rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                disabled:opacity-50 disabled:hover:scale-100
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Sign Up
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
