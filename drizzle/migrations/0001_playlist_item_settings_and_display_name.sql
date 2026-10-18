ALTER TABLE public.playlist_items
  ADD COLUMN transpose integer NOT NULL DEFAULT 0,
  ADD COLUMN capo integer,
  ADD COLUMN tuning text,
  ADD COLUMN bpm integer,
  ADD COLUMN font_size integer,
  ADD COLUMN columns integer,
  ADD COLUMN centered boolean;
ALTER TABLE public.profiles ADD COLUMN display_name text;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE POLICY "profiles own update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);