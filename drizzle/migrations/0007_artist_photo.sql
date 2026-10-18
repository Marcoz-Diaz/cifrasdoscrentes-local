ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS photo_url text;
REVOKE UPDATE ON public.artists FROM authenticated;
GRANT UPDATE (photo_url) ON public.artists TO authenticated;
CREATE POLICY "artists photo update" ON public.artists FOR UPDATE TO authenticated USING (true) WITH CHECK (true);