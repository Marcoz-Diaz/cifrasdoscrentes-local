import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { USERNAME_RE, usernameToEmail } from "@/lib/auth";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Entrar — Cifras" },
      { name: "description", content: "Entre ou crie sua conta só com usuário e senha." },
      { property: "og:title", content: "Entrar — Cifras" },
      { property: "og:description", content: "Entre ou crie sua conta só com usuário e senha." },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent): Promise<unknown> {
    e.preventDefault();
    const username = user.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) return toast.error("Usuário: 3–30 caracteres (letras, números, _ . -)");
    if (pass.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    setBusy(true);
    const email = usernameToEmail(username);
    const { error } = mode === "up"
      ? await supabase.auth.signUp({ email, password: pass, options: { data: { username } } })
      : await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (error) {
      const msg = /already/i.test(error.message) ? "Esse usuário já existe" : /invalid/i.test(error.message) ? "Usuário ou senha incorretos" : error.message;
      return toast.error(msg);
    }
    navigate({ to: "/minhas", replace: true });
    return;
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-3xl font-bold">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Só usuário e senha. Sem e-mail.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><Label>Usuário</Label><Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" /></div>
        <div><Label>Senha</Label><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Cadastrar"}</Button>
      </form>
      <button className="mt-4 text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}
