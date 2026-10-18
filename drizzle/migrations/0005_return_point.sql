ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS return_line integer;
ALTER TABLE public.playlist_items ADD COLUMN IF NOT EXISTS return_line integer;