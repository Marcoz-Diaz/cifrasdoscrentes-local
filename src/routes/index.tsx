import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Cifras — Cifras para tocar e criar" },
      { name: "description", content: "Encontre e crie cifras com transposição, capotraste, rolagem por BPM e playlists." },
      { property: "og:title", content: "Cifras — Cifras para tocar e criar" },
      { property: "og:description", content: "Encontre e crie cifras com transposição, capotraste, rolagem por BPM e playlists." },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["public-songs", q],
    queryFn: async () => {
      let req = supabase.from("songs").select("id,title,artist,version_name,song_key").eq("published", true).order("created_at", { ascending: false }).limit(60);
      const t = q.trim().replace(/[%,()]/g, "");
      if (t) req = req.or(`title.ilike.%${t}%,artist.ilike.%${t}%`);
      const { data, error } = await req;
      if (error) throw error;
      return data;
    },
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-6xl">
        Toque, escreva e <span className="text-primary">publique</span> suas cifras.
      </h1>
      <div className="relative mt-8 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar música ou artista" className="h-12 pl-10" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {data?.length === 0 && <p className="text-muted-foreground">Nenhuma cifra publicada ainda.</p>}
        {data?.map((s) => (
          <Link key={s.id} to="/cifras/$id" params={{ id: s.id }} className="group rounded-lg border bg-card p-4 transition hover:border-primary hover:shadow-glow">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="font-semibold group-hover:text-primary">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.artist}</p>
              </div>
              <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-chord">{s.song_key}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.version_name}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
