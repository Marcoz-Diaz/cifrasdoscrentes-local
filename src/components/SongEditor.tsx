import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Undo2,
  Redo2,
  Eye,
  Pencil,
  FileText,
  Search,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Music,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChordSheet } from "@/components/ChordSheet";
import {
  detectKey,
  TUNINGS,
  KEY_NOTES,
  transposeKey,
  keyTransposeSteps,
  transposeText,
  relativeKey,
  convertToRelative,
} from "@/lib/chords";
import { sectionLines } from "@/lib/viewer-settings";
import { defaultOpts } from "@/components/SheetControls";
import { parseImportedFile } from "@/lib/import-file";
import { createHistory, record, undo, redo } from "@/lib/edit-history";
import { supabase } from "@/integrations/supabase/client";

export interface SongDraft {
  id?: string;
  parent_id?: string | null;
  artist_id?: string | null;
  title: string;
  artist: string;
  composer?: string;
  featuring?: string[];
  song_key: string;
  key_changes?: string;
  tuning: string;
  capo: number;
  bpm: number;
  content: string;
  version_name?: string;
  published: boolean;
  return_points?: number[];
}

export const emptySong: SongDraft = {
  title: "",
  artist: "",
  composer: "",
  featuring: [],
  song_key: "C",
  key_changes: "",
  tuning: "E A D G B E",
  capo: 0,
  bpm: 80,
  content: "",
  version_name: "Principal",
  published: true,
  return_points: [],
};

interface MedleySongItem {
  id: string;
  title: string;
  artist: string;
  song_key: string;
  content: string;
  featuring?: string[];
  target_key?: string;
}

function cleanSongTitle(title: string, artist: string): string {
  let cleaned = title.replace(/\s*-\s*cifra\s*club.*$/i, "").trim();
  if (artist) {
    const artistEscaped = artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`\\s*-\\s*${artistEscaped}.*$`, "i"), "").trim();
  }
  return cleaned;
}

