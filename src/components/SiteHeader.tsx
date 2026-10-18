import { Link, useNavigate } from "@tanstack/react-router";
import { Mic2, Music2, Plus, ListMusic, LogOut, User, Menu, Library, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InstallButton } from "@/components/InstallButton";

export function SiteHeader() {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { const saved = localStorage.getItem("cifras-theme"); const value = saved ? saved === "dark" : media.matches; document.documentElement.dataset['theme'] = value ? "dark" : "light"; setDark(value); };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  const toggleTheme = () => { const value = !dark; localStorage.setItem("cifras-theme", value ? "dark" : "light"); document.documentElement.dataset['theme'] = value ? "dark" : "light"; setDark(value); };
  return (
    <header className="site-header no-print sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-display text-xl font-bold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Music2 className="h-4 w-4" /></span><span className="truncate">Cifras</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <InstallButton />
          <Button size="icon" variant="ghost" aria-label="Alternar tema" title="Alternar tema" onClick={toggleTheme}>{dark ? <Sun /> : <Moon />}</Button>
          {user ? <Button asChild size="icon" title="Nova cifra"><Link to="/cifras/nova" aria-label="Nova cifra"><Plus /></Link></Button> : <Button asChild size="sm"><Link to="/entrar">Entrar</Link></Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Menu" title="Menu"><Menu /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
              <DropdownMenuItem asChild><Link to="/artistas"><Mic2 />Artistas</Link></DropdownMenuItem>
              {user && <>
                <DropdownMenuItem asChild><Link to="/minhas"><Library />Minhas cifras</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/playlists"><ListMusic />Playlists</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/perfil"><User /><span className="max-w-48 truncate">{displayName}</span></Link></DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }}><LogOut />Sair</DropdownMenuItem>
              </>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
