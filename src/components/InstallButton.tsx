import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallButton() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) setInstalled(true);
    const on = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    const done = () => { setEvt(null); setInstalled(true); };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", on);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (evt) {
      await evt.prompt();
      await evt.userChoice;
      setEvt(null);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" title="Instalar app" onClick={install}>
        <Download className="h-4 w-4" /><span className="hidden sm:inline">Instalar app</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar o app Cifras</DialogTitle>
            <DialogDescription>
              Para instalar no seu celular Android pelo Chrome:
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Toque no menu <strong>⋮</strong> no canto superior direito do navegador.</li>
            <li>Toque em <strong>"Instalar app"</strong> (ou "Adicionar à tela inicial").</li>
            <li>Confirme. O app Cifras aparece na sua lista de aplicativos.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Dica: se a opção não aparecer, abra este site diretamente no Chrome do celular.
          </p>
          <Button onClick={() => setOpen(false)}>Entendi</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
