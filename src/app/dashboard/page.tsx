import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import type { Board } from "../types";
import { CreateFirstBoard } from "./empty-state";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardIndexPage() {
  unstable_noStore();
  const { userId } = await auth();
  if (!userId) redirect("/");
  const supabase = supabaseServer();

  const { data: boards, error } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", userId)
    .limit(1);
  if (error) {
    return (
      <div className="min-h-dvh bg-[#fafafa] text-slate-900">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold">FlowState</h1>
          <p className="mt-2 text-sm text-slate-600">Couldn’t load boards from Supabase.</p>
          <pre className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
            {error.message}
          </pre>
        </main>
      </div>
    );
  }

  const first = (boards?.[0] ?? null) as Board | null;
  if (first?.id) redirect(`/dashboard/${first.id}`);

  return <CreateFirstBoard />;
}

