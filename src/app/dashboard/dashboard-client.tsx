"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Board } from "../types";
import { CreateBoardDialog } from "./create-board-dialog";

function boardLabel(b: Board) {
  return b.name?.trim() || "Untitled board";
}

export function DashboardClient({
  boards,
  activeBoardId,
}: {
  boards: Board[];
  activeBoardId: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-slate-600">Board</label>
      <select
        className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-rose-400"
        value={activeBoardId}
        onChange={(e) => router.push(`/dashboard/${e.target.value}`)}
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {boardLabel(b)}
          </option>
        ))}
      </select>
      <CreateBoardDialog
        triggerLabel="+ New"
        triggerClassName="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
      />
    </div>
  );
}

