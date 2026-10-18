import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArtistAvatar, resizePhoto } from "@/components/ArtistAvatar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/artistas/$id")({
  head: () => ({
    meta: [
      { title: "Artista — Cifras" },
      { name: "description", content: "Cifras e participações especiais do artista." },
      { property: "og:title", content: "Artista — Cifras" },
      { property: "og:description", content: "Cifras e participações especiais do artista." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Artista,
});

function Artista() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["artist", id],
    queryFn: async () => {
      const a = (await supabase.from("artists").select("name,photo_url").eq("id", id).maybeSingle()).data;
      const own = (await supabase.from("songs").select("id,title,version_name,song_key").eq("artist_id", id).eq("published", true).order("title")).data ?? [];
      const feat = a ? (await supabase.from("songs").select("id,title,artist,version_name").contains("featuring", [a.name]).eq("published", true).order("title")).data ?? [] : [];
      return { name: a?.name ?? "", photo: a?.photo_url ?? null, own, feat };
    },
  });
  const { user } = useAuth();
  const qc = useQueryClient();
  async function upload(file?: File) {
    if (!file) return;
    try {
      const photo = await resizePhoto(file);
      const { error } = await supabase.from("artists").update({ photo_url: photo }).eq("id", id);
      if (error) throw error;
      toast.success("Foto do artista atualizada");
      qc.invalidateQueries({ queryKey: ["artist", id] });
      qc.invalidateQueries({ queryKey: ["artists"] });
      qc.invalidateQueries({ queryKey: ["artist-photo", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a foto");
    }
  }
  if (data && !data.name) return <p className="p-10 text-center">Artista não encontrado.</p>;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/artistas" className="text-sm text-muted-foreground hover:text-primary">← Artistas</Link>
      <div className="mb-6 mt-2 flex min-w-0 items-center gap-4">
        <ArtistAvatar name={data?.name ?? ""} photo={data?.photo} className="h-20 w-20 text-2xl" />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{data?.name}</h1>
          {user && (
            <Button size="sm" variant="secondary" className="mt-1" asChild>
              <label>
                <Camera className="h-4 w-4" /> {data?.photo ? "Trocar foto" : "Adicionar foto"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            </Button>
          )}
        </div>
      </div>
      <h2 className="mb-2 font-semibold">Cifras</h2>
      {data?.own.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma cifra publicada.</p>}
      <ul className="mb-8 divide-y rounded-xl border">
        {data?.own.map((s) => <li key={s.id}><Link to="/cifras/$id" params={{ id: s.id }} className="block p-3 hover:text-primary">{s.title} <span className="text-sm text-muted-foreground">· {s.version_name} · Tom {s.song_key || "-"}</span></Link></li>)}
      </ul>
      {!!data?.feat.length && (<>
        <h2 className="mb-2 font-semibold">Participações especiais</h2>
        <ul className="divide-y rounded-xl border">
          {data.feat.map((s) => <li key={s.id}><Link to="/cifras/$id" params={{ id: s.id }} className="block p-3 hover:text-primary">{s.title} <span className="text-sm text-muted-foreground">· {s.artist}</span></Link></li>)}
        </ul>
      </>)}
    </main>
  );
}
