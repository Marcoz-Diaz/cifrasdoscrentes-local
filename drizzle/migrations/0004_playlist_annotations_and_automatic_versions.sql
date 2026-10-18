ALTER TABLE public.playlist_items ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.playlist_items ADD COLUMN IF NOT EXISTS block_dividers boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.assign_song_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_id uuid;
BEGIN
 IF TG_OP = 'UPDATE' AND lower(trim(NEW.title)) = lower(trim(OLD.title)) AND lower(trim(NEW.artist)) = lower(trim(OLD.artist)) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(lower(trim(NEW.title)) || chr(31) || lower(trim(NEW.artist)), 0));
 SELECT s.id INTO first_id FROM public.songs s WHERE lower(trim(s.title)) = lower(trim(NEW.title)) AND lower(trim(s.artist)) = lower(trim(NEW.artist)) AND s.id <> NEW.id ORDER BY s.created_at, s.id LIMIT 1;
 IF first_id IS NOT NULL THEN
  NEW.parent_id := first_id;
  IF NEW.version_name = 'Principal' THEN NEW.version_name := 'Versão'; END IF;
 ELSE NEW.parent_id := NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assign_song_version_before_write BEFORE INSERT OR UPDATE OF title, artist ON public.songs FOR EACH ROW EXECUTE FUNCTION public.assign_song_version();
REVOKE ALL ON FUNCTION public.assign_song_version() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.protect_playlist_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.user_id IS DISTINCT FROM OLD.user_id AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Não é permitido alterar o administrador da playlist'; END IF;
 IF NEW.name IS DISTINCT FROM OLD.name AND auth.uid() IS NOT NULL AND auth.uid() <> OLD.user_id THEN RAISE EXCEPTION 'Somente o administrador pode renomear a playlist'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_playlist_identity_before_update BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.protect_playlist_identity();
REVOKE ALL ON FUNCTION public.protect_playlist_identity() FROM PUBLIC;