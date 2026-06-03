import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, Check, Bell, UserPlus, Heart, Award, Shield } from 'lucide-react'
import { fromNow } from '@/lib/dayjs'

const typeIcons = {
  reaction: Heart,
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  badge_earned: Award,
  post_moderated: Shield,
  system: Bell,
  push_reminder: Bell,
}

const typeColors = {
  reaction: { bg: 'bg-pink-50 dark:bg-pink-950/20', text: 'text-pink-500 dark:text-pink-400' },
  friend_request: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-500 dark:text-blue-400' },
  friend_accepted: { bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-500 dark:text-green-400' },
  badge_earned: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-500 dark:text-amber-400' },
  post_moderated: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-500 dark:text-red-400' },
  system: { bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-500 dark:text-gray-400' },
  push_reminder: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-500 dark:text-orange-400' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setNotifications(data)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadNotifications])

  const markAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    if (profile?.id) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('is_read', false)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="tap-highlight p-1">
              <ArrowLeft size={22} className="text-gray-700 dark:text-gray-200" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1 tap-highlight"
            >
              <Check size={14} /> Đọc hết
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 flex items-start gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Không có thông báo</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Khi có hoạt động mới, bạn sẽ thấy ở đây</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((n, i) => {
                const Icon = typeIcons[n.type] || Bell
                const colors = typeColors[n.type] || { bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-500 dark:text-gray-400' }

                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className={`card p-4 flex items-start gap-3 tap-highlight transition-colors ${
                      !n.is_read ? 'bg-orange-50/40 dark:bg-orange-950/15 border-orange-100/60 dark:border-orange-900/45' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={colors.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.title && <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{n.title}</p>}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{fromNow(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-2" />
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  )
}
