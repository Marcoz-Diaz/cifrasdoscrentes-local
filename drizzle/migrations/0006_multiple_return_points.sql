ALTER TABLE public.songs ADD COLUMN return_points jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.playlist_items ADD COLUMN return_points jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.songs.return_line IS 'DEPRECATED: replaced by return_points';
COMMENT ON COLUMN public.playlist_items.return_line IS 'DEPRECATED: replaced by return_points';