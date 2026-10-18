import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { SongEditor, emptySong, type SongDraft } from "@/components/SongEditor";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cifras/nova")({
  validateSearch: (s: Record<string, unknown>): { from?: string | undefined } => ({ from: typeof s["from"] === "string" ? (s["from"] as string) : undefined }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Nova cifra — Cifras" },
      { name: "description", content: "Escreva uma cifra com pré-visualização ao vivo." },
      { property: "og:title", content: "Nova cifra — Cifras" },
      { property: "og:description", content: "Escreva uma cifra com pré-visualização ao vivo." },
    ],
  }),
  component: Nova,
});

function Nova() {
  const { from } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["song-base", from],
    enabled: !!from,
    queryFn: async () => {
      const { data } = await supabase.from("songs").select("*").eq("id", from!).single();
      return data;
    },
  });
  return (
    <RequireAuth>
      {(user) => {
        if (from && isLoading) return <p className="p-10 text-center text-muted-foreground">Carregando…</p>;
        const initial: SongDraft = data
          ? { title: data.title, artist: data.artist, version_name: "Minha versão", parent_id: data.parent_id ?? data.id, content: data.content, song_key: data.song_key, tuning: data.tuning, capo: data.capo, bpm: data.bpm, published: false, composer: data.composer, featuring: data.featuring, key_changes: data.key_changes, artist_id: data.artist_id }
          : emptySong;
        return <SongEditor initial={initial} userId={user.id} />;
      }}
    </RequireAuth>
  );
}
