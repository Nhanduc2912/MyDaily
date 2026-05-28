-- =============================================
-- MyDaily - Database Schema Migration 001
-- Full initial schema with soft-delete & state
-- =============================================
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search
-- =============================================
-- 1. PROFILES (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  timezone        TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  locale          TEXT DEFAULT 'vi',
  streak_count    INT DEFAULT 0,
  longest_streak  INT DEFAULT 0,
  last_active_date DATE,
  role            TEXT DEFAULT 'user' CHECK (role IN ('user','admin','moderator')),
  state           TEXT DEFAULT 'active' CHECK (state IN ('active','suspended','banned','deactivated')),
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 2. PROFILE STATE LOGS (audit trail)
-- =============================================
CREATE TABLE profile_state_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_state   TEXT,
  new_state   TEXT NOT NULL,
  reason      TEXT,
  changed_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 3. USER DEVICES (push notifications)
-- =============================================
CREATE TABLE user_devices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_name     TEXT,
  push_token      TEXT,
  push_subscription JSONB,
  platform        TEXT DEFAULT 'web' CHECK (platform IN ('android','ios','web')),
  is_active       BOOLEAN DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 4. THEME TIME SLOTS
-- =============================================
CREATE TABLE theme_time_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  start_hour  INT NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour    INT NOT NULL CHECK (end_hour BETWEEN 0 AND 23),
  icon        TEXT,
  color_hex   TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 5. THEMES (admin-managed)
-- =============================================
CREATE TABLE themes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_slot_id    UUID REFERENCES theme_time_slots(id) ON DELETE SET NULL,
  name_vi         TEXT NOT NULL,
  name_en         TEXT,
  description     TEXT,
  icon            TEXT,
  color_hex       TEXT,
  tags            TEXT[],
  applicable_days INT[],        -- [1..7] Mon..Sun, NULL = all days
  valid_from      DATE,
  valid_to        DATE,
  state           TEXT DEFAULT 'active' CHECK (state IN ('active','draft','archived')),
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID REFERENCES profiles(id),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 6. DAILY PAGES (1 per user per day)
-- =============================================
CREATE TABLE daily_pages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page_date           DATE NOT NULL,
  summary_note        TEXT,
  plan_for_tomorrow   TEXT,
  mood                TEXT CHECK (mood IN ('happy','good','neutral','tired','sad')),
  weather             TEXT,
  share_link_token    TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  visibility          TEXT DEFAULT 'private' CHECK (visibility IN ('private','friends','public')),
  state               TEXT DEFAULT 'active' CHECK (state IN ('active','archived')),
  is_deleted          BOOLEAN DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, page_date)
);
-- =============================================
-- 7. POSTS (photos by time slot)
-- =============================================
CREATE TABLE posts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id             UUID NOT NULL REFERENCES daily_pages(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url           TEXT NOT NULL,
  image_path          TEXT,
  thumbnail_url       TEXT,
  taken_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_slot_id        UUID REFERENCES theme_time_slots(id) ON DELETE SET NULL,
  theme_id            UUID REFERENCES themes(id) ON DELETE SET NULL,
  custom_title        TEXT,
  caption             TEXT,
  location_name       TEXT,
  visibility          TEXT DEFAULT 'private' CHECK (visibility IN ('private','friends','public')),
  is_flagged          BOOLEAN DEFAULT FALSE,
  flag_count          INT DEFAULT 0,
  moderation_state    TEXT DEFAULT 'approved' CHECK (moderation_state IN ('pending','approved','rejected','removed')),
  moderated_by        UUID REFERENCES profiles(id),
  moderated_at        TIMESTAMPTZ,
  state               TEXT DEFAULT 'active' CHECK (state IN ('active','hidden','removed')),
  is_deleted          BOOLEAN DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 8. POST MODERATION LOGS
-- =============================================
CREATE TABLE post_moderation_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('approved','rejected','removed','warned','restored')),
  reason      TEXT,
  note        TEXT,
  actioned_by UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 9. TODOS
-- =============================================
CREATE TABLE todos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id     UUID NOT NULL REFERENCES daily_pages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_done     BOOLEAN DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  priority    TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  sort_order  INT DEFAULT 0,
  state       TEXT DEFAULT 'active' CHECK (state IN ('active','archived')),
  is_deleted  BOOLEAN DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 10. NOTES
-- =============================================
CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id     UUID NOT NULL REFERENCES daily_pages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  color_hex   TEXT DEFAULT '#FFFDE7',
  is_pinned   BOOLEAN DEFAULT FALSE,
  state       TEXT DEFAULT 'active' CHECK (state IN ('active','archived')),
  is_deleted  BOOLEAN DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 11. DAY PLANS (for tomorrow)
-- =============================================
CREATE TABLE day_plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_date    DATE NOT NULL,
  source_page  UUID REFERENCES daily_pages(id) ON DELETE SET NULL,
  content      TEXT NOT NULL,
  is_done      BOOLEAN DEFAULT FALSE,
  done_at      TIMESTAMPTZ,
  priority     TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  sort_order   INT DEFAULT 0,
  state        TEXT DEFAULT 'active' CHECK (state IN ('active','archived')),
  is_deleted   BOOLEAN DEFAULT FALSE,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 12. FRIENDSHIPS
