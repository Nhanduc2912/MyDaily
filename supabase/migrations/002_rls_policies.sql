-- =============================================
-- Migration 002: Row Level Security (RLS)
-- =============================================
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_state_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;
-- Helper function to check if user is admin/moderator
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
    AND is_deleted = FALSE
    AND state = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND is_deleted = FALSE
    AND state = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- Helper: check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE state = 'accepted'
    AND (
      (requester_id = user_a AND addressee_id = user_b) OR
      (requester_id = user_b AND addressee_id = user_a)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- =============================================
-- PROFILES policies
-- =============================================
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (is_deleted = FALSE AND state != 'banned');
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin_or_moderator());
-- =============================================
-- USER DEVICES policies
-- =============================================
CREATE POLICY "devices_own" ON user_devices
  FOR ALL USING (auth.uid() = user_id);
-- =============================================
-- THEME TIME SLOTS — public read
-- =============================================
CREATE POLICY "time_slots_read" ON theme_time_slots
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "time_slots_admin" ON theme_time_slots
  FOR ALL USING (is_admin_or_moderator());
-- =============================================
-- THEMES — public read, admin write
-- =============================================
CREATE POLICY "themes_read" ON themes
  FOR SELECT USING (state = 'active' AND is_deleted = FALSE);
CREATE POLICY "themes_admin" ON themes
  FOR ALL USING (is_admin_or_moderator());
-- =============================================
-- DAILY PAGES policies
-- =============================================
CREATE POLICY "pages_own" ON daily_pages
  FOR ALL USING (auth.uid() = user_id AND is_deleted = FALSE);
CREATE POLICY "pages_friends_read" ON daily_pages
  FOR SELECT USING (
    is_deleted = FALSE AND
    visibility = 'friends' AND
    are_friends(auth.uid(), user_id)
  );
CREATE POLICY "pages_public_read" ON daily_pages
  FOR SELECT USING (is_deleted = FALSE AND visibility = 'public');
CREATE POLICY "pages_admin" ON daily_pages
  FOR ALL USING (is_admin_or_moderator());
-- =============================================
-- POSTS policies
-- =============================================
CREATE POLICY "posts_own" ON posts
  FOR ALL USING (auth.uid() = user_id AND is_deleted = FALSE);
CREATE POLICY "posts_friends_read" ON posts
  FOR SELECT USING (
    is_deleted = FALSE AND
    state = 'active' AND
    visibility = 'friends' AND
    are_friends(auth.uid(), user_id)
  );
CREATE POLICY "posts_public_read" ON posts
  FOR SELECT USING (
    is_deleted = FALSE AND
    state = 'active' AND
    visibility = 'public'
  );
CREATE POLICY "posts_admin" ON posts
  FOR ALL USING (is_admin_or_moderator());
-- =============================================
-- TODOS / NOTES / DAY PLANS — own only
-- =============================================
CREATE POLICY "todos_own" ON todos
  FOR ALL USING (auth.uid() = user_id AND is_deleted = FALSE);
CREATE POLICY "notes_own" ON notes
  FOR ALL USING (auth.uid() = user_id AND is_deleted = FALSE);
CREATE POLICY "day_plans_own" ON day_plans
  FOR ALL USING (auth.uid() = user_id AND is_deleted = FALSE);
-- =============================================
-- FRIENDSHIPS
-- =============================================
CREATE POLICY "friendships_own" ON friendships
  FOR ALL USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );
-- =============================================
-- REACTIONS
-- =============================================
CREATE POLICY "reactions_read" ON reactions
  FOR SELECT USING (TRUE);
CREATE POLICY "reactions_own_write" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_own_delete" ON reactions
  FOR DELETE USING (auth.uid() = user_id);
-- =============================================
-- POST REPORTS — users report, admins manage
-- =============================================
CREATE POLICY "reports_own_insert" ON post_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_own_read" ON post_reports
  FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "reports_admin" ON post_reports
  FOR ALL USING (is_admin_or_moderator());
-- =============================================
-- STREAK LOGS — own only
-- =============================================
CREATE POLICY "streak_own" ON streak_logs
  FOR ALL USING (auth.uid() = user_id);
-- =============================================
-- BADGES — public read
-- =============================================
CREATE POLICY "badges_read" ON badges
  FOR SELECT USING (state = 'active');
CREATE POLICY "badges_admin" ON badges
  FOR ALL USING (is_admin());
-- =============================================
-- USER BADGES — own read, system write
-- =============================================
CREATE POLICY "user_badges_own" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_badges_friends_read" ON user_badges
  FOR SELECT USING (are_friends(auth.uid(), user_id));
-- =============================================
-- MONTHLY STATS — own read
-- =============================================
CREATE POLICY "monthly_stats_own" ON monthly_stats
  FOR ALL USING (auth.uid() = user_id);
-- =============================================
-- NOTIFICATIONS — own only, admin write/read all
-- =============================================
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notifications_admin" ON notifications
  FOR ALL USING (is_admin_or_moderator());
-- =============================================
-- APP SETTINGS — admin only write, all read
-- =============================================
CREATE POLICY "app_settings_read" ON app_settings
  FOR SELECT USING (TRUE);
CREATE POLICY "app_settings_admin" ON app_settings
  FOR ALL USING (is_admin());
-- =============================================
-- ADMIN LOGS — admin read only
-- =============================================
CREATE POLICY "admin_logs_admin" ON admin_action_logs
  FOR ALL USING (is_admin());
-- =============================================
-- PUSH LOGS — admin only
-- =============================================
CREATE POLICY "push_logs_admin" ON push_notification_logs
  FOR ALL USING (is_admin_or_moderator());
