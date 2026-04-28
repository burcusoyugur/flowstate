import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import type { Board, Column, Task } from "../../types";
import { BoardClient } from "../../board-client";
import { DashboardClient } from "../dashboard-client";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  unstable_noStore();
  const { userId } = await auth();
  if (!userId) redirect("/");
  const { boardId } = await params;

  const supabase = supabaseServer();

  const { data: boards, error: boardsError } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", userId);

  if (boardsError) {
    return (
      <div className="min-h-dvh bg-[#fafafa] text-slate-900">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold">FlowState</h1>
          <p className="mt-2 text-sm text-zinc-600">Couldn’t load boards from Supabase.</p>
          <pre className="mt-4 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-800">
            {boardsError.message}
          </pre>
        </main>
      </div>
    );
  }

  const boardsList = (boards ?? []) as Board[];
  if (!boardsList.find((b) => b.id === boardId)) {
    if (boardsList[0]?.id) redirect(`/dashboard/${boardsList[0].id}`);
    redirect("/dashboard");
  }

  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("*")
    .eq("board_id", boardId)
    .order("order", { ascending: true });

  // Fetch tasks by the board's column ids to avoid requiring tasks.board_id.
  const columnIds = (columns ?? []).map((c: any) => c.id).filter(Boolean);
  const tasksQuery = supabase
    .from("tasks")
    .select("*")
    .order("order", { ascending: true })
    .order("id", { ascending: true });
  const { data: tasks, error: tasksError } =
    columnIds.length > 0 ? await tasksQuery.in("column_id", columnIds) : { data: [], error: null };

  if (columnsError || tasksError) {
    return (
      <div className="min-h-dvh bg-[#fafafa] text-slate-900">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold">FlowState</h1>
          <p className="mt-2 text-sm text-zinc-600">Couldn’t load board data from Supabase.</p>
          <pre className="mt-4 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-800">
            {JSON.stringify(
              {
                columns: columnsError?.message ?? null,
                tasks: tasksError?.message ?? null,
              },
              null,
              2
            )}
          </pre>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#fafafa] text-slate-900">
      <main className="w-full px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
              <Zap className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter text-slate-800">FlowState</h1>
            <DashboardClient boards={boardsList} activeBoardId={boardId} />
          </div>
          <div className="flex items-center gap-3">
            <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
          </div>
        </div>
        <BoardClient
          boardId={boardId}
          initial={{
            columns: (columns ?? []) as Column[],
            tasks: (tasks ?? []) as Task[],
          }}
        />
      </main>
    </div>
  );
}

