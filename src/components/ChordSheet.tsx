import { segmentLine } from "@/lib/chords";
import { blockName, effectiveColumns } from "@/lib/viewer-settings";
import { simplifyText } from "@/lib/music-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SheetOptions {
  fontSize: number;
  centered: boolean;
  columns: number;
  transpose: number;
}

export function ChordSheet({ content, opts, highlights = [], marking = false, onHighlight, dividers = true, simplify = false, onChord }: {
  content: string; opts: SheetOptions; highlights?: number[]; marking?: boolean;
  onHighlight?: (line: number) => void; dividers?: boolean; simplify?: boolean; onChord?: (chord: string) => void;
}) {
  const mobile = useIsMobile();
  const columns = effectiveColumns(opts.columns, mobile, dividers, content);
  const chordTokens = (text: string) => text.split(/([A-G][#b]?(?:[^\s()[\]]|\([^)]*\))*(?:\/[A-G][#b]?)?)/).map((t, k) =>
    /^[A-G]/.test(t) && onChord
      ? <button key={k} type="button" className="font-bold text-chord underline-offset-2 hover:underline" onClick={() => onChord(t)}>{t}</button>
      : t);
  return (
    <div className={cn("chord-sheet min-w-0 max-w-full font-mono leading-snug text-sheet-foreground", opts.centered && "text-center")}
      style={{ fontSize: opts.fontSize, columnCount: columns }}>
      {content.split("\n").map((line, i) => {
        const name = blockName(line);
        const segs = segmentLine(name !== null ? `[${name}]` : line, opts.transpose);
        const section = segs.length === 1 && segs[0]?.kind === "section";
        const children = line ? segs.map((g, j) => {
          const text = g.kind === "chord" && simplify ? simplifyText(g.text) : g.text;
          return (
            <span key={j} className={cn(g.kind === "chord" && "font-bold text-chord", g.kind === "section" && "font-sans font-bold text-muted-foreground")}>
              {g.kind === "chord" && !marking ? chordTokens(text) : text}
            </span>
          );
        }) : " ";
        return <div key={i} data-sheet-line={i} className={cn("sheet-line whitespace-pre-wrap break-inside-avoid min-h-[1.3em]", section && "mt-2", name !== null && dividers && "block-divider", highlights.includes(i) && "bg-highlight")}>
          {marking && onHighlight ? <Button variant="ghost" className="h-auto min-w-0 max-w-full justify-start whitespace-pre-wrap rounded-none p-0 text-left font-mono text-inherit [font-size:inherit] [line-height:inherit]" aria-label={`Marcar linha ${i + 1}`} aria-pressed={highlights.includes(i)} onClick={() => onHighlight(i)}><span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{children}</span></Button> : children}
        </div>;
      })}
    </div>
  );
}
