import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { withOffline, must } from "@/lib/offline";

export const Route = createFileRoute("/playlists/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Playlists — Cifras" },
      { name: "description", content: "Organize suas cifras em playlists para ensaios e shows." },
      { property: "og:title", content: "Playlists — Cifras" },
      { property: "og:description", content: "Organize suas cifras em playlists para ensaios e shows." },
    ],
  }),
  component: () => <RequireAuth>{(u) => <Playlists userId={u.id} />}</RequireAuth>,
});

function Playlists({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const { data, refetch } = useQuery({
    queryKey: ["playlists", userId],
    queryFn: () => withOffline(`playlists:${userId}`, async () => must(await supabase.from("playlists").select("id,name,user_id,playlist_items(count)").order("created_at", { ascending: false }))),
  });
  async function create(e: React.FormEvent): Promise<unknown> {
    e.preventDefault();
    const n = name.trim().slice(0, 80);
    if (!n) return;
    const { error } = await supabase.from("playlists").insert({ name: n, user_id: userId });
    if (error) return toast.error(error.message);
    setName(""); refetch();
    return;
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Playlists</h1>
      <form onSubmit={create} className="mb-6 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da playlist (ex: Culto domingo)" />
        <Button type="submit">Criar</Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((p) => (
          <Link key={p.id} to="/playlists/$id" params={{ id: p.id }} className="rounded-xl border bg-card p-4 hover:border-primary">
            <p className="font-semibold">{p.name}</p>
            {p.user_id !== userId && <p className="text-xs text-primary">Compartilhada com você</p>}
            <p className="text-sm text-muted-foreground">{(p.playlist_items as { count: number }[])[0]?.count ?? 0} cifras</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
