import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, Check, Bell, UserPlus, Heart, Award, Shield, MessageSquare } from 'lucide-react'
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
  reaction: 'text-pink-500 bg-pink-50',
  friend_request: 'text-blue-500 bg-blue-50',
  friend_accepted: 'text-green-500 bg-green-50',
  badge_earned: 'text-amber-500 bg-amber-50',
  post_moderated: 'text-red-500 bg-red-50',
  system: 'text-gray-500 bg-gray-50',
  push_reminder: 'text-orange-500 bg-orange-50',
}

export default function Notifications() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
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
  }

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
      <div className="px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="tap-highlight p-1">
              <ArrowLeft size={22} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-orange-600 font-semibold flex items-center gap-1 tap-highlight"
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
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Không có thông báo</p>
            <p className="text-xs text-gray-400 mt-1">Khi có hoạt động mới, bạn sẽ thấy ở đây</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((n, i) => {
                const Icon = typeIcons[n.type] || Bell
                const colorClass = typeColors[n.type] || 'text-gray-500 bg-gray-50'
                const [iconColor, iconBg] = colorClass.split(' ')

                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className={`card p-4 flex items-start gap-3 tap-highlight transition-colors ${
                      !n.is_read ? 'bg-orange-50/40 border-orange-100/60' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.title && <p className="text-sm font-semibold text-gray-800">{n.title}</p>}
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{fromNow(n.created_at)}</p>
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
