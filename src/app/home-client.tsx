"use client";

import { SignInButton } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export function HomeClient() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-white via-rose-50/40 to-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.16),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
        <section className="w-full max-w-3xl rounded-3xl border border-white/70 bg-white/55 p-8 shadow-[0_20px_70px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-4 py-1.5 text-sm font-medium text-rose-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              <span>FlowState</span>
            </div>

            <h1 className="mt-7 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Unlock Your Flow State. Collaborate Faster.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              A focused workspace for modern teams to plan, ship, and stay
              aligned without the noise.
            </p>

            <div className="mt-9">
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-rose-500 px-8 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(244,63,94,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-[0_16px_30px_-12px_rgba(244,63,94,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 sm:h-14 sm:px-10 sm:text-base"
              >
                Sign in to dashboard
              </button>
            </SignInButton>
            </div>

            <div className="mt-10 border-t border-slate-200/70 pt-6 text-sm text-slate-500">
              Powered by{" "}
              <span className="font-medium text-slate-700">Next.js</span>,{" "}
              <span className="font-medium text-slate-700">Supabase</span>, and{" "}
              <span className="font-medium text-slate-700">Clerk</span>.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

