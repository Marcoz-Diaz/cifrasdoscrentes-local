import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { extractTextFromFile, IMPORT_ACCEPT } from "@/lib/import-file";
import { detectKey, detectKeySequence } from "@/lib/chords";
import { supabase } from "@/integrations/supabase/client";
import { emptySong } from "@/components/SongEditor";

type ImportRow = { id: number; title: string; artist: string; content: string; song_key: string; error: string; saved: boolean };
export function BatchImport({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const update = (id: number, change: Partial<ImportRow>) => setRows((current) => current.map((r) => r.id === id ? { ...r, ...change } : r));
  async function read(files: FileList | null) {
    if (!files?.length) return;
    setOpen(true); setReading(true); setRows([]);
    const next: ImportRow[] = [];
    for (const [id, file] of Array.from(files).entries()) {
      const parts = file.name.replace(/\.[^.]+$/, "").split(" - ");
      const row: ImportRow = { id, title: parts[0] ?? "", artist: parts.slice(1).join(" - "), content: "", song_key: "", error: "", saved: false };
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB");
        row.content = await extractTextFromFile(file);
        if (!row.content.trim()) throw new Error("Arquivo sem texto selecionável");
        row.song_key = detectKey(row.content);
      } catch (e) { row.error = e instanceof Error ? e.message : "Falha ao importar"; }
      next.push(row); setRows([...next]);
    }
    setReading(false); if (input.current) input.current.value = "";
  }
  async function save(published: boolean) {
    setBusy(true); let count = 0;
    for (const row of rows.filter((r) => !r.saved && r.content.trim() && r.title.trim())) {
      let artist_id: string | null = null;
      const artist = row.artist.trim();
      if (artist) {
        const all = await supabase.from("artists").select("id,name");
        artist_id = all.data?.find((a) => a.name.toLowerCase() === artist.toLowerCase())?.id ?? null;
        if (!artist_id) {
          const created = await supabase.from("artists").insert({ name: artist, created_by: userId }).select("id").single();
          artist_id = created.data?.id ?? null;
          if (created.error && !artist_id) {
            const retry = await supabase.from("artists").select("id,name");
            artist_id = retry.data?.find((a) => a.name.toLowerCase() === artist.toLowerCase())?.id ?? null;
          }
        }
      }
      const seq = detectKeySequence(row.content);
      const { error } = await supabase.from("songs").insert({ ...emptySong, title: row.title.trim(), artist, artist_id, content: row.content, song_key: row.song_key, key_changes: seq.length > 1 ? seq.join(" → ") : "", user_id: userId, published });
      if (error) update(row.id, { error: error.message });
      else { count++; update(row.id, { saved: true, error: "" }); }
    }
    setBusy(false); onSaved(); if (count) toast.success(`${count} cifra(s) salva(s)`);
  }
  const ready = rows.some((r) => !r.saved && r.content.trim() && r.title.trim());
  return <>
    <input ref={input} type="file" multiple accept={IMPORT_ACCEPT} className="hidden" aria-label="Arquivos de cifras" onChange={(e) => void read(e.target.files)} />
    <Button size="sm" variant="outline" onClick={() => input.current?.click()}><FileUp />Importar arquivos</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy && !reading) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Importar cifras em lote</DialogTitle><DialogDescription>Revise as músicas antes de salvar.</DialogDescription></DialogHeader>
        {reading && <p role="status">Lendo arquivos…</p>}
        <div className="divide-y">
          {rows.map((r) => <div key={r.id} className="min-w-0 space-y-2 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><p className="truncate font-semibold">{r.title}</p><Button variant="ghost" size="icon" disabled={busy || reading} aria-label={`Remover ${r.title}`} onClick={() => setRows((all) => all.filter((x) => x.id !== r.id))}><X /></Button></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input aria-label={`Título ${r.id + 1}`} value={r.title} disabled={r.saved || busy} onChange={(e) => update(r.id, { title: e.target.value })} maxLength={120} />
              <Input aria-label={`Artista ${r.id + 1}`} placeholder="Artista" value={r.artist} disabled={r.saved || busy} onChange={(e) => update(r.id, { artist: e.target.value })} maxLength={120} />
            </div>
            <Input aria-label={`Tom ${r.id + 1}`} value={r.song_key} disabled={r.saved || busy} placeholder="Tom" onChange={(e) => update(r.id, { song_key: e.target.value })} />
            <Textarea aria-label={`Cifra ${r.id + 1}`} className="min-h-32 font-mono" value={r.content} disabled={r.saved || busy} onChange={(e) => update(r.id, { content: e.target.value, song_key: detectKey(e.target.value), error: "" })} />
            {r.error && <p role="alert" className="text-sm text-destructive">{r.error}</p>}
            {r.saved && <p className="text-sm text-primary">Salva</p>}
          </div>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!ready || reading || busy} variant="secondary" onClick={() => void save(false)}>Salvar rascunhos</Button>
          <Button disabled={!ready || reading || busy} onClick={() => void save(true)}>{busy ? "Salvando…" : "Publicar cifras"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
