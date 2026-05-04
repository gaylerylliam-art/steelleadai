import Link from "next/link";
import { Building2, LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
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
              Built for sales teams handling beams, columns, plates, hollow sections, pipes, channels, and structural profiles across the Emirates.
            </p>
          </div>
        </div>
        <form className="p-8 md:p-10">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-steel">Connect Supabase Auth for production. Demo access opens the admin dashboard.</p>
          <label className="mt-8 block text-sm font-medium">Email</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 px-3">
            <Mail size={18} className="text-steel" />
            <input className="focus-ring w-full border-0 py-3 outline-none" placeholder="sales@company.ae" type="email" />
          </div>
          <label className="mt-5 block text-sm font-medium">Password</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 px-3">
            <LockKeyhole size={18} className="text-steel" />
            <input className="focus-ring w-full border-0 py-3 outline-none" placeholder="Password" type="password" />
          </div>
          <Link
            href="/"
            className="focus-ring mt-8 flex w-full items-center justify-center rounded-md bg-alloy px-4 py-3 font-semibold text-white transition hover:bg-[#186879]"
          >
            Open dashboard
          </Link>
          <p className="mt-6 text-xs leading-5 text-steel">
            Compliance note: SteelLead AI supports manual entry, CSV import, and optional public-source enrichment only when permitted by source terms and local law.
          </p>
        </form>
      </section>
    </main>
  );
}
