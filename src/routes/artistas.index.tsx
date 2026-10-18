import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/artistas/")({
  head: () => ({
    meta: [
      { title: "Artistas — Cifras" },
      { name: "description", content: "Encontre cifras por artista." },
      { property: "og:title", content: "Artistas — Cifras" },
      { property: "og:description", content: "Encontre cifras por artista." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Artistas,
});

function Artistas() {
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["artists"], queryFn: async () => (await supabase.from("artists").select("id,name,photo_url").order("name")).data ?? [] });
  const list = (data ?? []).filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">Artistas</h1>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar artista" className="mb-4" />
      {list.length === 0 && <p className="text-muted-foreground">Nenhum artista ainda. Eles aparecem aqui quando alguém cadastra uma cifra.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((a) => (
          <Link key={a.id} to="/artistas/$id" params={{ id: a.id }} className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 font-semibold hover:border-primary">
            <ArtistAvatar name={a.name} photo={a.photo_url} />
            <span className="min-w-0 truncate">{a.name}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
