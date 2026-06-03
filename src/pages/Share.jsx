import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import dayjs from '@/lib/dayjs'
import { Camera, Calendar, Flame } from 'lucide-react'

const timeSlotInfo = [
  { range: [5, 7],   label: 'Sáng sớm',  emoji: '🌅', bg: 'bg-orange-50' },
  { range: [7, 11],  label: 'Buổi sáng',  emoji: '☀️', bg: 'bg-yellow-50' },
  { range: [11, 13], label: 'Buổi trưa',  emoji: '🌤️', bg: 'bg-blue-50' },
  { range: [13, 17], label: 'Buổi chiều', emoji: '🌇', bg: 'bg-amber-50' },
  { range: [17, 19], label: 'Chiều tối',  emoji: '🌆', bg: 'bg-orange-50' },
  { range: [19, 22], label: 'Buổi tối',   emoji: '🌙', bg: 'bg-indigo-50' },
  { range: [22, 24], label: 'Đêm khuya',  emoji: '🦉', bg: 'bg-slate-50' },
  { range: [0, 5],   label: 'Nửa đêm',   emoji: '⭐', bg: 'bg-gray-100' },
]

export default function Share() {
  const { token } = useParams()
  const [page, setPage] = useState(null)
  const [posts, setPosts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSharedPage = useCallback(async () => {
    try {
      const { data: pageData, error: pageErr } = await supabase
        .from('daily_pages')
        .select('*, profiles!user_id(username, display_name, avatar_url, streak_count)')
        .eq('share_link_token', token)
        .eq('is_deleted', false)
        .single()

      if (pageErr || !pageData) {
        setError('Không tìm thấy trang chia sẻ này')
        setLoading(false)
        return
      }

      setPage(pageData)
      setProfile(pageData.profiles)

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, themes(name_vi, icon)')
        .eq('page_id', pageData.id)
        .eq('is_deleted', false)
        .in('visibility', ['public', 'friends'])
        .order('taken_at')

      setPosts(postsData || [])
    } catch (err) {
      console.error(err)
      setError('Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSharedPage()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadSharedPage])

  const groupPosts = () => {
    const groups = []
    timeSlotInfo.forEach(slot => {
      const slotPosts = posts.filter(p => {
        const h = dayjs(p.taken_at).hour()
        if (slot.range[0] < slot.range[1]) return h >= slot.range[0] && h < slot.range[1]
        return h >= slot.range[0] || h < slot.range[1]
      })
      if (slotPosts.length > 0) groups.push({ ...slot, posts: slotPosts })
    })
    return groups
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">Liên kết không hợp lệ</h1>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              (profile?.display_name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-base font-bold text-gray-800">{profile?.display_name}</p>
            <p className="text-xs text-gray-400">@{profile?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar size={14} className="text-gray-400" />
            <span className="font-medium text-gray-600">{dayjs(page.page_date).format('DD/MM/YYYY')}</span>
          </div>
          {page.mood && (
            <span className="text-lg">{page.mood === 'happy' ? '😄' : page.mood === 'good' ? '🙂' : page.mood === 'neutral' ? '😐' : page.mood === 'tired' ? '😴' : '😢'}</span>
          )}
          <div className="flex items-center gap-1 text-sm ml-auto">
            <Flame size={14} className="text-orange-500" />
            <span className="font-bold text-orange-600">{profile?.streak_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-4 space-y-3">
        {groupPosts().map((slot, i) => (
          <motion.div
            key={slot.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${slot.bg} rounded-2xl p-3`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{slot.emoji}</span>
              <span className="text-xs font-bold text-gray-700">{slot.label}</span>
            </div>
            <div className="space-y-2">
              {slot.posts.map(post => (
                <div key={post.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <img src={post.image_url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                  <div className="p-3">
                    {post.themes && (
                      <span className="text-xs font-semibold text-orange-600">
                        {post.themes.icon} {post.themes.name_vi}
                      </span>
                    )}
                    {post.custom_title && (
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{post.custom_title}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{dayjs(post.taken_at).format('HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <Camera size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Ngày này chưa có ảnh chia sẻ</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-6 text-center border-t border-gray-100 bg-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">M</span>
          </div>
          <span className="text-sm font-semibold text-gray-600">MyDaily</span>
        </div>
        <p className="text-xs text-gray-400">Ghi lại từng khoảnh khắc trong ngày</p>
      </div>
    </div>
  )
}
