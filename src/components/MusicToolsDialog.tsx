import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Minus } from "lucide-react";
import { identifyChord, harmonicField, CIRCLE_OF_FIFTHS, detectPitch, noteFromFreq, CHORD_TYPES, CHORD_INTERVALS, spellChordNotes } from "@/lib/music-tools";

const STRINGS = ["E", "A", "D", "G", "B", "e"];

function ReverseFinder() {
  const [frets, setFrets] = useState<number[]>([-1, -1, -1, -1, -1, -1]);
  const name = identifyChord(frets);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Toque nas casas como está sua mão. "x" = corda abafada, "0" = solta.</p>
      <div className="overflow-x-auto">
        <table className="mx-auto text-xs">
          <tbody>
            {STRINGS.map((s, si) => (
              <tr key={s}>
                <td className="pr-2 font-mono font-bold">{s}</td>
                {[-1, 0, 1, 2, 3, 4, 5].map((f) => (
                  <td key={f}>
                    <button
                      type="button"
                      onClick={() => setFrets((p) => p.map((v, i) => (i === si ? f : v)))}
                      className={`m-0.5 h-8 w-8 rounded-md border text-xs ${frets[si] === f ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {f < 0 ? "x" : f}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-2xl font-bold text-chord font-mono">{name || "—"}</p>
      <Button variant="secondary" size="sm" className="w-full" onClick={() => setFrets([-1, -1, -1, -1, -1, -1])}>Limpar</Button>
    </div>
  );
}

function HarmonicField({ songKey }: { songKey: string }) {
  const [key, setKey] = useState(songKey || "C");
  const minor = key.endsWith("m");
  return (
    <div className="space-y-3">
      <div className="relative mx-auto h-56 w-56">
        {CIRCLE_OF_FIFTHS.map((n, i) => {
          const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
          const k = minor ? n + "m" : n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setKey(k)}
              style={{ left: `${50 + 42 * Math.cos(a)}%`, top: `${50 + 42 * Math.sin(a)}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full border text-xs font-bold ${key.replace(/m$/, "") === n ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {k}
            </button>
          );
        })}
        <button type="button" onClick={() => setKey(minor ? key.slice(0, -1) : key + "m")} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-xs">
          {minor ? "Menor" : "Maior"}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {harmonicField(key).map((x) => (
          <div key={x.degree} className="rounded-md border p-1">
            <p className="text-[10px] text-muted-foreground">{x.degree}</p>
            <p className="font-mono text-sm font-bold text-chord">{x.chord}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChordDictionary() {
  const [root, setRoot] = useState("C");
  const [group, setGroup] = useState("Todos");
  const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const groups = ["Todos", "Tríades", "Tétrades", "Extensões", "Alterados"];
  const category = (name: string) => {
    if (["", "m", "5", "sus2", "sus4", "dim", "aug"].includes(name)) return "Tríades";
    if (["6", "m6", "7", "7M", "maj7", "m7", "m7M", "dim7", "m7b5", "7sus2", "7sus4"].includes(name)) return "Tétrades";
    if (["7(b5)", "7(#5)", "7(b9)", "7(#9)", "7(#11)", "7(b13)"].includes(name)) return "Alterados";
    return "Extensões";
  };
  const visible = CHORD_TYPES.filter(([name]) => group === "Todos" || category(name) === group);
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground">Como se forma:</strong> a fórmula mostra a distância de cada nota em relação à tônica. A tríade maior, por exemplo, é 1–3–5; a menor troca a terça maior (3) pela terça menor (♭3).</p>
        <p className="mt-1">Acordes com 7ª acrescentam uma sétima; 9ª, 11ª e 13ª são extensões. Em acordes suspensos (sus2/sus4), a terça é substituída pela 2ª ou 4ª. As notas são grafadas pelo intervalo musical, não só por equivalência de semitons.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {roots.map((note) => <button key={note} type="button" onClick={() => setRoot(note)} className={`rounded-md border px-2.5 py-1 text-xs font-mono ${root === note ? "bg-primary text-primary-foreground" : "bg-background"}`}>{note}</button>)}
      </div>
      <div className="flex flex-wrap gap-1">
        {groups.map((item) => <button key={item} type="button" onClick={() => setGroup(item)} className={`rounded-full border px-2.5 py-1 text-[11px] ${group === item ? "bg-secondary font-semibold" : "text-muted-foreground"}`}>{item}</button>)}
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {visible.map(([quality, formula]) => {
          const name = root + quality;
          const spelledIntervals = CHORD_INTERVALS[quality] ?? [];
          const notes = spellChordNotes(root, quality);
          return <div key={quality} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div><p className="font-mono text-sm font-bold text-chord">{name || root}</p><p className="text-[10px] text-muted-foreground">{spelledIntervals.join(" · ")}</p></div>
            <p className="text-right text-xs font-mono">{notes.join(" · ")}</p>
          </div>;
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">O catálogo reúne {CHORD_TYPES.length} tipos de acordes. A fórmula descreve os intervalos; a ordem e as duplicações das notas podem mudar no instrumento. Inversões e desenhos específicos dependem da posição escolhida.</p>
    </div>
  );
}

function Tuner() {
  const [on, setOn] = useState(false);
  const [read, setRead] = useState<{ note: string; cents: number; hz: number } | null>(null);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 4096;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      let raf = 0;
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        const hz = detectPitch(buf, ctx.sampleRate);
        if (hz) setRead({ ...noteFromFreq(hz), hz: Math.round(hz) });
        raf = requestAnimationFrame(loop);
      };
      loop();
      stop.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); void ctx.close(); setOn(false); };
      setOn(true);
    } catch {
      setRead(null);
      alert("Permita o uso do microfone para afinar.");
    }
  }
  const ok = read && Math.abs(read.cents) <= 5;
  return (
    <div className="space-y-4 text-center">
      <p className={`text-5xl font-bold font-mono ${ok ? "text-primary" : ""}`}>{read?.note ?? "—"}</p>
      <div className="relative mx-auto h-3 w-64 rounded-full bg-muted">
        <div className="absolute top-0 h-3 w-1 rounded bg-primary transition-all" style={{ left: `${50 + (read?.cents ?? 0)}%` }} />
        <div className="absolute left-1/2 top-[-4px] h-5 w-px bg-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{read ? `${read.hz} Hz · ${read.cents > 0 ? "+" : ""}${read.cents} cents ${ok ? "· Afinado!" : read.cents < 0 ? "· Aperte" : "· Afrouxe"}` : "Toque uma corda"}</p>
      <Button onClick={() => (on ? stop.current() : void start())} className="w-full">{on ? "Parar afinador" : "Ligar afinador"}</Button>
    </div>
  );
}

function Drums({ bpm }: { bpm: number }) {
  const [on, setOn] = useState(false);
  const [tempo, setTempo] = useState(bpm || 80);
  const [beat, setBeat] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!on) return;
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    let step = 0;
    const hit = (type: "kick" | "snare" | "hat") => {
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.connect(ctx.destination);
      if (type === "kick") {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        g.gain.setValueAtTime(1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); o.start(t); o.stop(t + 0.2);
      } else {
        const len = type === "snare" ? 0.15 : 0.04;
        const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = b;
        const f = ctx.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = type === "snare" ? 1500 : 7000;
        g.gain.setValueAtTime(type === "snare" ? 0.6 : 0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + len);
        src.connect(f); f.connect(g); src.start(t);
      }
    };
    const id = setInterval(() => {
      const s = step % 8;
      hit("hat");
      if (s === 0 || s === 5) hit("kick");
      if (s === 2 || s === 6) hit("snare");
      setBeat(Math.floor(s / 2));
      step++;
    }, 60000 / tempo / 2);
    return () => clearInterval(id);
  }, [on, tempo]);
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-5 w-5 rounded-full ${on && beat === i ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setTempo((t) => Math.max(20, t - 5))}>−</Button>
        <span className="w-24 font-mono text-xl">{tempo} BPM</span>
        <Button size="sm" variant="secondary" onClick={() => setTempo((t) => Math.min(300, t + 5))}>+</Button>
      </div>
      <Button className="w-full" onClick={() => setOn(!on)}>{on ? "Parar bateria" : "Tocar bateria"}</Button>
    </div>
  );
}

export function MusicToolsDialog({ open, onOpenChange, songKey, bpm }: { open: boolean; onOpenChange: (v: boolean) => void; songKey: string; bpm: number }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg pt-14">
        <DialogHeader className="absolute inset-x-0 top-2 flex-row items-center justify-between px-4">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Minimizar ferramentas" title="Minimizar ferramentas">
            <Minus className="h-4 w-4" />
          </Button>
          <DialogTitle className="absolute left-1/2 -translate-x-1/2">Ferramentas</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="campo">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="campo" className="text-xs">Campo</TabsTrigger>
            <TabsTrigger value="acorde" className="text-xs">Qual acorde?</TabsTrigger>
            <TabsTrigger value="dicionario" className="text-xs">Acordes</TabsTrigger>
            <TabsTrigger value="afinador" className="text-xs">Afinador</TabsTrigger>
            <TabsTrigger value="bateria" className="text-xs">Bateria</TabsTrigger>
          </TabsList>
          <TabsContent value="campo"><HarmonicField songKey={songKey} /></TabsContent>
          <TabsContent value="acorde"><ReverseFinder /></TabsContent>
          <TabsContent value="dicionario"><ChordDictionary /></TabsContent>
          <TabsContent value="afinador">{open && <Tuner />}</TabsContent>
          <TabsContent value="bateria"><Drums bpm={bpm} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
