import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BatchImport } from "@/components/BatchImport";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/minhas")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Minhas cifras — Cifras" },
      { name: "description", content: "Suas cifras publicadas e rascunhos." },
      { property: "og:title", content: "Minhas cifras — Cifras" },
      { property: "og:description", content: "Suas cifras publicadas e rascunhos." },
    ],
  }),
  component: () => <RequireAuth>{(u) => <List userId={u.id} />}</RequireAuth>,
});

function List({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");

  const { data, refetch } = useQuery({
    queryKey: ["my-songs", userId],
    queryFn: async () =>
      (
        await supabase
          .from("songs")
          .select("id,title,artist,version_name,published")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
      ).data ?? [],
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.version_name && s.version_name.toLowerCase().includes(q)),
    );
  }, [data, search]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h1 className="min-w-0 text-2xl font-bold sm:text-3xl">Minhas cifras</h1>
        <BatchImport
          userId={userId}
          onSaved={() => {
            void refetch();
          }}
        />
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nas minhas cifras por título ou artista…"
          className="pl-9"
        />
      </div>

      {data?.length === 0 && (
        <p className="text-muted-foreground">
          Você ainda não criou cifras.{" "}
          <Link to="/cifras/nova" className="text-primary">
            Criar a primeira
          </Link>
        </p>
      )}

      {data && data.length > 0 && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma cifra encontrada para "{search}".</p>
      )}

      <div className="divide-y rounded-xl border">
        {filtered.map((s) => (
          <Link
            key={s.id}
            to="/cifras/$id"
            params={{ id: s.id }}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-4 hover:bg-card transition-colors"
          >
            <div className="min-w-0">
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-muted-foreground">
                {s.artist} · {s.version_name}
              </p>
            </div>
            <span className={`text-xs ${s.published ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {s.published ? "Publicada" : "Rascunho"}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
