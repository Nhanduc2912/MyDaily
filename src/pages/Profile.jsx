import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, Settings, Camera, Flame, Award, Calendar, ChevronRight, Edit3, Share2 } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
}

export default function Profile() {
  const navigate = useNavigate()
  const { username } = useParams()
  const { profile: myProfile } = useAuthStore()
  const [profileData, setProfileData] = useState(null)
  const [badges, setBadges] = useState([])
  const [stats, setStats] = useState({ posts: 0, friends: 0, activeDays: 0 })
  const [loading, setLoading] = useState(true)

  const isOwnProfile = !username || username === myProfile?.username

  useEffect(() => {
    loadProfile()
  }, [username, myProfile])

  const loadProfile = async () => {
    try {
      if (isOwnProfile && myProfile) {
        setProfileData(myProfile)
      } else if (username) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .eq('is_deleted', false)
          .single()
        if (data) setProfileData(data)
      }

      // Load badges
      const profileId = isOwnProfile ? myProfile?.id : profileData?.id
      if (profileId) {
        const { data: badgeData } = await supabase
          .from('user_badges')
          .select('*, badges(*)')
          .eq('user_id', profileId)
          .order('earned_at', { ascending: false })

        if (badgeData) setBadges(badgeData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 pt-4 pb-4 space-y-4">
          <div className="skeleton h-6 w-32" />
          <div className="skeleton h-24 w-24 rounded-full mx-auto" />
          <div className="skeleton h-5 w-40 mx-auto" />
          <div className="skeleton h-4 w-56 mx-auto" />
        </div>
      </AppShell>
    )
  }

  const p = profileData || myProfile

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-4">
        <motion.div initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} className="tap-highlight p-1">
              <ArrowLeft size={22} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Hồ sơ</h1>
            {isOwnProfile ? (
              <button onClick={() => navigate('/settings')} className="tap-highlight p-1">
                <Settings size={20} className="text-gray-500" />
              </button>
            ) : (
              <div className="w-8" />
            )}
          </motion.div>

          {/* Avatar & Name */}
          <motion.div variants={fadeUp} custom={1} className="text-center mb-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-orange-200/50 mx-auto">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  (p?.display_name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm tap-highlight">
                  <Edit3 size={14} className="text-gray-500" />
                </button>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-3">{p?.display_name || p?.username}</h2>
            <p className="text-sm text-gray-400">@{p?.username}</p>
            {p?.bio && <p className="text-sm text-gray-600 mt-2 max-w-[260px] mx-auto">{p.bio}</p>}
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={2} className="grid grid-cols-3 gap-3 mb-6">
            <div className="card p-3 text-center">
              <Camera size={18} className="text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{stats.posts}</p>
              <p className="text-[10px] text-gray-400">Bài đăng</p>
            </div>
            <div className="card p-3 text-center">
              <Flame size={18} className="text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{p?.streak_count || 0}</p>
              <p className="text-[10px] text-gray-400">Streak</p>
            </div>
            <div className="card p-3 text-center">
              <Calendar size={18} className="text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{stats.activeDays}</p>
              <p className="text-[10px] text-gray-400">Ngày</p>
            </div>
          </motion.div>

          {/* Streak Card */}
          <motion.div variants={fadeUp} custom={3}>
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-lg" />
              <div className="flex items-center gap-3 relative">
                <span className="text-3xl streak-fire">🔥</span>
                <div>
                  <p className="text-orange-100 text-xs font-medium">Chuỗi hiện tại</p>
                  <p className="text-2xl font-extrabold">{p?.streak_count || 0} ngày</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-orange-100 text-xs">Kỷ lục</p>
                  <p className="text-lg font-bold">{p?.longest_streak || 0}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Badges */}
          <motion.div variants={fadeUp} custom={4}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                Huy hiệu
              </h3>
              {badges.length > 4 && (
                <button className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 tap-highlight">
                  Xem tất cả <ChevronRight size={14} />
                </button>
              )}
            </div>

            {badges.length === 0 ? (
              <div className="card p-6 text-center">
                <Award size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Chưa có huy hiệu nào</p>
                <p className="text-xs text-gray-300 mt-1">Tiếp tục sử dụng để nhận huy hiệu!</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {badges.slice(0, 8).map((ub) => (
                  <div key={ub.id} className="card p-3 text-center tap-highlight">
                    <span className="text-2xl">{ub.badges?.icon || '🏅'}</span>
                    <p className="text-[10px] font-semibold text-gray-600 mt-1 truncate">{ub.badges?.name_vi}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick actions */}
          {isOwnProfile && (
            <motion.div variants={fadeUp} custom={5} className="mt-6 space-y-2">
              <button
                onClick={() => navigate('/stats')}
                className="card w-full p-4 flex items-center gap-3 tap-highlight"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Calendar size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800">Thống kê hoạt động</p>
                  <p className="text-xs text-gray-400">Xem biểu đồ tháng của bạn</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>

              <button
                className="card w-full p-4 flex items-center gap-3 tap-highlight"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Share2 size={18} className="text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800">Chia sẻ hồ sơ</p>
                  <p className="text-xs text-gray-400">Tạo link chia sẻ hồ sơ</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppShell>
  )
}
