import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, Settings, Camera, Flame, Award, Calendar, ChevronRight, Edit3, Share2, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile: myProfile } = useAuthStore()
  const [profileData, setProfileData] = useState(null)
  const [badges, setBadges] = useState([])
  const [stats, setStats] = useState({ posts: 0, friends: 0, activeDays: 0 })
  const [loading, setLoading] = useState(true)

  const isOwnProfile = !username || username === myProfile?.username

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(searchParams.get('edit') === 'true')
  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    gender: 'prefer_not_to_say',
    dob: '',
    avatarUrl: '',
  })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

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

  // Initialize edit form when opening modal
  useEffect(() => {
    const p = profileData || myProfile
    if (isEditModalOpen && p) {
      setEditForm({
        displayName: p.display_name || '',
        username: p.username || '',
        bio: p.bio || '',
        gender: p.gender || 'prefer_not_to_say',
        dob: p.date_of_birth || '',
        avatarUrl: p.avatar_url || '',
      })
    }
  }, [isEditModalOpen, profileData, myProfile])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !myProfile?.id) return

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${myProfile.id}/avatar_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setEditForm(prev => ({ ...prev, avatarUrl: publicUrl }))
      toast.success('Đã tải ảnh đại diện lên!')
    } catch (err) {
      toast.error('Lỗi khi tải ảnh đại diện')
      console.error(err)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!editForm.username.trim() || !editForm.displayName.trim()) {
      toast.error('Vui lòng nhập đầy đủ Tên hiển thị và Tên người dùng')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: editForm.displayName.trim(),
          username: editForm.username.trim().toLowerCase(),
          bio: editForm.bio.trim(),
          gender: editForm.gender,
          date_of_birth: editForm.dob || null,
          avatar_url: editForm.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', myProfile.id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Tên người dùng đã được sử dụng')
        }
        throw error
      }

      if (data) {
        setProfileData(data)
        useAuthStore.getState().setProfile(data)
        toast.success('Cập nhật hồ sơ thành công!')
        setIsEditModalOpen(false)
        setSearchParams({})
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi khi lưu thông tin')
      console.error(err)
    } finally {
      setSaving(false)
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
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm tap-highlight"
                >
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

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsEditModalOpen(false); setSearchParams({}); }}
              className="fixed inset-0 bg-black z-40 max-w-[480px] mx-auto"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 z-50 max-w-[480px] mx-auto max-h-[90vh] overflow-y-auto shadow-2xl safe-bottom text-left"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">Chỉnh sửa hồ sơ</h3>
                <button
                  onClick={() => { setIsEditModalOpen(false); setSearchParams({}); }}
                  className="p-1 text-gray-400 hover:text-gray-600 tap-highlight"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 pb-24">
                {/* Upload Avatar */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-md">
                      {editForm.avatarUrl ? (
                        <img src={editForm.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (editForm.displayName || 'U').charAt(0).toUpperCase()
                      )}
                      
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 size={20} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm tap-highlight"
                    >
                      <Camera size={12} className="text-gray-600" />
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <span className="text-[10px] text-gray-400">Chọn ảnh chân dung hoặc ảnh vẽ cá nhân</span>
                </div>

                {/* Display Name */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Tên hiển thị</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Tên hiển thị của bạn"
                    className="input-base text-sm"
                    maxLength={30}
                    required
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Tên người dùng (username)</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    placeholder="username"
                    className="input-base text-sm"
                    maxLength={20}
                    required
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Tiểu sử (bio)</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Mô tả ngắn về bạn..."
                    className="input-base text-sm resize-none h-18 py-2"
                    maxLength={100}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Giới tính</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="input-base text-sm h-[42px] py-0"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                    <option value="prefer_not_to_say">Không muốn tiết lộ</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Ngày sinh</label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="input-base text-sm"
                  />
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={saving || uploadingAvatar}
                  className="w-full btn btn-primary py-3 rounded-xl mt-2 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Lưu thay đổi'
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
