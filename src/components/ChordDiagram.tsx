import { useEffect, useState } from "react";
import { chordShapes } from "@/lib/music-tools";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** SVG guitar diagram com suporte a múltiplas variações e navegação */
export function ChordDiagram({ chord }: { chord: string }) {
  const shapes = chordShapes(chord);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [chord]);

  if (!shapes || shapes.length === 0) {
    return <p className="text-sm text-muted-foreground">Desenho indisponível para {chord}.</p>;
  }

  const current = shapes[index] ?? shapes[0]!;
  const startFret = current.base > 1 ? current.base : 1;
  const barres = current.barres ?? [];
  const x = (s: number) => 20 + s * 20;
  const y = (f: number) => 30 + f * 24;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-full px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          title="Variação anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-chord">{current.name}</p>
          <span className="text-xs text-muted-foreground">
            Variação {index + 1} de {shapes.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={index >= shapes.length - 1}
          onClick={() => setIndex((i) => Math.min(shapes.length - 1, i + 1))}
          title="Próxima variação"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <svg
        viewBox="0 0 140 160"
        className="w-44 text-foreground"
        role="img"
        aria-label={`Acorde ${current.name} variação ${index + 1}`}
      >
        {startFret > 1 && (
          <text x="2" y={y(0.7)} fontSize="11" fill="currentColor">
            {startFret}ª
          </text>
        )}
        {startFret === 1 && <rect x={x(0)} y={y(0) - 3} width={100} height={4} fill="currentColor" />}
        {[0, 1, 2, 3, 4, 5].map((f) => (
          <line key={`f${f}`} x1={x(0)} x2={x(5)} y1={y(f)} y2={y(f)} stroke="currentColor" strokeOpacity={0.5} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((s) => (
          <line key={`s${s}`} x1={x(s)} x2={x(s)} y1={y(0)} y2={y(5)} stroke="currentColor" />
        ))}
        {barres.map((barre) => {
          const rel = barre.fret - startFret + 1;
          return <rect key={`barre-${barre.fret}-${barre.from}-${barre.to}`} x={x(barre.from) - 7} y={y(rel) - 19} width={x(barre.to) - x(barre.from) + 14} height={14} rx={7} className="fill-primary" aria-label={`Pestana na casa ${barre.fret}`} />;
        })}
        {current.frets.map((f, s) => {
          if (f === null) {
            return (
              <text key={s} x={x(s)} y={y(0) - 8} fontSize="11" textAnchor="middle" fill="currentColor">
                ×
              </text>
            );
          }
          const rel = f - startFret + 1;
          const coveredByBarre = barres.some((barre) => barre.fret === f && s >= barre.from && s <= barre.to);
          if (coveredByBarre) return null;
          if (f === 0 || rel <= 0) {
            return <circle key={s} cx={x(s)} cy={y(0) - 11} r={4} fill="none" stroke="currentColor" />;
          }
          return <circle key={s} cx={x(s)} cy={y(rel) - 12} r={7} className="fill-primary" />;
        })}
      </svg>
      {barres.length > 0 && <p className="text-xs text-muted-foreground">Pestana na casa {barres[0]!.fret} · cordas {barres[0]!.from + 1}–{barres[0]!.to + 1}</p>}
    </div>
  );
}
