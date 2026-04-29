"use client";

import { Layout, Plus } from "lucide-react";
import { CreateBoardDialog } from "./create-board-dialog";

export function CreateFirstBoard() {
  return (
    <div className="min-h-dvh bg-[#F9FAFB] text-slate-900">
      <main className="mx-auto flex min-h-dvh w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_30px_65px_-28px_rgba(15,23,42,0.35)] sm:p-12">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
            <Layout className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
            Ready to organize your workflow?
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Create your first board to start tracking tasks with your team.
          </p>

          <div className="mt-8">
            <CreateBoardDialog
              triggerLabel="Create Your First Board"
              triggerClassName="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-rose-500 px-7 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(244,63,94,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-[0_16px_30px_-12px_rgba(244,63,94,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 sm:h-13 sm:px-8 sm:text-base"
              triggerIcon={<Plus className="h-4 w-4" />}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

