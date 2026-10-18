import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { lazy, Suspense } from "react";
import {
  Pause,
  Play,
  Printer,
  Pencil,
  GitBranch,
  ListPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Highlighter,
  Rows3,
  CornerLeftUp,
  Anchor,
  Hand,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Tv,
  X,
  ExternalLink,
  Music,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChordDiagram } from "@/components/ChordDiagram";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { tapTempo, neighbors } from "@/lib/music-tools";
const MusicToolsDialog = lazy(() => import("@/components/MusicToolsDialog").then((module) => ({ default: module.MusicToolsDialog })));
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChordSheet } from "@/components/ChordSheet";
import { transposeKey, KEY_NOTES, keyTransposeSteps, TUNINGS, relativeKey, convertToRelative } from "@/lib/chords";
import {
  blockName,
  effectiveColumns,
  readHighlights,
  toggleHighlight,
  sectionLines,
  readReturnPoints,
  toggleReturnPoint,
  resolveReturnPoints,
} from "@/lib/viewer-settings";
import { withOffline, must } from "@/lib/offline";
import { useIsMobile } from "@/hooks/use-mobile";
import { adjustBpm } from "@/lib/sheet-controls";
import { SheetControls, defaultOpts } from "@/components/SheetControls";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/cifras/$id")({
  validateSearch: (s: Record<string, unknown>): { item?: string | undefined } => ({
    item: typeof s["item"] === "string" ? (s["item"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cifra — Cifras" },
      { name: "description", content: "Veja e toque a cifra com transposição e rolagem automática." },
      { property: "og:title", content: "Cifra — Cifras" },
      { property: "og:description", content: "Veja e toque a cifra com transposição e rolagem automática." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SongView,
});

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match?.[1] ?? null;
}

function SongView() {
  const { id } = Route.useParams();
  const { item } = Route.useSearch();
  const [applied, setApplied] = useState("");
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = Route.useNavigate();
  const [opts, setOpts] = useState(defaultOpts);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [capo, setCapo] = useState(0);
  const [tuning, setTuning] = useState("");
  const [controlsOpen, setControlsOpen] = useState(true);
  const [highlights, setHighlights] = useState<number[]>([]);
  const [marking, setMarking] = useState(false);
  const [dividers, setDividers] = useState(true);
  const [returnPoints, setReturnPoints] = useState<number[]>([]);
  const mobile = useIsMobile();
  const [simplify, setSimplify] = useState(false);
  const [relative, setRelative] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  useEffect(() => { setNotes(localStorage.getItem(`cifras-notes:${id}`) ?? ""); }, [id]);
  const [chord, setChord] = useState<string | null>(null);

  // Novos recursos: Modo Palco e Player de Áudio
  const [stageMode, setStageMode] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(`cifras-audio:${id}`) || "";
    } catch {
      return "";
    }
  });

  const taps = useRef<number[]>([]);
  function tap() {
    taps.current = [...taps.current.slice(-7), performance.now()];
    const next = tapTempo(taps.current);
    if (next) setBpm(next);
  }

  const { data: song, isLoading } = useQuery({
    queryKey: ["song", id],
    queryFn: () =>
      withOffline(`song:${id}`, async () => must(await supabase.from("songs").select("*").eq("id", id).maybeSingle())),
  });
  const { data: itemData, isLoading: itemLoading } = useQuery({
    queryKey: ["playlist-item", item, id],
    enabled: !!item && !!user,
    queryFn: async () => {
      if (!item) return null;
      return withOffline(`item:${item}`, async () =>
        must(await supabase.from("playlist_items").select("*").eq("id", item).eq("song_id", id).maybeSingle()),
      );
    },
  });

  useEffect(() => {
    if (!song || applied === `${id}:${item ?? ""}`) return;
    if (item && (itemLoading || !user)) return;
    const it = item ? itemData : null;
    setBpm(it?.bpm ?? song.bpm);
    setCapo(it?.capo ?? song.capo ?? 0);
    setTuning(it?.tuning ?? song.tuning);
    setOpts({
      fontSize: it?.font_size ?? defaultOpts.fontSize,
      centered: it?.centered ?? defaultOpts.centered,
      columns: it?.columns ?? defaultOpts.columns,
      transpose: it?.transpose ?? 0,
    });
    setHighlights(readHighlights(it?.highlights));
    setDividers(it?.block_dividers ?? true);
    const pts = readReturnPoints(it?.return_points ?? song.return_points);
    const legacy = it?.return_line ?? song.return_line ?? null;
    setReturnPoints(pts.length > 0 ? pts : legacy != null ? [legacy] : []);
    setApplied(`${id}:${item ?? ""}`);
    document.title = `${song.title} — ${song.artist} | Cifras`;
  }, [song, id, item, itemData, itemLoading, user, applied]);

  // Salvar ajustes no item da playlist quando aberto por ela
  useEffect(() => {
    if (!item || applied !== `${id}:${item}` || !itemData) return;
    const t = setTimeout(() => {
      supabase
        .from("playlist_items")
        .update({
          transpose: opts.transpose,
          capo,
          tuning,
          bpm,
          font_size: opts.fontSize,
          columns: opts.columns,
          centered: opts.centered,
          highlights,
          block_dividers: dividers,
          return_points: returnPoints,
        })
        .eq("id", item)
        .eq("song_id", id)
        .select("*")
        .single()
        .then(({ data, error }) => {
          if (error) toast.error(error.message);
          else qc.setQueryData(["playlist-item", item, id], data);
        });
    }, 600);
    return () => clearTimeout(t);
  }, [id, item, applied, !!itemData, opts, capo, tuning, bpm, highlights, dividers, returnPoints, qc]);

  const { data: artistPhoto } = useQuery({
    queryKey: ["artist-photo", song?.artist_id],
    enabled: !!song?.artist_id,
    queryFn: () =>
      withOffline(
        `artist-photo:${song?.artist_id}`,
        async () =>
          must(
            await supabase
              .from("artists")
              .select("photo_url")
              .eq("id", song?.artist_id ?? "")
              .maybeSingle(),
          )?.photo_url ?? null,
      ),
  });
  const playlistId = itemData?.playlist_id;
  const { data: order } = useQuery({
    queryKey: ["playlist-order", playlistId],
    enabled: !!playlistId,
    queryFn: () =>
      withOffline(`playlist-order:${playlistId}`, async () =>
        must(
          await supabase
            .from("playlist_items")
            .select("id,song_id")
            .eq("playlist_id", playlistId ?? "")
            .order("position"),
        ),
      ),
  });
  const around = item && order ? neighbors(order, item) : { prev: null, next: null };

  useEffect(() => {
    setPlaying(false);
    window.scrollTo(0, 0);
  }, [id, item]);

  const rootId = song ? (song.parent_id ?? song.id) : null;
  const { data: versions } = useQuery({
    queryKey: ["versions", rootId],
    enabled: !!rootId,
    queryFn: async () =>
      (
        await supabase
          .from("songs")
          .select("id,version_name")
          .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
          .order("created_at")
      ).data ?? [],
  });
  const { data: playlists } = useQuery({
    queryKey: ["playlists", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("playlists").select("id,name").order("name")).data ?? [],
  });

  // Auto-rolagem por BPM
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let acc = 0;
    const lineH = opts.fontSize * 1.375;
    const step = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      acc += (bpm / 60 / 2) * lineH * dt;
      if (acc >= 1) {
        window.scrollBy(0, Math.floor(acc));
        acc -= Math.floor(acc);
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        setPlaying(false);
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, bpm, opts.fontSize]);

  // Wake Lock durante rolagem ou Modo Palco
  useEffect(() => {
    if ((!playing && !stageMode) || !("wakeLock" in navigator)) return;
    let stopped = false;
    let lock: WakeLockSentinel | undefined;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) await next.release();
        else lock = next;
      } catch {
        /* opcional em navegadores android restritos */
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      void lock?.release();
      document.removeEventListener("visibilitychange", acquire);
    };
  }, [playing, stageMode]);

  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Carregando…</p>;
  if (!song) return <p className="p-10 text-center">Cifra não encontrada.</p>;
  const mine = user?.id === song.user_id;
  const columns = effectiveColumns(opts.columns, mobile, dividers, song.content);
  const viewOpts = { ...opts, columns, transpose: opts.transpose - capo };
  const baseKey = relative && song.song_key ? relativeKey(song.song_key) : song.song_key || "";
  const relContent = relative && song.song_key ? convertToRelative(song.content, song.song_key) : song.content;
  const sheetContent = relContent;
  const currentKey = transposeKey(baseKey, opts.transpose);

  async function changeTuning(value: string) {
    setTuning(value);
    if (!mine || item) return;
    const { error } = await supabase.from("songs").update({ tuning: value }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["song", id] });
  }

  async function changeCapo(n: number) {
    setCapo(n);
    if (!mine || item) return;
    const { error } = await supabase.from("songs").update({ capo: n }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["song", id] });
  }

  async function addTo(pid: string) {
    const { error } = await supabase.from("playlist_items").insert({
      playlist_id: pid,
      song_id: id,
      position: Date.now() % 1e9,
      transpose: opts.transpose,
      capo,
      tuning,
      bpm,
      font_size: opts.fontSize,
      columns: opts.columns,
      centered: opts.centered,
      highlights,
      block_dividers: dividers,
      return_points: returnPoints,
    });
    error ? toast.error(error.message) : toast.success("Adicionada à playlist com o tom e ajustes atuais");
  }

  async function toggleReturn(n: number) {
    const next = toggleReturnPoint(returnPoints, n);
    setReturnPoints(next);
    if (!mine || item) return;
    const { error } = await supabase.from("songs").update({ return_points: next }).eq("id", id);
    if (error) toast.error(error.message);
  }

  const sections = sectionLines(song.content);
  const points = resolveReturnPoints(returnPoints, song.content);

  function goTo(line: number) {
    const el = document.querySelector(`[data-sheet-line="${line}"]`);
    const top = el ? el.getBoundingClientRect().top + window.scrollY - 140 : 0;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  async function remove() {
    if (!confirm("Excluir esta cifra?")) return;
    await supabase.from("songs").delete().eq("id", id);
    qc.invalidateQueries();
    nav({ to: "/minhas" });
  }

  function handleSaveAudio(url: string) {
    setAudioUrl(url);
    try {
      localStorage.setItem(`cifras-audio:${id}`, url);
      toast.success("Áudio salvo nesta cifra!");
    } catch {
      /* ignore */
    }
  }

  const youtubeId = extractYoutubeId(audioUrl);

  return (
    <main
      className={`mx-auto max-w-6xl px-4 py-6 transition-colors duration-200 ${
        stageMode ? "min-h-screen bg-black text-zinc-100 pb-36" : ""
      }`}
    >
      {/* Banner de aviso do Modo Palco no topo */}
      {stageMode && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-zinc-800 bg-black/95 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Modo Palco</span>
            <span className="text-xs text-zinc-400">· Tom {currentKey || "-"}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStageMode(false)}
            className="h-7 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <X className="mr-1 h-3.5 w-3.5" /> Sair do Palco
          </Button>
        </div>
      )}

      <div
        className={`mb-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 ${stageMode ? "mt-10" : ""}`}
      >
        <h1 className={`min-w-0 text-3xl font-extrabold sm:text-4xl ${stageMode ? "text-white" : ""}`}>{song.title}</h1>
        {!song.published && <span className="no-print rounded bg-secondary px-2 text-xs">rascunho</span>}
      </div>

      <p
        className={`flex min-w-0 flex-wrap items-center gap-2 text-lg ${stageMode ? "text-zinc-400" : "text-muted-foreground"}`}
      >
        {song.artist && <ArtistAvatar name={song.artist} photo={artistPhoto} />}
        {song.artist_id ? (
          <Link to="/artistas/$id" params={{ id: song.artist_id }} className="hover:text-primary">
            {song.artist}
          </Link>
        ) : (
          song.artist
        )}
        {song.featuring.length > 0 && <span className="text-base"> part. {song.featuring.join(", ")}</span>}
      </p>

      {song.composer && (
        <p className={`text-sm ${stageMode ? "text-zinc-400" : "text-muted-foreground"}`}>
          Composição: {song.composer}
        </p>
      )}
      {song.key_changes && (
        <p className="mt-1 inline-block rounded-full border border-primary/50 px-2 text-xs text-primary">
          Mais de um tom: {song.key_changes}
        </p>
      )}
      {item && itemData && (
        <p className="no-print mt-1 text-xs text-primary">Tocando pela playlist — suas alterações ficam salvas nela.</p>
      )}

      {/* Controles de tom, digitação, afinação e capo */}
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={stageMode ? "secondary" : "outline"}
              aria-label={`Tom: ${currentKey || "-"}`}
              className="h-auto gap-1 px-2 py-0.5 font-normal shadow-none"
            >
              <span className={stageMode ? "text-zinc-400" : "text-muted-foreground"}>Tom: </span>
              <span className="font-mono text-chord font-bold">{currentKey || "-"}</span>
              <ChevronDown className="opacity-60 print:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Tom</DropdownMenuLabel>
            {KEY_NOTES.map((note) => {
              const steps = keyTransposeSteps(baseKey || "C", note);
              const label = transposeKey(baseKey || "C", steps);
              return (
                <DropdownMenuItem
                  key={note}
                  onClick={() => setOpts({ ...opts, transpose: steps })}
                  className={label === currentKey ? "font-semibold text-primary" : ""}
                >
                  {label}
                </DropdownMenuItem>
              );
            })}
            {song.song_key && (
              <DropdownMenuItem onClick={() => setRelative(!relative)} className="border-t font-medium">
                {relative ? `Voltar ao original (${song.song_key})` : `Trocar para ${relativeKey(song.song_key)} (maior ↔ menor)`}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {capo > 0 && <Info k="Digitação" v={transposeKey(baseKey, viewOpts.transpose) || "-"} />}
        <TuningPicker value={tuning} onChange={changeTuning} />
        <CapoPicker value={capo} onChange={changeCapo} />
      </div>

      {versions && versions.length > 1 && (
        <div className="no-print mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Versões:</span>
          {versions.map((v) => (
            <Link
              key={v.id}
              to="/cifras/$id"
              params={{ id: v.id }}
              className={`rounded-full border px-3 py-0.5 ${v.id === id ? "border-primary text-primary" : ""}`}
            >
              {v.version_name}
            </Link>
          ))}
        </div>
      )}

      {/* BARRA DE AJUSTES STICKY */}
      {!stageMode && (
        <div className="no-print sticky top-14 z-20 -mx-4 mt-4 space-y-2 border-y bg-background/90 px-4 py-2 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            {controlsOpen ? (
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Ajustes</span>
            ) : (
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  Tom <span className="font-mono text-chord">{currentKey || "-"}</span>
                </span>
                <span>Fonte {opts.fontSize}</span>
                <span>Colunas {columns}</span>
                <span>BPM {bpm}</span>
              </span>
            )}
            <div className="flex shrink-0 items-center gap-1">
              {!controlsOpen && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={playing ? "Pausar rolagem" : "Iniciar rolagem"}
                  title={playing ? "Pausar rolagem" : "Iniciar rolagem"}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-expanded={controlsOpen}
                aria-label={controlsOpen ? "Recolher ajustes" : "Expandir ajustes"}
                title={controlsOpen ? "Recolher ajustes" : "Expandir ajustes"}
                onClick={() => setControlsOpen(!controlsOpen)}
              >
                {controlsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {controlsOpen && (
            <>
              <SheetControls
                opts={opts}
                setOpts={setOpts}
                columnsLocked={dividers && song.content.split("\n").some((line) => blockName(line) !== null)}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" onClick={() => setPlaying(!playing)} className="shadow-glow">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} Rolagem
                </Button>

                <div className="flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm">
                  <span className="text-xs text-muted-foreground">BPM</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Diminuir BPM"
                    title="Diminuir BPM"
                    onClick={() => setBpm((value) => adjustBpm(value, -1))}
                  >
                    <Minus />
                  </Button>
                  <Input
                    aria-label="BPM"
                    type="number"
                    value={bpm}
                    min={0}
                    max={300}
                    onChange={(e) => setBpm(adjustBpm(+e.target.value, 0))}
                    className="h-7 w-16 border-0 px-1 text-center tabular-nums"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Aumentar BPM"
                    title="Aumentar BPM"
                    disabled={bpm >= 300}
                    onClick={() => setBpm((value) => adjustBpm(value, 1))}
                  >
                    <Plus />
                  </Button>
                </div>

                <Button size="sm" variant="secondary" onClick={tap} title="Toque no ritmo para medir o BPM">
                  <Hand className="h-4 w-4" /> Tap
                </Button>

                <span
                  aria-hidden
                  className={playing ? "beat-dot h-3 w-3 rounded-full bg-primary" : "h-3 w-3 rounded-full bg-muted"}
                  style={{ ["--beat" as string]: `${60 / bpm}s` }}
                />

                <Button
                  size="sm"
                  variant={simplify ? "default" : "secondary"}
                  aria-pressed={simplify}
                  onClick={() => setSimplify(!simplify)}
                  title="Mostrar só acordes básicos"
                >
                  <Sparkles className="h-4 w-4" /> Simplificar
                </Button>
                <Button size="sm" variant={notesOpen ? "default" : "secondary"} onClick={() => setNotesOpen(!notesOpen)}>
                  Anotações
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setToolsOpen(true)}>
                  Ferramentas
                </Button>

                {/* BOTÃO MODO PALCO */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setStageMode(true)}
                  className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400"
                  title="Modo Palco: contraste máximo para tocar ao vivo no escuro"
                >
                  <Tv className="h-4 w-4" /> Palco
                </Button>

                {/* BOTÃO PLAYER DE ÁUDIO */}
                <Button
                  size="sm"
                  variant={audioOpen ? "default" : "secondary"}
                  onClick={() => setAudioOpen(!audioOpen)}
                  title="Ouvir a música ou colocar áudio/YouTube de apoio"
                >
                  <Headphones className="h-4 w-4" /> Áudio
                </Button>

                <Button
                  size="icon"
                  variant={marking ? "default" : "secondary"}
                  aria-label="Marca-texto"
                  aria-pressed={marking}
                  title="Marca-texto"
                  onClick={() => setMarking(!marking)}
                >
                  <Highlighter />
                </Button>

                <Button
                  size="icon"
                  variant={dividers ? "secondary" : "ghost"}
                  aria-label="Divisórias de blocos"
                  aria-pressed={dividers}
                  title="Divisórias de blocos"
                  onClick={() => setDividers(!dividers)}
                >
                  <Rows3 />
                </Button>

                <Button size="sm" variant="secondary" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>

                {user && (
                  <>
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/cifras/nova" search={{ from: id }}>
                        <GitBranch className="h-4 w-4" /> Criar versão
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="secondary">
                          <ListPlus className="h-4 w-4" /> Playlist
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Adicionar a…</DropdownMenuLabel>
                        {playlists?.map((p) => (
                          <DropdownMenuItem key={p.id} onClick={() => addTo(p.id)}>
                            {p.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem asChild>
                          <Link to="/playlists">+ Nova playlist</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                {mine && (
                  <>
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/editar/$id" params={{ id }}>
                        <Pencil className="h-4 w-4" /> Editar
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={remove}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* PAINEL DO PLAYER DE ÁUDIO EMBUTIDO */}
      {audioOpen && !stageMode && (
        <div className="no-print my-4 rounded-xl border bg-card p-4 shadow-md transition-all">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Player de Áudio & Vídeo</h3>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAudioOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {youtubeId ? (
            <div className="space-y-3">
              <div className="relative aspect-video w-full max-w-lg overflow-hidden rounded-lg bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0`}
                  title="Player da Música"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Vídeo do YouTube conectado à cifra</span>
                <Button size="sm" variant="ghost" onClick={() => handleSaveAudio("")}>
                  Trocar vídeo
                </Button>
              </div>
            </div>
          ) : audioUrl ? (
            <div className="space-y-3">
              <audio controls src={audioUrl} className="w-full" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Arquivo de áudio conectado</span>
                <Button size="sm" variant="ghost" onClick={() => handleSaveAudio("")}>
                  Trocar link
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Cole o link do YouTube ou de um áudio (MP3) para tocar junto com a música:
              </p>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem("url") as HTMLInputElement;
                  if (input.value.trim()) handleSaveAudio(input.value.trim());
                }}
              >
                <Input
                  name="url"
                  placeholder="https://www.youtube.com/watch?v=... ou link .mp3"
                  defaultValue={audioUrl}
                  className="flex-1"
                />
                <Button type="submit">Vincular</Button>
              </form>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    `${song.title} ${song.artist}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Buscar "{song.title} - {song.artist}" no YouTube
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {capo > 0 && (
        <p className={`no-print mt-3 text-xs ${stageMode ? "text-zinc-400" : "text-muted-foreground"}`}>
          Com o capotraste na {capo}ª casa, toque as posições abaixo — a música soa em{" "}
          {currentKey || "sem tom definido"}.
        </p>
      )}

      {/* ÁREA DA CIFRA COM ESTILO PARA PALCO */}
      <div
        className={`mt-6 pb-[60vh] print:pb-0 ${
          stageMode ? "[&_.text-chord]:text-amber-400 [&_.text-chord]:font-bold text-zinc-100" : ""
        }`}
      >
        {(notesOpen || notes) && (
          <div className="mb-4 rounded-md border border-dashed bg-muted/40 p-2 print:hidden">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Minhas anotações (só neste aparelho)</p>
            {notesOpen ? (
              <textarea
                className="w-full min-h-20 rounded-md border bg-background p-2 text-sm"
                placeholder="Ex.: Entrada só no piano; repetir ponte 2x"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); localStorage.setItem(`cifras-notes:${id}`, e.target.value); }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{notes}</p>
            )}
          </div>
        )}
        {toolsOpen && <Suspense fallback={<div className="sr-only" role="status">Carregando ferramentas…</div>}><MusicToolsDialog open={toolsOpen} onOpenChange={setToolsOpen} songKey={currentKey} bpm={bpm} /></Suspense>}
        <ChordSheet
          content={sheetContent}
          opts={viewOpts}
          dividers={dividers}
          simplify={simplify}
          onChord={setChord}
          marking={marking}
          highlights={highlights}
          onHighlight={(line) => setHighlights((current) => toggleHighlight(current, line))}
        />

        {/* PONTOS DE RETORNO */}
        <div className="no-print mt-8 flex flex-wrap items-center gap-2">
          {points.map((line, i) => (
            <div key={line} className="relative inline-flex items-center">
              <Button
                size="icon"
                onClick={() => goTo(line)}
                className={`relative shadow-glow ${stageMode ? "bg-amber-500 text-black hover:bg-amber-400" : ""}`}
                aria-label={`Voltar para o ponto ${i + 1}`}
                title={`Voltar para ${line === 0 ? "o início" : (sections.find((x) => x.line === line)?.name ?? "o início")}`}
              >
                <CornerLeftUp />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                  {i + 1}
                </span>
              </Button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleReturn(line);
                }}
                className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground shadow hover:scale-110"
                title="Excluir este ponto de retorno"
                aria-label={`Excluir ponto ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={stageMode ? "secondary" : "outline"}
                size="sm"
                aria-label="Adicionar ou remover pontos de retorno"
              >
                <Anchor /> Pontos de retorno
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Marcar ou desmarcar pontos…</DropdownMenuLabel>
              {!sections.some((x) => x.line === 0) && (
                <DropdownMenuItem
                  onClick={() => toggleReturn(0)}
                  className={returnPoints.includes(0) ? "font-semibold text-primary" : ""}
                >
                  {returnPoints.includes(0) ? "✓ Início da música (remover)" : "Início da música"}
                </DropdownMenuItem>
              )}
              {sections.map((x) => (
                <DropdownMenuItem
                  key={x.line}
                  onClick={() => toggleReturn(x.line)}
                  className={returnPoints.includes(x.line) ? "font-semibold text-primary" : ""}
                >
                  {returnPoints.includes(x.line) ? `✓ ${x.name} (remover)` : x.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* DIÁLOGO COM DESENHO DO ACORDE */}
      <Dialog open={!!chord} onOpenChange={(o) => !o && setChord(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Como tocar</DialogTitle>
          </DialogHeader>
          {chord && <ChordDiagram chord={chord} />}
        </DialogContent>
      </Dialog>

      {/* BARRA DE CONTROLE INFERIOR FIXA NO MODO PALCO */}
      {stageMode && (
        <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t border-zinc-800 bg-black/95 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setPlaying(!playing)}
              className="bg-amber-500 font-bold text-black hover:bg-amber-400"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pausar" : "Rolar"}
            </Button>
            <div className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-200">
              <span>BPM {bpm}</span>
              <button onClick={() => setBpm((b) => adjustBpm(b, -1))} className="px-1 text-zinc-400 hover:text-white">
                -
              </button>
              <button onClick={() => setBpm((b) => adjustBpm(b, 1))} className="px-1 text-zinc-400 hover:text-white">
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-zinc-300">
              <span>Fonte:</span>
              <button
                onClick={() => setOpts({ ...opts, fontSize: Math.max(12, opts.fontSize - 1) })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5"
              >
                A-
              </button>
              <button
                onClick={() => setOpts({ ...opts, fontSize: Math.min(32, opts.fontSize + 1) })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5"
              >
                A+
              </button>
            </div>
            {around.next && (
              <Button size="sm" variant="secondary" asChild>
                <Link to="/cifras/$id" params={{ id: around.next.song_id }} search={{ item: around.next.id }}>
                  Próxima <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </nav>
      )}

      {/* NAVEGAÇÃO PRÓXIMA / ANTERIOR NA PLAYLIST (MODO PADRÃO) */}
      {!stageMode && (around.prev || around.next) && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t bg-background/95 p-2 backdrop-blur">
          {around.prev ? (
            <Button variant="secondary" asChild>
              <Link to="/cifras/$id" params={{ id: around.prev.song_id }} search={{ item: around.prev.id }}>
                <ChevronLeft /> Anterior
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {around.next ? (
            <Button asChild>
              <Link to="/cifras/$id" params={{ id: around.next.song_id }} search={{ item: around.next.id }}>
                Próxima <ChevronRight />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <span className="rounded-md border px-2 py-0.5">
      <span className="text-muted-foreground">{k}: </span>
      <span className="font-mono text-chord">{v}</span>
    </span>
  );
}

function TuningPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const apply = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Afinação: ${value}`}
          className="h-auto max-w-full gap-1 px-2 py-0.5 font-normal shadow-none"
        >
          <span className="text-muted-foreground">Afinação: </span>
          <span className="truncate font-mono text-chord">{value}</span>
          <ChevronDown className="opacity-60 print:hidden" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] p-3">
        <div className="mb-2 text-sm font-semibold">Afinação</div>
        <div className="grid gap-1">
          {TUNINGS.map((item) => (
            <Button
              key={item}
              variant={item === value ? "secondary" : "ghost"}
              className="justify-start font-mono"
              onClick={() => apply(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) apply(draft.trim());
          }}
        >
          <Input
            aria-label="Afinação personalizada"
            value={draft}
            maxLength={40}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 font-mono"
          />
          <Button type="submit" disabled={!draft.trim()}>
            Aplicar
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function CapoPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-auto px-2 py-0.5 font-normal">
          <span className="text-muted-foreground">Capotraste: </span>
          <span className="font-mono text-chord">{value ? `${value}ª casa` : "Sem capo"}</span>
          <ChevronDown className="ml-1 inline h-3 w-3 opacity-60 print:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuLabel>Capotraste</DropdownMenuLabel>
        {Array.from({ length: 10 }, (_, n) => n).map((n) => (
          <DropdownMenuItem
            key={n}
            onClick={() => onChange(n)}
            className={n === value ? "font-semibold text-primary" : ""}
          >
            {n ? `${n}ª casa` : "Sem capo"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
