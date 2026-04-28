"use client";

import { CreateBoardDialog } from "./create-board-dialog";

export function CreateFirstBoard() {
  return (
    <div className="min-h-dvh bg-[#fafafa] text-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Create your first board</h1>
          <p className="mt-2 text-sm text-slate-600">
            Boards let your team keep separate projects organized.
          </p>
          <div className="mt-6">
            <CreateBoardDialog
              triggerLabel="Create Your First Board"
              triggerClassName="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

