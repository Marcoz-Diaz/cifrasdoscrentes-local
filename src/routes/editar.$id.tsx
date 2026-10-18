import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { SongEditor } from "@/components/SongEditor";
import { supabase } from "@/integrations/supabase/client";
import { readReturnPoints } from "@/lib/viewer-settings";

export const Route = createFileRoute("/editar/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Editar cifra — Cifras" },
      { name: "description", content: "Edite sua cifra com pré-visualização." },
      { property: "og:title", content: "Editar cifra — Cifras" },
      { property: "og:description", content: "Edite sua cifra com pré-visualização." },
    ],
  }),
  component: Editar,
});

function Editar() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["song", id],
    queryFn: async () => (await supabase.from("songs").select("*").eq("id", id).single()).data,
  });
  return (
    <RequireAuth>
      {(user) => {
        if (isLoading) return <p className="p-10 text-center text-muted-foreground">Carregando…</p>;
        if (!data || data.user_id !== user.id) return <p className="p-10 text-center">Você não pode editar esta cifra.</p>;
        const { user_id: _u, created_at: _c, updated_at: _up, return_line: _rl, ...draft } = data;
        return <SongEditor initial={{ ...draft, return_points: readReturnPoints(draft.return_points) }} userId={user.id} />;
      }}
    </RequireAuth>
  );
}
