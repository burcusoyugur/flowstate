"use client";

import dynamic from "next/dynamic";
import type { Column, Task } from "./types";

const Board = dynamic(() => import("./board").then((m) => m.Board), { ssr: false });

export function BoardClient({
  initial,
  boardId,
}: {
  initial: { columns: Column[]; tasks: Task[] };
  boardId: string;
}) {
  return <Board initial={initial} boardId={boardId} />;
}

