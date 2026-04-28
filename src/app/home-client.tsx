"use client";

import { SignInButton } from "@clerk/nextjs";

export function HomeClient() {
  return (
    <div className="min-h-dvh bg-[#fafafa] text-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tighter">FlowState</h1>
          <p className="mt-2 text-sm text-slate-600">
            Team Kanban board powered by Supabase + Clerk.
          </p>

          <div className="mt-6">
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Sign in to dashboard
              </button>
            </SignInButton>
          </div>
        </div>
      </main>
    </div>
  );
}

