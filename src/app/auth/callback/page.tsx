"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function completeSignIn() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/login?error_description=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      router.replace("/");
    }

    completeSignIn();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <p className="text-sm text-steel">Completing sign in...</p>
    </main>
  );
}
