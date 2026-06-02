-- =============================================
-- Migration 005: Fix signup trigger, add buckets, profiles insert policy, and backfill profiles
-- =============================================

-- 1. Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('post-images', 'post-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Add profiles insert RLS policy (client fallback)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

GRANT INSERT ON profiles TO authenticated;

-- 3. Update the trigger function handle_new_user to correctly handle Google OAuth metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate username from email or metadata or fallback
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user'
  );
  
  -- Clean username
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  
  -- Fallback if empty after cleaning
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  
  -- Truncate to fit username column length limit
  IF length(base_username) > 20 THEN
    base_username := substring(base_username FROM 1 FOR 20);
  END IF;
  
  final_username := base_username;
  
  -- Ensure uniqueness with loop guard
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) AND counter < 100 LOOP
    counter := counter + 1;
    final_username := substring(base_username FROM 1 FOR 15) || counter::TEXT;
  END LOOP;

  -- Insert profile, fallback names from google (full_name, name, given_name)
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'given_name',
      final_username
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    username = COALESCE(profiles.username, EXCLUDED.username),
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail signup
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill profiles for all existing users in auth.users that do not have one
INSERT INTO profiles (id, username, display_name, avatar_url)
SELECT 
  id,
  COALESCE(
    substring(regexp_replace(lower(COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1))), '[^a-z0-9_]', '', 'g') from 1 for 15) || '_' || substring(id::text from 1 for 4),
    'user_' || substring(id::text from 1 for 8)
  ) as username,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', raw_user_meta_data->>'given_name', email, 'User') as display_name,
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture') as avatar_url
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up Storage RLS Policies for post-images and avatars
-- Allow users to insert their own files
DROP POLICY IF EXISTS "post_images_upload" ON storage.objects;
CREATE POLICY "post_images_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'post-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "post_images_read" ON storage.objects;
CREATE POLICY "post_images_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'post-images'
);

DROP POLICY IF EXISTS "post_images_delete" ON storage.objects;
CREATE POLICY "post_images_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'post-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'avatars'
);

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
);
