"use server";

import { revalidatePath, unstable_noStore } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { auth, currentUser } from "@clerk/nextjs/server";

type ColumnInsert = {
  board_id: string;
  title: string;
};

type TaskInsert = {
  column_id: string;
  content: string;
  description?: string | null;
  labels?: string[] | null;
  due_date?: string | null;
};

export async function createColumn(input: ColumnInsert) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();

  const { data: last, error: lastError } = await supabase
    .from("columns")
    .select("order")
    .eq("board_id", input.board_id)
    .order("order", { ascending: false, nullsFirst: false })
    .limit(1);
  if (lastError) throw new Error(lastError.message);

  const nextOrder = ((last?.[0]?.order as number | null) ?? 0) + 1000;

  const { data, error } = await supabase
    .from("columns")
    .insert({ board_id: input.board_id, title: input.title, order: nextOrder })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
  return data;
}

export async function createBoard(input: { name: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();
  const { data: board, error } = await supabase
    .from("boards")
    .insert({ name: input.name, user_id: userId })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { error: columnsError } = await supabase.from("columns").insert([
    { board_id: board.id, title: "To Do", order: 1000 },
    { board_id: board.id, title: "In Progress", order: 2000 },
    { board_id: board.id, title: "Done", order: 3000 },
  ]);
  if (columnsError) throw new Error(columnsError.message);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${board.id}`);
  revalidatePath("/");
  return board;
}

export async function renameColumn(columnId: string, title: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("columns")
    .update({ title })
    .eq("id", columnId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function deleteColumn(columnId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();
  const { error } = await supabase.from("columns").delete().eq("id", columnId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function createTask(input: TaskInsert) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await currentUser();

  const supabase = supabaseServer();

  const { data: last, error: lastError } = await supabase
    .from("tasks")
    .select("order")
    .eq("column_id", input.column_id)
    // Column name `order` conflicts with PostgREST's reserved `order=` query param.
    // Avoid filtering on it; instead sort with nulls last and take the first row.
    .order("order", { ascending: false, nullsFirst: false })
    .limit(1);
  if (lastError) throw new Error(lastError.message);

  const nextOrder = ((last?.[0]?.order as number | null) ?? 0) + 1000;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      column_id: input.column_id,
      content: input.content,
      description: input.description ?? null,
      labels: input.labels ?? [],
      due_date: input.due_date ?? null,
      order: nextOrder,
      created_by_user_id: userId,
      created_by_name:
        user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? null,
      created_by_image: user?.imageUrl ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
  return data;
}

export async function updateTask(
  taskId: string,
  updates: Partial<
    Pick<TaskInsert, "content" | "description" | "column_id" | "labels" | "due_date">
  > & {
    order?: number;
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();
  const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function persistColumnOrder(
  updates: Array<{ id: string; order: number }>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();
  // Avoid upsert here: ON CONFLICT still validates NOT NULL columns on the INSERT path.
  // We only want to update existing rows.
  const results = await Promise.all(
    updates.map((u) =>
      supabase.from("columns").update({ order: u.order }).eq("id", u.id)
    )
  );
  for (const r of results) {
    if (r.error) throw new Error(r.error.message);
  }
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function persistTaskPositions(
  updates: Array<{ id: string; column_id: string; order: number }>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = supabaseServer();
  const filtered = updates
    .filter((u) => Boolean(u.id) && Boolean(u.column_id))
    .map((u) => ({
      id: String(u.id),
      column_id: String(u.column_id),
      order: u.order,
    }));
  if (filtered.length === 0) {
    return { success: true as const, revalidatedAt: Date.now() };
  }

  // Upsert path requested by client flow. Since tasks.content is NOT NULL,
  // include existing content values to avoid INSERT-path constraint failures.
  const ids = filtered.map((u) => u.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("tasks")
    .select("id, content")
    .in("id", ids);
  if (existingError) throw new Error(existingError.message);

  const contentById = new Map<string, string>();
  for (const row of existingRows ?? []) {
    if (row?.id != null && row?.content != null) {
      contentById.set(String(row.id), String(row.content));
    }
  }

  const payload = filtered.map((u) => {
    const content = contentById.get(u.id);
    if (content == null) {
      throw new Error(`Task not found or missing content for id ${u.id}`);
    }
    return {
      id: u.id,
      content,
      column_id: u.column_id,
      order: u.order,
    };
  });

  const { data: writtenRows, error } = await supabase
    .from("tasks")
    .upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: false,
    })
    .select("id, column_id, order");
  if (error) {
    throw new Error(error.message);
  }
  // Give Supabase a brief moment to settle indexes/visibility before cache revalidation.
  await new Promise((resolve) => setTimeout(resolve, 300));
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  return {
    success: true as const,
    revalidatedAt: Date.now(),
    writtenCount: (writtenRows ?? []).length,
  };
}

export async function fetchBoardTasks(boardId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  unstable_noStore();

  const supabase = supabaseServer();
  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id")
    .eq("board_id", boardId)
    .order("order", { ascending: true });
  if (columnsError) throw new Error(columnsError.message);

  const columnIds = (columns ?? []).map((c: any) => c.id).filter(Boolean);
  if (columnIds.length === 0) return [];

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .in("column_id", columnIds)
    .order("order", { ascending: true });
  if (tasksError) throw new Error(tasksError.message);
  return tasks ?? [];
}

