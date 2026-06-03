// App-wide constants

export const APP_NAME = 'MyDaily'
export const APP_DESCRIPTION = 'Ghi lại từng khoảnh khắc trong ngày của bạn'

// Visibility options
export const VISIBILITY = {
  PRIVATE: 'private',
  FRIENDS: 'friends',
  PUBLIC: 'public',
}

export const VISIBILITY_LABELS = {
  private: { label: 'Chỉ mình tôi', icon: '🔒' },
  friends: { label: 'Bạn bè', icon: '👥' },
  public:  { label: 'Công khai', icon: '🌍' },
}

// Moods
export const MOODS = [
  { value: 'happy',   label: 'Vui',       emoji: '😄' },
  { value: 'good',    label: 'Ổn',        emoji: '🙂' },
  { value: 'neutral', label: 'Bình thường', emoji: '😐' },
  { value: 'tired',   label: 'Mệt',       emoji: '😴' },
  { value: 'sad',     label: 'Buồn',      emoji: '😢' },
]

// Reaction emojis
export const REACTION_EMOJIS = ['🔥', '❤️', '😄', '💪', '🌙', '👏', '✨']

// Priority
export const PRIORITIES = [
  { value: 'low',    label: 'Thấp',   color: '#64748b' },
  { value: 'normal', label: 'Bình thường', color: '#f97316' },
  { value: 'high',   label: 'Cao',    color: '#ef4444' },
]

// Friendship states
export const FRIENDSHIP_STATE = {
  PENDING:  'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  BLOCKED:  'blocked',
}

// User roles
export const ROLES = {
  USER:      'user',
  ADMIN:     'admin',
  MODERATOR: 'moderator',
}

// Routes
export const ROUTES = {
  HOME:        '/',
  AUTH:        '/auth',
  DASHBOARD:   '/dashboard',
  DAY:         '/day/:date/:username?',
  CAMERA:      '/camera',
  FRIENDS:     '/friends',
  PROFILE:     '/profile/:username',
  PROFILE_ME:  '/profile',
  STATS:       '/stats',
  SETTINGS:    '/settings',
  NOTIFICATIONS: '/notifications',
  SHARE:       '/share/:token',
  ADMIN:       '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_POSTS: '/admin/posts',
  ADMIN_THEMES:  '/admin/themes',
  ADMIN_BADGES:  '/admin/badges',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_SETTINGS: '/admin/settings',
}

// Supabase Storage bucket
export const STORAGE_BUCKETS = {
  POSTS:   'post-images',
  AVATARS: 'avatars',
}

// Max file size for images (5MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
