import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function RequireAuth({ children }: { children: (user: User) => React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-10 text-center text-muted-foreground">Carregando…</p>;
  if (!user)
    return (
      <div className="p-16 text-center">
        <p className="mb-4 text-muted-foreground">Entre para continuar.</p>
        <Button asChild><Link to="/entrar">Entrar</Link></Button>
      </div>
    );
  return <>{children(user)}</>;
}
