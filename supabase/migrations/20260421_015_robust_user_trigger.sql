-- Migration 015 : Trigger handle_new_user robuste
-- Problème : sans exception handler, toute erreur dans le trigger
-- annule la transaction et bloque la création d'utilisateur (dashboard Supabase inclus).
-- Fix : ON CONFLICT DO NOTHING + EXCEPTION handler + support metadata OAuth (Google).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    )), ''),
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    )), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer la création d'utilisateur même si le profil échoue
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
