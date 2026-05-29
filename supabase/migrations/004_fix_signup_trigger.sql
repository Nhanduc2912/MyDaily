-- =============================================
-- Migration 004: Fix signup trigger and enable extensions
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Ensure uuid extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate username from email or metadata
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  
  -- Fallback if empty
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  
  -- Truncate if too long
  IF length(base_username) > 20 THEN
    base_username := substring(base_username FROM 1 FOR 20);
  END IF;
  
  final_username := base_username;
  
  -- Ensure uniqueness with a max loop guard
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) AND counter < 1000 LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  -- Insert profile
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      final_username
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail signup
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate trigger (drop first to avoid conflict)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
