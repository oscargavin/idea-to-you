// src/App.tsx
import { AuthProvider, useAuth } from "./components/context/AuthContext";
import { AuthForm } from "./components/Auth/AuthForm";
import { ScriptGeneratorComponent } from "./components/ScriptGenerator";
import { ProfilePage } from "./components/Profile/ProfilePage";
import { supabase } from "./lib/supabase/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { User, Settings, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";

function Navbar() {
  const location = useLocation();
  useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path ? "bg-emerald-700/20" : "";
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="fixed top-0 w-full bg-[#132C25]/80 backdrop-blur-lg z-50 border-b border-emerald-600/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Brand/Home */}
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-emerald-50 
              hover:bg-emerald-700/20 active:bg-emerald-700/30 transition-colors ${isActive(
                "/"
              )}`}
          >
            <User size={20} />
            <span className="font-medium">Idea To You</span>
          </Link>

          {/* Right side - Navigation */}
          <div className="flex items-center">
            <Link
              to="/profile"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-emerald-50 
                hover:bg-emerald-700/20 active:bg-emerald-700/30 transition-colors ${isActive(
                  "/profile"
                )}`}
            >
              <Settings size={20} />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-2 ml-2 px-3 py-2 rounded-md 
                bg-emerald-600/20 text-emerald-50 hover:bg-emerald-600/30 
                active:bg-emerald-600/40 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sign Out"
            >
              {isSigningOut ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogOut size={20} />
              )}
              <span className="hidden sm:inline">
                {isSigningOut ? "Signing Out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B1512]">
      <Navbar />
      <div className="pt-16">{children}</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1512]">
        <div className="text-lg text-emerald-50">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1512]">
        <div className="text-lg text-emerald-50">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={!user ? <AuthForm /> : <Navigate to="/" replace />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ScriptGeneratorComponent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
