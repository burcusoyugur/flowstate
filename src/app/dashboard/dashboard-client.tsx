"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Board } from "../types";
import { CreateBoardDialog } from "./create-board-dialog";
import { deleteBoard } from "../actions";
import Swal from "sweetalert2";

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
  const [isDeletingBoard, setIsDeletingBoard] = React.useState(false);

  const onDeleteBoard = async () => {
    const board = boards.find((b) => b.id === activeBoardId);
    if (!board || isDeletingBoard) return;

    const result = await Swal.fire({
      title: "Delete this board?",
      text: `This will permanently delete "${boardLabel(board)}" and its columns/tasks.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Board",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      background: "#ffffff",
      color: "#1a1a1a",
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl border border-slate-200 shadow-2xl",
        title: "text-slate-900 font-semibold tracking-tight",
        htmlContainer: "text-sm text-slate-600",
        confirmButton:
          "rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700",
        cancelButton:
          "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50",
      },
    });
    if (!result.isConfirmed) return;

    setIsDeletingBoard(true);
    try {
      await deleteBoard(activeBoardId);
      const nextBoard = boards.find((b) => b.id !== activeBoardId);
      if (nextBoard?.id) {
        router.replace(`/dashboard/${nextBoard.id}`);
      } else {
        router.replace("/dashboard");
      }
      router.refresh();
    } catch (error) {
      await Swal.fire({
        title: "Board could not be deleted",
        text: error instanceof Error ? error.message : "Please try again.",
        icon: "error",
        confirmButtonText: "OK",
        background: "#ffffff",
        color: "#1a1a1a",
        buttonsStyling: false,
        customClass: {
          popup: "rounded-2xl border border-slate-200 shadow-2xl",
          title: "text-slate-900 font-semibold tracking-tight",
          htmlContainer: "text-sm text-slate-600",
          confirmButton:
            "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800",
        },
      });
    } finally {
      setIsDeletingBoard(false);
    }
  };

  return (
    <div className="board-list flex items-center gap-3">
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
        triggerId="new-board-btn"
        triggerClassName="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
      />
      <button
        type="button"
        onClick={() => void onDeleteBoard()}
        disabled={isDeletingBoard || boards.length === 0}
        className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeletingBoard ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

