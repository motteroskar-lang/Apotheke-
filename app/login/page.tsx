"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-apex-bg flex flex-col items-center justify-center px-4">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-apex-blue rounded-md flex items-center justify-center">
            <span className="text-white font-mono font-bold text-sm">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-apex-text-primary">APEX OS</div>
            <div className="text-2xs text-apex-text-muted uppercase tracking-widest">
              Personal Operating System
            </div>
          </div>
        </div>

        {!sent ? (
          <>
            <div className="mb-6">
              <h1 className="text-base font-semibold text-apex-text-primary mb-1">
                Access your system
              </h1>
              <p className="text-xs text-apex-text-muted">
                Enter your email. We send a secure sign-in link — no password required.
              </p>
            </div>

            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <div className="relative">
                <Mail
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-apex-text-muted"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="apex-input pl-9"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-apex-red">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    Send access link
                    <ArrowRight size={13} />
                  </>
                )}
              </Button>
            </form>

            <p className="text-2xs text-apex-text-disabled mt-6 text-center">
              By signing in, you agree to operate with discipline.
            </p>
          </>
        ) : (
          <div className="border border-apex-border rounded-lg p-6">
            <div className="w-8 h-8 bg-apex-green/10 border border-apex-green/20 rounded-md flex items-center justify-center mb-4">
              <Mail size={14} className="text-apex-green" />
            </div>
            <h2 className="text-sm font-semibold text-apex-text-primary mb-1">
              Check your email
            </h2>
            <p className="text-xs text-apex-text-muted">
              Access link sent to{" "}
              <span className="text-apex-text-secondary font-mono">{email}</span>.
              Valid for 60 minutes.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-apex-text-muted hover:text-apex-text-secondary mt-4 block"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