-- =============================================
CREATE TABLE friendships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  state           TEXT DEFAULT 'pending' CHECK (state IN ('pending','accepted','declined','blocked')),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);
-- =============================================
-- 13. REACTIONS (emoji on posts)
-- =============================================
CREATE TABLE reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (emoji IN ('🔥','❤️','😄','💪','🌙','👏','✨')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);
-- =============================================
-- 14. POST REPORTS
-- =============================================
CREATE TABLE post_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL CHECK (reason IN ('nudity','spam','hate','violence','other')),
  description     TEXT,
  state           TEXT DEFAULT 'pending' CHECK (state IN ('pending','reviewed','dismissed','actioned')),
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);
-- =============================================
-- 15. STREAK LOGS
-- =============================================
CREATE TABLE streak_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,
  has_post        BOOLEAN DEFAULT FALSE,
  has_todo        BOOLEAN DEFAULT FALSE,
  todo_done_pct   NUMERIC(5,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);
-- =============================================
-- 16. BADGES
-- =============================================
CREATE TABLE badges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  name_vi         TEXT NOT NULL,
  name_en         TEXT,
  description_vi  TEXT,
  icon            TEXT,
  condition_type  TEXT NOT NULL,
  condition_value JSONB,
  rarity          TEXT DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  state           TEXT DEFAULT 'active' CHECK (state IN ('active','inactive')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 17. USER BADGES
-- =============================================
CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
-- =============================================
-- 18. MONTHLY STATS
-- =============================================
CREATE TABLE monthly_stats (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year_month          TEXT NOT NULL,  -- "2026-05"
  total_posts         INT DEFAULT 0,
  total_todos         INT DEFAULT 0,
  completed_todos     INT DEFAULT 0,
  active_days         INT DEFAULT 0,
  avg_post_hour       NUMERIC(4,2),
  most_used_theme_id  UUID REFERENCES themes(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);
-- =============================================
-- 19. NOTIFICATIONS
-- =============================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN (
    'reaction','friend_request','friend_accepted',
    'post_moderated','badge_earned','system','push_reminder'
  )),
  ref_type        TEXT CHECK (ref_type IN ('post','daily_page','badge','friendship')),
  ref_id          UUID,
  title           TEXT,
  body            TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  is_pushed       BOOLEAN DEFAULT FALSE,
  pushed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
  -- No is_deleted: hard-deleted after 90 days via cron
);
-- =============================================
-- 20. APP SETTINGS
-- =============================================
CREATE TABLE app_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 21. ADMIN ACTION LOGS
-- =============================================
CREATE TABLE admin_action_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  target_type TEXT CHECK (target_type IN ('user','post','theme','badge','setting','notification')),
  target_id   UUID,
  detail      JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
  -- Hard-deleted after 1 year via cron
);
-- =============================================
-- 22. PUSH NOTIFICATION LOGS
-- =============================================
CREATE TABLE push_notification_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT,
  body        TEXT,
  type        TEXT,
  state       TEXT DEFAULT 'pending' CHECK (state IN ('pending','sent','failed')),
  sent_at     TIMESTAMPTZ,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
  -- Hard-deleted after 30 days via cron
);
-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_profiles_username ON profiles USING gin(username gin_trgm_ops);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_state ON profiles(state) WHERE is_deleted = FALSE;
CREATE INDEX idx_daily_pages_user_date ON daily_pages(user_id, page_date DESC);
CREATE INDEX idx_daily_pages_token ON daily_pages(share_link_token);
CREATE INDEX idx_posts_page_id ON posts(page_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_taken_at ON posts(taken_at DESC);
CREATE INDEX idx_posts_moderation ON posts(moderation_state) WHERE is_deleted = FALSE;
CREATE INDEX idx_posts_flagged ON posts(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_todos_page_id ON todos(page_id);
CREATE INDEX idx_notes_page_id ON notes(page_id);
CREATE INDEX idx_day_plans_user_date ON day_plans(user_id, plan_date);
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_state ON friendships(state);
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_post_reports_state ON post_reports(state);
CREATE INDEX idx_streak_logs_user_date ON streak_logs(user_id, log_date DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_date ON notifications(user_id, created_at DESC);
-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','user_devices','theme_time_slots','themes',
    'daily_pages','posts','todos','notes','day_plans',
    'friendships','badges','monthly_stats','app_settings'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER trigger_updated_at_%I
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END;
$$;
-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
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
  base_username := COALESCE(NULLIF(base_username, ''), 'user');
  
  final_username := base_username;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', final_username),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- =============================================
-- SEED: Default time slots
-- =============================================
INSERT INTO theme_time_slots (name, start_hour, end_hour, icon, color_hex, sort_order) VALUES
  ('Sáng sớm',   5,  7,  '🌅', '#FFF3E0', 1),
  ('Buổi sáng',  7,  11, '☀️', '#FFFDE7', 2),
  ('Buổi trưa',  11, 13, '🌤️', '#F3F8FF', 3),
  ('Chiều',      13, 17, '🌇', '#FFF8E1', 4),
  ('Chiều tối',  17, 19, '🌆', '#FBE9E7', 5),
  ('Buổi tối',   19, 22, '🌙', '#EDE7F6', 6),
  ('Đêm khuya',  22, 24, '🦉', '#E8EAF6', 7),
  ('Nửa đêm',    0,  5,  '⭐', '#212121', 8);
-- =============================================
-- SEED: Default themes
-- =============================================
INSERT INTO themes (name_vi, name_en, icon, time_slot_id, state, created_by)
SELECT t.name_vi, t.name_en, t.icon, ts.id, 'active', NULL
FROM (VALUES
  ('Dậy sớm', 'Early Rise', '🌅', 'Sáng sớm'),
  ('Dậy trễ', 'Late Rise', '😴', 'Sáng sớm'),
  ('Tập thể dục', 'Workout', '💪', 'Buổi sáng'),
  ('Ăn sáng', 'Breakfast', '🍳', 'Buổi sáng'),
  ('Đi làm / Đi học', 'Work / Study', '📚', 'Buổi sáng'),
  ('Nghỉ trưa', 'Lunch Break', '🥗', 'Buổi trưa'),
  ('Làm việc', 'Working', '💼', 'Chiều'),
  ('Cà phê chiều', 'Afternoon Coffee', '☕', 'Chiều'),
  ('Hoàng hôn', 'Sunset', '🌇', 'Chiều tối'),
  ('Ăn tối', 'Dinner', '🍜', 'Buổi tối'),
  ('Thư giãn', 'Relaxing', '🎮', 'Buổi tối'),
  ('Đọc sách', 'Reading', '📖', 'Buổi tối'),
  ('Cú đêm', 'Night Owl', '🦉', 'Đêm khuya'),
  ('Mất ngủ', 'Sleepless', '😶', 'Nửa đêm')
) AS t(name_vi, name_en, icon, slot_name)
JOIN theme_time_slots ts ON ts.name = t.slot_name;
-- =============================================
-- SEED: Default badges
-- =============================================
INSERT INTO badges (code, name_vi, name_en, description_vi, icon, condition_type, condition_value, rarity) VALUES
  ('EARLY_BIRD',   'Chim Sớm',     'Early Bird',    'Chụp ảnh chủ đề buổi sáng 7 ngày liên tiếp', '🌅', 'streak_morning', '{"days": 7}', 'rare'),
  ('NIGHT_OWL',    'Cú Đêm',       'Night Owl',     'Hoàn thành to-do sau 23:00', '🦉', 'todo_late_night', '{"hour_after": 23}', 'common'),
  ('ON_FIRE',      'Ngọn Lửa',     'On Fire',       'Duy trì streak 30 ngày liên tiếp', '🔥', 'streak_days', '{"days": 30}', 'epic'),
  ('DISCIPLINED',  'Kỷ Luật',      'Disciplined',   'Hoàn thành 100% to-do 5 ngày liên tiếp', '✅', 'todo_complete_streak', '{"days": 5, "pct": 100}', 'rare'),
  ('COLORFUL',     'Đa Chiều',     'Colorful Day',  'Đăng ảnh trong 4 khung giờ khác nhau trong 1 ngày', '🌈', 'posts_per_day_slots', '{"min_slots": 4}', 'epic'),
  ('FIRST_POST',   'Bước Đầu',     'First Step',    'Đăng ảnh đầu tiên', '📸', 'post_count', '{"count": 1}', 'common'),
  ('WEEK_WARRIOR', 'Chiến Binh',   'Week Warrior',  'Streak 7 ngày', '⚔️', 'streak_days', '{"days": 7}', 'common'),
  ('CENTURION',    'Bách Nhật',    'Centurion',     'Streak 100 ngày', '💯', 'streak_days', '{"days": 100}', 'legendary');
-- =============================================
-- SEED: Default app settings
-- =============================================
INSERT INTO app_settings (key, value, description) VALUES
  ('max_posts_per_day',         '{"value": 24}',              'Số ảnh tối đa mỗi ngày'),
  ('allow_registration',        '{"value": true}',            'Cho phép đăng ký tài khoản mới'),
  ('maintenance_mode',          '{"value": false}',           'Chế độ bảo trì hệ thống'),
  ('push_reminder_enabled',     '{"value": true}',            'Bật nhắc nhở chụp ảnh qua Push'),
  ('push_reminder_hours',       '{"value": [7, 12, 18, 21]}', 'Khung giờ gửi push reminder'),
  ('auto_approve_posts',        '{"value": true}',            'Tự động duyệt ảnh (bật = không cần kiểm duyệt trước)'),
  ('max_reactions_per_post',    '{"value": 7}',               'Số loại emoji có thể react vào 1 post'),
  ('friend_request_limit',      '{"value": 50}',              'Giới hạn lời mời kết bạn chờ duyệt');
