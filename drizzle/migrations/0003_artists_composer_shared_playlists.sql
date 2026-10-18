CREATE TABLE public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX artists_name_lower_idx ON public.artists (lower(name));
GRANT SELECT ON public.artists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artists TO authenticated;
GRANT ALL ON public.artists TO service_role;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artists read" ON public.artists FOR SELECT USING (true);
CREATE POLICY "artists insert" ON public.artists FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "artists update" ON public.artists FOR UPDATE TO authenticated USING (auth.uid() = created_by);

ALTER TABLE public.songs ADD COLUMN composer text NOT NULL DEFAULT '';
ALTER TABLE public.songs ADD COLUMN artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL;
ALTER TABLE public.songs ADD COLUMN featuring text[] NOT NULL DEFAULT '{}';
CREATE INDEX songs_artist_id_idx ON public.songs(artist_id);
CREATE INDEX songs_featuring_idx ON public.songs USING gin(featuring);

CREATE TABLE public.playlist_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_members TO authenticated;
GRANT ALL ON public.playlist_members TO service_role;
ALTER TABLE public.playlist_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_playlist_owner(_pid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.playlists WHERE id = _pid AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.can_access_playlist(_pid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.playlists WHERE id = _pid AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.playlist_members WHERE playlist_id = _pid AND user_id = auth.uid())
$$;

CREATE POLICY "members read" ON public.playlist_members FOR SELECT TO authenticated USING (public.can_access_playlist(playlist_id));
CREATE POLICY "owner adds members" ON public.playlist_members FOR INSERT TO authenticated WITH CHECK (public.is_playlist_owner(playlist_id));
CREATE POLICY "owner or self removes" ON public.playlist_members FOR DELETE TO authenticated USING (public.is_playlist_owner(playlist_id) OR user_id = auth.uid());

CREATE POLICY "playlists members read" ON public.playlists FOR SELECT TO authenticated USING (public.can_access_playlist(id));
CREATE POLICY "items members" ON public.playlist_items FOR ALL TO authenticated USING (public.can_access_playlist(playlist_id)) WITH CHECK (public.can_access_playlist(playlist_id));