export function SongEditor({ initial, userId }: { initial?: SongDraft; userId: string }) {
  const navigate = useNavigate();
  const [s, setS] = useState<SongDraft>(initial ?? emptySong);
  const [featText, setFeatText] = useState((initial?.featuring ?? []).join(", "));
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [keyAuto, setKeyAuto] = useState(false);
  const [history, setHistory] = useState(() => createHistory(initial?.content ?? ""));
  const [modulates, setModulates] = useState(Boolean(initial?.key_changes));

  // Modal de Medley
  const [medleyOpen, setMedleyOpen] = useState(false);
  const [medleySearch, setMedleySearch] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<MedleySongItem[]>([]);

  const set = <K extends keyof SongDraft>(k: K, v: SongDraft[K]) => setS((prev) => ({ ...prev, [k]: v }));

  function setContent(next: string) {
    set("content", next);
    setHistory((h) => record(h, next));
  }

  function handleUndo() {
    const next = undo(history);
    if (next) {
      setHistory(next);
      set("content", next.present);
    }
  }

  function handleRedo() {
    const next = redo(history);
    if (next) {
      setHistory(next);
      set("content", next.present);
    }
  }

  // Atalhos Ctrl+Z / Ctrl+Y
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history]);

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseImportedFile(file);
      setContent(res.content);
      if (res.title && !s.title) set("title", res.title);
      if (res.artist && !s.artist) set("artist", res.artist);
      if (res.key) {
        set("song_key", res.key);
        setKeyAuto(true);
      }
      toast.success(`Arquivo importado: ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar arquivo");
    } finally {
      e.target.value = "";
    }
  }

  function insertBlock() {
    const divider = "\n\n--- [Novo bloco] ---\n";
    setContent(s.content + divider);
    toast.info("Bloco inserido. Dê um nome entre os colchetes.");
  }

  // Busca do acervo para o Medley
  const { data: medleySearchResults } = useQuery({
    queryKey: ["medley-search", medleySearch],
    queryFn: async () => {
      const q = medleySearch.trim();
      let req = supabase.from("songs").select("id,title,artist,song_key,content,featuring").order("title").limit(20);
      if (q) {
        req = req.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
      }
      return (await req).data ?? [];
    },
    enabled: medleyOpen,
  });

  // Autocomplete de artistas
  const { data: artistsList } = useQuery({
    queryKey: ["artists-autocomplete"],
    queryFn: async () => {
      const { data } = await supabase.from("artists").select("name").order("name").limit(50);
      return data?.map((a) => a.name) ?? [];
    },
  });

  function addSongToMedley(song: MedleySongItem) {
    if (selectedSongs.some((x) => x.id === song.id)) {
      toast.info("Essa música já foi adicionada ao medley");
      return;
    }
    setSelectedSongs((prev) => [...prev, { ...song, target_key: song.song_key || "C" }]);
  }

  function removeSongFromMedley(index: number) {
    setSelectedSongs((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSong(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= selectedSongs.length) return;
    setSelectedSongs((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      const targetItem = copy[target];
      if (!temp || !targetItem) return prev;
      copy[index] = targetItem;
      copy[target] = temp;
      return copy;
    });
  }

  function applyMedley() {
    if (selectedSongs.length < 2) {
      toast.error("Selecione pelo menos 2 músicas para o medley");
      return;
    }

    const cleanTitles = selectedSongs.map((song) => cleanSongTitle(song.title, song.artist));
    const allArtists: string[] = [];
    for (const song of selectedSongs) {
      if (song.artist && !allArtists.includes(song.artist)) allArtists.push(song.artist);
      if (song.featuring) {
        for (const f of song.featuring) {
          if (f && !allArtists.includes(f)) allArtists.push(f);
        }
      }
    }

    const medleyTitle = `Medley: ${cleanTitles.join(" / ")}`;
    const medleyArtists = allArtists.join(" / ");

    const parts: string[] = [];
    const keyTransitions: string[] = [];

    selectedSongs.forEach((song, idx) => {
      const cleanT = cleanSongTitle(song.title, song.artist);
      const isFirst = idx === 0;
      const target = song.target_key || song.song_key || "C";
      const steps = song.song_key && target ? keyTransposeSteps(song.song_key, target.replace(/m$/, "")) : 0;
      const header = isFirst
        ? `--- [Parte 1: ${cleanT} (${song.artist}) - Tom ${target}] ---`
        : `--- [Transição: ${cleanT} (${song.artist}) - Tom ${target}] ---`;

      parts.push(header);
      parts.push(transposeText(song.content.trim(), steps));
      parts.push("");
      if (target && keyTransitions[keyTransitions.length - 1] !== target) keyTransitions.push(target);
    });

    const combinedContent = parts.join("\n\n");

    setS((prev) => ({
      ...prev,
      title: medleyTitle,
      artist: medleyArtists,
      version_name: "Medley",
      song_key: selectedSongs[0]?.target_key || selectedSongs[0]?.song_key || "C",
      key_changes: keyTransitions.length > 1 ? keyTransitions.join(" → ") : (prev.key_changes ?? ""),
      content: combinedContent,
    }));

    setFeatText("");
    if (keyTransitions.length > 1) setModulates(true);
    setMedleyOpen(false);
    toast.success("Medley montado no editor! Você pode ajustar a letra e os acordes livremente.");
  }

  async function linkArtist(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const { data: existing } = await supabase.from("artists").select("id").ilike("name", trimmed).maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created } = await supabase
      .from("artists")
      .insert({ name: trimmed, created_by: userId })
      .select("id")
      .maybeSingle();
    return created?.id ?? null;
  }

  async function save() {
    if (!s.title.trim() || !s.artist.trim()) {
      toast.error("Preencha título e artista");
      return;
    }
    setSaving(true);
    try {
      const cleanTitle = cleanSongTitle(s.title, s.artist);
      const primaryArtist = s.artist.split("/")[0]?.trim() || s.artist.trim();
      const artistId = await linkArtist(primaryArtist);

      const parsedFeat = featText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      for (const feat of parsedFeat) {
        await linkArtist(feat);
      }

      const payload = {
        title: cleanTitle,
        artist: s.artist.trim(),
        artist_id: artistId,
        composer: s.composer?.trim() || "",
        featuring: parsedFeat,
        song_key: s.song_key.trim() || "C",
        key_changes: modulates && s.key_changes?.trim() ? s.key_changes.trim() : "",
        tuning: s.tuning.trim() || "E A D G B E",
        capo: s.capo,
        bpm: s.bpm,
        content: s.content,
        version_name: s.version_name?.trim() || "Principal",
        published: s.published,
        user_id: userId,
        return_points: s.return_points ?? [],
      };

      if (s.id) {
        const { error } = await supabase.from("songs").update(payload).eq("id", s.id);
        if (error) throw error;
        toast.success("Cifra atualizada!");
        navigate({ to: "/cifras/$id", params: { id: s.id } });
      } else {
        const { data, error } = await supabase.from("songs").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("Cifra criada!");
        navigate({ to: "/cifras/$id", params: { id: data.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar cifra");
    } finally {
      setSaving(false);
    }
  }

  const sections = sectionLines(s.content);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{s.id ? "Editar cifra" : "Nova cifra"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save()} disabled={saving}>
            {s.published ? "Salvar rascunho" : "Salvar"}
          </Button>
          <Button
            onClick={() => {
              set("published", true);
              save();
            }}
            disabled={saving}
          >
            Publicar
          </Button>
        </div>
      </div>

      <div className="mb-4 flex border-b">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "edit" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          <Pencil className="h-4 w-4" /> Editar
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "preview" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          <Eye className="h-4 w-4" /> Pré-visualizar
        </button>
      </div>

      {tab === "edit" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Título</Label>
              <Input
                value={s.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ex: Porque Ele Vive"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Artista</Label>
              <Input
                list="artists"
                value={s.artist}
                onChange={(e) => set("artist", e.target.value)}
                placeholder="Ex: Harpa Cristã"
                maxLength={100}
              />
              <datalist id="artists">
                {artistsList?.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Compositor (opcional)</Label>
              <Input
                value={s.composer ?? ""}
                onChange={(e) => set("composer", e.target.value)}
                placeholder="Ex: Hananiel Eduardo"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Participações especiais (separadas por vírgula)</Label>
              <Input
                value={featText}
                onChange={(e) => setFeatText(e.target.value)}
                placeholder="Ex: Fernandinho, Morada"
                maxLength={120}
              />
            </div>
            <div>
              <Label>Nome da versão</Label>
              <Input
                value={s.version_name ?? ""}
                onChange={(e) => set("version_name", e.target.value)}
                placeholder="Principal, Acústico, Ao Vivo…"
                maxLength={40}
              />
            </div>
            <div>
              <Label>Tom</Label>
              <Input
                value={s.song_key}
                onChange={(e) => {
                  setKeyAuto(false);
                  set("song_key", e.target.value);
                }}
                maxLength={8}
              />
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {!keyAuto && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0 h-auto text-xs text-muted-foreground"
                    onClick={() => {
                      const detected = detectKey(s.content);
                      if (detected) {
                        set("song_key", detected);
                        setKeyAuto(true);
                        toast.success(`Tom detectado: ${detected}`);
                      } else {
                        toast.info("Não foi possível detectar o tom do texto.");
                      }
                    }}
                  >
                    Detectar automaticamente
                  </Button>
                )}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 h-auto text-xs"
                  onClick={() => {
                    const key = s.song_key || detectKey(s.content);
                    if (!key) {
                      toast.info("Defina o tom primeiro.");
                      return;
                    }
                    const rel = relativeKey(key);
                    setContent(convertToRelative(s.content, key));
                    set("song_key", rel);
                    toast.success(`Convertido para ${rel}`);
                  }}
                >
                  Trocar para {s.song_key ? relativeKey(s.song_key) : "relativo"} (maior ↔ menor)
                </Button>
              </div>
            </div>
            <div>
              <Label>Capotraste (casas)</Label>
              <Input
                type="number"
                min={0}
                max={12}
                value={s.capo}
                onChange={(e) => set("capo", Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div>
              <Label>BPM sugerido</Label>
              <Input
                type="number"
                min={0}
                max={260}
                value={s.bpm}
                onChange={(e) => set("bpm", Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0)}
              />
            </div>
            <div>
              <Label>Afinação das cordas</Label>
              <Input
                list="tunings"
                value={s.tuning}
                onChange={(e) => set("tuning", e.target.value)}
                placeholder="E A D G B E"
              />
              <datalist id="tunings">
                {TUNINGS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>A música sobe o tom?</Label>
                <p className="text-xs text-muted-foreground">Indique se a música modula ou troca de tom.</p>
              </div>
              <Switch
                checked={modulates}
                onCheckedChange={(c) => {
                  setModulates(c);
                  if (!c) set("key_changes", "");
                }}
              />
            </div>
            {modulates && (
              <div className="sm:col-span-2">
                <Label>Mudanças de tom (ex: C → D → E)</Label>
                <Input
                  value={s.key_changes ?? ""}
                  onChange={(e) => set("key_changes", e.target.value)}
                  placeholder="Ex: C → D"
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <Label>Letra e acordes</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs text-primary"
                  onClick={() => setMedleyOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Montar Medley
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted h-8">
                  <FileText className="h-3.5 w-3.5" /> Importar arquivo
                  <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileImport} className="hidden" />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={insertBlock} className="h-8 text-xs">
                  + Inserir bloco
                </Button>
                <div className="flex items-center border-l pl-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={history.past.length === 0}
                    className="h-8 w-8"
                    title="Desfazer (Ctrl+Z)"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRedo}
                    disabled={history.future.length === 0}
                    className="h-8 w-8"
                    title="Refazer (Ctrl+Y)"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <Textarea
              value={s.content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole ou digite a cifra aqui...&#10;Dica: use (G) para acordes inline e [Refrão] para seções."
              rows={22}
              className="font-mono text-sm leading-relaxed"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6">
          <ChordSheet
            content={s.content}
            opts={defaultOpts}
            dividers={false}
            simplify={false}
            marking={false}
            highlights={[]}
            onHighlight={() => {}}
          />
        </div>
      )}

      {/* Modal de Montar Medley */}
      <Dialog open={medleyOpen} onOpenChange={setMedleyOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Montar Medley (Pot-pourri)
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Selecione as músicas do seu repertório, defina a ordem e o tom de cada parte.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2 flex-1 min-h-[300px] overflow-hidden">
            {/* Coluna 1: Buscar */}
            <div className="flex flex-col border rounded-lg p-3 min-h-0">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={medleySearch}
                  onChange={(e) => setMedleySearch(e.target.value)}
                  placeholder="Pesquisar música…"
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {medleySearchResults?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma música encontrada</p>
                ) : (
                  medleySearchResults?.map((song) => {
                    const isAdded = selectedSongs.some((x) => x.id === song.id);
                    return (
                      <div key={song.id} className="py-2 flex items-center justify-between gap-1 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{song.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{song.artist}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : "outline"}
                          disabled={isAdded}
                          className="h-7 text-xs shrink-0"
                          onClick={() => addSongToMedley(song as MedleySongItem)}
                        >
                          {isAdded ? "Adicionado" : <Plus className="h-3 w-3 mr-0.5" />}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Coluna 2: Músicas Selecionadas */}
            <div className="flex flex-col border rounded-lg p-3 min-h-0 bg-muted/20">
              <p className="text-xs font-semibold mb-2 flex items-center justify-between">
                <span>Ordem do Medley ({selectedSongs.length})</span>
                {selectedSongs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSongs([])}
                    className="text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    Limpar
                  </button>
                )}
              </p>

              <div className="flex-1 overflow-y-auto divide-y">
                {selectedSongs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Adicione pelo menos 2 músicas ao lado.
                  </p>
                ) : (
                  selectedSongs.map((song, idx) => (
                    <div key={song.id} className="flex items-center justify-between gap-1 py-1.5 px-1">
                      <span className="text-xs font-bold text-muted-foreground mr-1">{idx + 1}º</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{cleanSongTitle(song.title, song.artist)}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        <select
                          aria-label="Tom no medley"
                          className="mt-1 h-7 rounded-md border bg-background px-1 text-xs"
                          value={song.target_key || song.song_key}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSelectedSongs((prev) => prev.map((x, i) => (i === idx ? { ...x, target_key: v } : x)));
                          }}
                        >
                          {KEY_NOTES.map((n) => {
                            const label = transposeKey(
                              song.song_key || "C",
                              keyTransposeSteps(song.song_key || "C", n),
                            );
                            return (
                              <option key={n} value={label}>
                                Tom {label}
                                {label === song.song_key ? " (original)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="flex gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveSong(idx, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={idx === selectedSongs.length - 1}
                          onClick={() => moveSong(idx, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeSongFromMedley(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setMedleyOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={applyMedley} disabled={selectedSongs.length < 2}>
              Unir no Editor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
