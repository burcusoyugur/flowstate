"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { createBoard } from "../actions";
import type { Board } from "../types";

export function CreateBoardDialog({
  triggerClassName,
  triggerLabel,
}: {
  triggerClassName?: string;
  triggerLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsCreating(true);
    try {
      const created = (await createBoard({ name: trimmed })) as Board;
      setOpen(false);
      setName("");
      router.push(`/dashboard/${created.id}`);
      router.refresh();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          }
        >
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">Create New Board</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-slate-600">
            Give your board a name to get started.
          </Dialog.Description>
          <div className="mt-4 space-y-3">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setName("");
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onCreate();
                }
              }}
              placeholder="Board name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  setName("");
                }}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                onClick={() => void onCreate()}
                disabled={isCreating || !name.trim()}
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
