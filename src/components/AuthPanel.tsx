"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthPanelProps = {
  onAuthenticated?: () => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleLogin() {
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsSubmitting(true);
    const provider = "google";
    if (provider !== "google") {
      throw new Error("Only Google sign-in is allowed");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/`
      }
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    onAuthenticated?.();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-panel md:grid-cols-[1fr_0.9fr]">
        <div className="bg-ink p-8 text-white md:p-10">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-alloy">
              <Building2 size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">SteelLead AI</h1>
              <p className="text-sm text-slate-300">Dubai / UAE structural steel sales console</p>
            </div>
          </div>
          <div className="mt-16 max-w-md">
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Sales intelligence</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight">Find, score, and follow up with steel buyers.</h2>
            <p className="mt-5 text-slate-300">
              Sign up or log in to manage your private lead database, pipeline, reminders, and AI-generated outreach.
            </p>
          </div>
        </div>
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="mt-2 text-sm text-steel">Continue with Google to access SteelLead AI.</p>

          {message ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-steel">{message}</p> : null}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="focus-ring mt-8 flex w-full items-center justify-center rounded-md bg-alloy px-4 py-3 font-semibold text-white transition hover:bg-[#186879] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Redirecting..." : "Continue with Google"}
          </button>

          <p className="mt-6 text-xs leading-5 text-steel">
            Compliance note: SteelLead AI supports manual entry, CSV import, and optional public-source enrichment only when permitted by source terms and local law.
          </p>
        </div>
      </section>
    </main>
  );
}
