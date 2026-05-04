"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthPanelProps = {
  onAuthenticated?: () => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsSubmitting(true);
    const auth =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/`
            }
          });

    setIsSubmitting(false);

    if (auth.error) {
      setMessage(auth.error.message);
      return;
    }

    if (mode === "signup" && !auth.data.session) {
      setMessage("Account created. Check your email to confirm your account, then log in.");
      return;
    }

    onAuthenticated?.();
    router.replace("/");
    router.refresh();
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
        <form className="p-8 md:p-10" onSubmit={handleSubmit}>
          <div className="inline-grid grid-cols-2 rounded-md bg-slate-100 p-1 text-sm font-semibold">
            <button
              type="button"
              className={`rounded px-4 py-2 ${mode === "login" ? "bg-white text-ink shadow-sm" : "text-steel"}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded px-4 py-2 ${mode === "signup" ? "bg-white text-ink shadow-sm" : "text-steel"}`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          <h2 className="mt-8 text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-2 text-sm text-steel">Use your sales team email to access SteelLead AI.</p>

          <label className="mt-8 block text-sm font-medium">Email</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 px-3">
            <Mail size={18} className="text-steel" />
            <input
              className="focus-ring w-full border-0 py-3 outline-none"
              placeholder="sales@company.ae"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label className="mt-5 block text-sm font-medium">Password</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 px-3">
            <LockKeyhole size={18} className="text-steel" />
            <input
              className="focus-ring w-full border-0 py-3 outline-none"
              placeholder="At least 6 characters"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {message ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-steel">{message}</p> : null}

          <button
            className="focus-ring mt-8 flex w-full items-center justify-center rounded-md bg-alloy px-4 py-3 font-semibold text-white transition hover:bg-[#186879] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
          </button>

          <p className="mt-6 text-xs leading-5 text-steel">
            Compliance note: SteelLead AI supports manual entry, CSV import, and optional public-source enrichment only when permitted by source terms and local law.
          </p>
        </form>
      </section>
    </main>
  );
}
