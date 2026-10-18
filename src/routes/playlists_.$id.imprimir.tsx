import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChordSheet } from "@/components/ChordSheet";
import { RequireAuth } from "@/components/RequireAuth";
import { transposeKey } from "@/lib/chords";
import { withOffline, must } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/playlists_/$id/imprimir")({
  head: () => ({
    meta: [
      { title: "Imprimir playlist — Cifras" },
      { name: "description", content: "Todas as cifras da playlist em um só documento para imprimir ou salvar em PDF." },
      { property: "og:title", content: "Imprimir playlist — Cifras" },
      { property: "og:description", content: "Todas as cifras da playlist em um só documento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireAuth>{() => <PrintPlaylist />}</RequireAuth>,
});

function PrintPlaylist() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["playlist-print", id],
    queryFn: () =>
      withOffline(`playlist-print:${id}`, async () => {
        const p = must(await supabase.from("playlists").select("name").eq("id", id).maybeSingle());
        const items = must(await supabase.from("playlist_items").select("*, songs(*)").eq("playlist_id", id).order("position")) ?? [];
        return { name: p?.name ?? "", items };
      }),
  });
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="no-print mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <Link to="/playlists/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-primary">← Voltar à playlist</Link>
        <Button onClick={() => window.print()}><Printer /> Imprimir / Salvar PDF</Button>
      </div>
      <h1 className="mb-6 text-3xl font-bold">{data?.name}</h1>
      {data?.items.map((it, i) => it.songs && (
        <section key={it.id} className="playlist-print-song mb-10">
          <h2 className="text-2xl font-bold">{i + 1}. {it.songs.title}</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {it.songs.artist} · Tom {transposeKey(it.songs.song_key || "", it.transpose) || "-"}{it.capo ? ` · Capo ${it.capo}ª` : ""}
          </p>
          <ChordSheet
            content={it.songs.content}
            dividers={it.block_dividers}
            opts={{ fontSize: it.font_size ?? 14, centered: it.centered ?? false, columns: it.columns ?? 1, transpose: it.transpose - (it.capo ?? 0) }}
          />
        </section>
      ))}
    </main>
  );
}
