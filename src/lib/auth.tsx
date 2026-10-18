import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@cifras.app`;
}

export const USERNAME_RE = /^[a-z0-9_.-]{3,30}$/;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      setUser(d.session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    if (!user) { setDisplayName(""); return; }
    const load = () => supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data: p }) => setDisplayName(p?.display_name ?? ""));
    load();
    window.addEventListener("profile-updated", load);
    return () => window.removeEventListener("profile-updated", load);
  }, [user]);
  const username = (user?.user_metadata?.["username"] as string) ?? user?.email?.split("@")[0] ?? "";
  return { user, username, displayName: displayName || username, loading };
}
