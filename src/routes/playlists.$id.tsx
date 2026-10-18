import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  X,
  Trash2,
  Crown,
  UserPlus,
  Pencil,
  Check,
  Printer,
  Plus,
  Search,
  Music,
  Clock,
  WifiOff,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequireAuth } from "@/components/RequireAuth";
import { canRenamePlaylist } from "@/lib/viewer-settings";
import { transposeKey } from "@/lib/chords";
import { estimateMinutes } from "@/lib/music-tools";
import { supabase } from "@/integrations/supabase/client";
import { withOffline, must, saveOffline } from "@/lib/offline";

export const Route = createFileRoute("/playlists/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Playlist — Cifras" },
      { name: "description", content: "Sequência de cifras da sua playlist." },
      { property: "og:title", content: "Playlist — Cifras" },
      { property: "og:description", content: "Sequência de cifras da sua playlist." },
    ],
  }),
  component: () => <RequireAuth>{(u) => <Playlist userId={u.id} />}</RequireAuth>,
});

function Playlist({ userId }: { userId: string }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data, refetch } = useQuery({
    queryKey: ["playlist", id],
    queryFn: () =>
      withOffline(`playlist:${id}`, async () => {
        const p = await supabase.from("playlists").select("name,user_id").eq("id", id).single();
        if (p.error) throw new Error(p.error.message);
        const m = (await supabase.from("playlist_members").select("id,user_id").eq("playlist_id", id)).data ?? [];
        const ids = [p.data?.user_id ?? "", ...m.map((x) => x.user_id)];
        const profs = (await supabase.from("profiles").select("id,username,display_name").in("id", ids)).data ?? [];
        const nameOf = (uid: string) => {
          const f = profs.find((x) => x.id === uid);
          return f ? f.display_name || f.username : "?";
        };
        const full =
          must(await supabase.from("playlist_items").select("*, songs(*)").eq("playlist_id", id).order("position")) ??
          [];
        for (const row of full) {
          const { songs: song, ...itemRow } = row;
          saveOffline(`item:${row.id}`, itemRow);
          if (song) saveOffline(`song:${song.id}`, song);
        }
        saveOffline(
          `playlist-order:${id}`,
          full.map((row) => ({ id: row.id, song_id: row.song_id })),
        );
        const items = full.map((row) => ({
          id: row.id,
          position: row.position,
          transpose: row.transpose,
          songs: row.songs
            ? {
                id: row.songs.id,
                title: row.songs.title,
                artist: row.songs.artist,
                song_key: row.songs.song_key,
                bpm: row.songs.bpm,
                content: row.songs.content,
              }
            : null,
        }));
        return {
          name: p.data?.name ?? "",
          ownerId: p.data?.user_id ?? "",
          ownerName: nameOf(p.data?.user_id ?? ""),
          members: m.map((x) => ({ ...x, name: nameOf(x.user_id) })),
          items,
        };
      }),
  });

  // Busca músicas disponíveis para adicionar
  const { data: availableSongs } = useQuery({
    queryKey: ["songs-search-add", songSearch],
    queryFn: async () => {
      const q = songSearch.trim();
      let req = supabase.from("songs").select("id,title,artist,version_name,song_key").order("title").limit(25);
      if (q) {
        req = req.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
      }
      return (await req).data ?? [];
    },
    enabled: addOpen,
  });

  const existingSongIds = useMemo(() => {
    return new Set(data?.items.map((it) => it.songs?.id).filter(Boolean));
  }, [data?.items]);

  // Cálculo da duração estimada total da playlist
  const totalMinutes = useMemo(() => {
    if (!data?.items) return 0;
    return data.items.reduce((acc, it) => {
      if (!it.songs) return acc;
      return acc + estimateMinutes(it.songs.content || "", it.songs.bpm || 80);
    }, 0);
  }, [data?.items]);

  const formattedDuration = useMemo(() => {
    if (!totalMinutes) return null;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins} min`;
  }, [totalMinutes]);

  async function handleAddSong(songId: string, songTitle: string) {
    if (!data) return;
    setAddingId(songId);
    try {
      const nextPos = data.items.length;
      const { error } = await supabase.from("playlist_items").insert({
        playlist_id: id,
        song_id: songId,
        position: nextPos,
        transpose: 0,
        capo: 0,
        bpm: 80,
        font_size: 15,
        columns: 1,
        centered: false,
      });
      if (error) throw error;
      toast.success(`"${songTitle}" adicionada à playlist!`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar música");
    } finally {
      setAddingId(null);
    }
  }

  const isAdmin = data && canRenamePlaylist(data.ownerId, userId);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Apenas o criador pode renomear a playlist");
      return;
    }
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("playlists").update({ name: name.trim() }).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Playlist renomeada!");
      setRenaming(false);
      refetch();
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!data) return;
    const items = [...data.items];
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    if (!a || !b) return;

    await Promise.all([
      supabase.from("playlist_items").update({ position: b.position }).eq("id", a.id),
      supabase.from("playlist_items").update({ position: a.position }).eq("id", b.id),
    ]);
    refetch();
  }

  async function remove(itemId: string) {
    await supabase.from("playlist_items").delete().eq("id", itemId);
    refetch();
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!invite.trim()) return;
    const { data: p } = await supabase.from("profiles").select("id").ilike("username", invite.trim()).maybeSingle();
    if (!p) {
      toast.error("Usuário não encontrado");
      return;
    }
    const { error } = await supabase.from("playlist_members").insert({ playlist_id: id, user_id: p.id });
    if (error) toast.error("Não foi possível convidar (já está na playlist?)");
    else {
      toast.success("Convidado adicionado!");
      setInvite("");
      refetch();
    }
  }

  async function removeMember(mid: string, self: boolean) {
    if (!confirm(self ? "Sair desta playlist?" : "Remover este usuário?")) return;
    await supabase.from("playlist_members").delete().eq("id", mid);
    if (self) navigate({ to: "/playlists" });
    else refetch();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        {renaming ? (
          <form onSubmit={rename} className="flex min-w-0 gap-2">
            <Input
              aria-label="Nome da playlist"
              className="min-w-0"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
            <Button size="icon" aria-label="Salvar nome da playlist" disabled={saving || !name.trim()}>
              <Check />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Cancelar" onClick={() => setRenaming(false)}>
              <X />
            </Button>
          </form>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 text-3xl font-bold truncate">{data?.name}</h1>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Renomear playlist"
                  title="Renomear playlist"
                  onClick={() => {
                    setName(data?.name ?? "");
                    setRenaming(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Duração total e quantidade de músicas */}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
              <span>
                {data?.items.length ?? 0} {data?.items.length === 1 ? "música" : "músicas"}
              </span>
              {formattedDuration && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Duração estimada: ~{formattedDuration}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (confirm("Excluir playlist?")) {
                await supabase.from("playlists").delete().eq("id", id);
                navigate({ to: "/playlists" });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {data && (
        <section className="mb-6 border-y py-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Participantes</h2>
          <ul className="mb-3 space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" /> {data.ownerName}{" "}
              <span className="text-xs text-muted-foreground">administrador</span>
            </li>
            {data.members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="w-4" /> {m.name}
                {(isAdmin || m.user_id === userId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(m.id, m.user_id === userId)}
                  >
                    {m.user_id === userId ? "Sair" : "Remover"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <form onSubmit={addMember} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                placeholder="Nome de usuário para convidar"
              />
              <Button type="submit" size="sm">
                <UserPlus className="h-4 w-4" /> Convidar
              </Button>
            </form>
          )}
        </section>
      )}

      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar músicas
        </Button>

        {!!data?.items.length && (
          <Button variant="secondary" size="default" asChild>
            <Link to="/playlists/$id/imprimir" params={{ id }}>
              <Printer className="h-4 w-4 mr-1.5" /> Exportar PDF / Imprimir tudo
            </Link>
          </Button>
        )}
      </div>

      <p className="no-print mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <WifiOff className="h-3.5 w-3.5" /> Salva automaticamente no aparelho — abre mesmo sem internet.
      </p>

      {data?.items.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">Sua playlist ainda está vazia.</p>
          <Button onClick={() => setAddOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar a primeira música
          </Button>
        </div>
      )}

      <ol className="divide-y rounded-xl border">
        {data?.items.map(
          (it, i) =>
            it.songs && (
              <li key={it.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3">
                <Link
                  to="/cifras/$id"
                  params={{ id: it.songs.id }}
                  search={{ item: it.id }}
                  className="min-w-0 hover:text-primary transition-colors"
                >
                  <p className="font-semibold">
                    {i + 1}. {it.songs.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {it.songs.artist} · Tom {transposeKey(it.songs.song_key || "", it.transpose) || "-"}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center">
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Mover para cima"
                    disabled={i === 0}
                    variant="ghost"
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Mover para baixo"
                    disabled={i === (data?.items.length ?? 0) - 1}
                    variant="ghost"
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    aria-label="Remover da playlist"
                    variant="ghost"
                    onClick={() => remove(it.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ),
        )}
      </ol>

      {/* Janela de Adicionar Músicas */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar músicas à playlist</DialogTitle>
          </DialogHeader>

          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              placeholder="Buscar por título ou artista…"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y rounded-md border min-h-[220px] max-h-[360px]">
            {availableSongs?.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma música encontrada.</div>
            ) : (
              availableSongs?.map((s) => {
                const alreadyAdded = existingSongIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.artist} {s.song_key ? `· Tom ${s.song_key}` : ""}{" "}
                        {s.version_name ? `(${s.version_name})` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={alreadyAdded ? "secondary" : "default"}
                      disabled={alreadyAdded || addingId === s.id}
                      onClick={() => handleAddSong(s.id, s.title)}
                      className="shrink-0 h-8 text-xs gap-1"
                    >
                      {alreadyAdded ? (
                        <>
                          <Check className="h-3 w-3" /> Na lista
                        </>
                      ) : addingId === s.id ? (
                        "Adicionando…"
                      ) : (
                        <>
                          <Plus className="h-3 w-3" /> Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Concluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
