import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Cifras" },
      { name: "description", content: "Escolha o nome que aparece no seu perfil." },
      { property: "og:title", content: "Meu perfil — Cifras" },
      { property: "og:description", content: "Escolha o nome que aparece no seu perfil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireAuth>{(u) => <Perfil user={u} />}</RequireAuth>,
});

function Perfil({ user }: { user: User }) {
  const { username, displayName } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setName(displayName); }, [displayName]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim().slice(0, 50);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: v || null }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    window.dispatchEvent(new Event("profile-updated"));
    toast.success("Nome salvo!");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold">Meu perfil</h1>
      <p className="mb-6 text-sm text-muted-foreground">Usuário de login: <span className="font-mono">{username}</span></p>
      <form onSubmit={save} className="space-y-3">
        <div>
          <Label htmlFor="dn">Nome no perfil</Label>
          <Input id="dn" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado" />
        </div>
        <Button type="submit" disabled={saving}>Salvar</Button>
      </form>
      <Button asChild variant="link" className="mt-6 px-0"><Link to="/minhas">Ver minhas cifras →</Link></Button>
    </main>
  );
}
