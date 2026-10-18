import { AlignCenter, AlignLeft, Minus, Plus, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SheetOptions } from "./ChordSheet";

export const defaultOpts: SheetOptions = { fontSize: 15, centered: false, columns: 1, transpose: 0 };

export function SheetControls({ opts, setOpts, columnsLocked = false }: { opts: SheetOptions; setOpts: (o: SheetOptions) => void; columnsLocked?: boolean }) {
  const mobile = useIsMobile();
  const u = (p: Partial<SheetOptions>) => setOpts({ ...opts, ...p });
  return (
    <div className="no-print flex flex-wrap items-center gap-1.5 text-sm">
      <Group label="Tom">
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => u({ transpose: opts.transpose - 1 })}>−½</Button>
        <span className="w-8 text-center tabular-nums">{opts.transpose > 0 ? "+" : ""}{opts.transpose}</span>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => u({ transpose: opts.transpose + 1 })}>+½</Button>
      </Group>
      <Group label="Fonte">
        <Button size="icon" variant="secondary" className="h-8 w-8" aria-label="Diminuir fonte" onClick={() => u({ fontSize: Math.max(10, opts.fontSize - 1) })}><Minus className="h-3 w-3" /></Button>
        <span className="w-6 text-center tabular-nums">{opts.fontSize}</span>
        <Button size="icon" variant="secondary" className="h-8 w-8" aria-label="Aumentar fonte" onClick={() => u({ fontSize: Math.min(32, opts.fontSize + 1) })}><Plus className="h-3 w-3" /></Button>
      </Group>
      <Button size="sm" variant="secondary" className="h-8" onClick={() => u({ centered: !opts.centered })}>
        {opts.centered ? <AlignCenter className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}
        {opts.centered ? "Centralizado" : "À esquerda"}
      </Button>
      <Group label="Colunas">
        {[1, 2, 3].map((c) => (
          <Button key={c} size="icon" disabled={(columnsLocked && c !== 1) || (mobile && c === 3)} title={columnsLocked ? "Desligue as divisórias para usar colunas" : mobile && c === 3 ? "Até 2 colunas no celular" : `${c} colunas`} variant={(columnsLocked ? 1 : mobile ? Math.min(opts.columns, 2) : opts.columns) === c ? "default" : "secondary"} className="h-8 w-8" onClick={() => u({ columns: c })}>
            {c === 1 ? "1" : c === 2 ? <Columns2 className="h-4 w-4" /> : "3"}
          </Button>
        ))}
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border px-1.5 py-1">
      <span className="px-1 text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
