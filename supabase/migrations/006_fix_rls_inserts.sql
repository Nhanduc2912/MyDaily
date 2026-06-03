-- =============================================
-- Migration 006: Fix RLS Insert Policies
-- =============================================

-- 1. DAILY PAGES policies refactoring
DROP POLICY IF EXISTS "pages_own" ON daily_pages;

CREATE POLICY "pages_own_select" ON daily_pages
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "pages_own_insert" ON daily_pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pages_own_update" ON daily_pages
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pages_own_delete" ON daily_pages
  FOR DELETE USING (auth.uid() = user_id);


-- 2. POSTS policies refactoring
DROP POLICY IF EXISTS "posts_own" ON posts;

CREATE POLICY "posts_own_select" ON posts
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "posts_own_insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_own_update" ON posts
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_own_delete" ON posts
  FOR DELETE USING (auth.uid() = user_id);


-- 3. TODOS policies refactoring
DROP POLICY IF EXISTS "todos_own" ON todos;

CREATE POLICY "todos_own_select" ON todos
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "todos_own_insert" ON todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "todos_own_update" ON todos
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "todos_own_delete" ON todos
  FOR DELETE USING (auth.uid() = user_id);


-- 4. NOTES policies refactoring
DROP POLICY IF EXISTS "notes_own" ON notes;

CREATE POLICY "notes_own_select" ON notes
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "notes_own_insert" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_own_update" ON notes
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_own_delete" ON notes
  FOR DELETE USING (auth.uid() = user_id);


-- 5. DAY PLANS policies refactoring
DROP POLICY IF EXISTS "day_plans_own" ON day_plans;

CREATE POLICY "day_plans_own_select" ON day_plans
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "day_plans_own_insert" ON day_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "day_plans_own_update" ON day_plans
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "day_plans_own_delete" ON day_plans
  FOR DELETE USING (auth.uid() = user_id);


-- 6. STORAGE OBJECTS policies refactoring (using split_part for robust folder validation)
DROP POLICY IF EXISTS "post_images_upload" ON storage.objects;
CREATE POLICY "post_images_upload" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images' 
    AND auth.uid() IS NOT NULL 
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_images_delete" ON storage.objects;
CREATE POLICY "post_images_delete" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'post-images' 
    AND auth.uid() IS NOT NULL 
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL 
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL 
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL 
    AND split_part(name, '/', 1) = auth.uid()::text
  );
