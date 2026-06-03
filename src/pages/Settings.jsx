import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, LogOut, User, Bell, Shield, Moon, Globe, HelpCircle, ChevronRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

export default function Settings() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // 'privacy' | 'lang' | 'theme' | 'help'

  // Settings states from localStorage
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi')
  const [defaultVisibility, setDefaultVisibility] = useState(localStorage.getItem('default_visibility') || 'private')

  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      toast.success('Đã đăng xuất')
      navigate('/')
    } catch {
      toast.error('Lỗi đăng xuất')
    } finally {
      setLoggingOut(false)
    }
  }

  const handleSavePrivacy = (val) => {
    setDefaultVisibility(val)
    localStorage.setItem('default_visibility', val)
    toast.success('Đã cập nhật quyền riêng tư mặc định')
    setActiveModal(null)
  }

  const handleSaveTheme = (val) => {
    setTheme(val)
    localStorage.setItem('theme', val)
    if (val === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    toast.success(val === 'dark' ? 'Đã chuyển sang giao diện tối' : 'Đã chuyển sang giao diện sáng')
    setActiveModal(null)
  }

  const handleSaveLang = async (val) => {
    setLang(val)
    localStorage.setItem('lang', val)
    
    if (profile?.id) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ locale: val })
          .eq('id', profile.id)
          .select()
          .single()
        if (!error && data) {
          useAuthStore.getState().setProfile(data)
        }
      } catch (err) {
        console.error('Update locale error:', err)
      }
    }
    toast.success(val === 'vi' ? 'Đã đổi ngôn ngữ sang Tiếng Việt' : 'Language changed to English')
    setActiveModal(null)
  }

  const settingsGroups = [
    {
      title: 'Tài khoản',
      items: [
        { icon: User, label: 'Thông tin cá nhân', desc: 'Tên, ảnh đại diện, bio', to: '/profile?edit=true' },
        { icon: Bell, label: 'Thông báo', desc: 'Quản lý cài đặt thông báo', to: '/notifications' },
        {
          icon: Shield,
          label: 'Quyền riêng tư',
          desc: `Mặc định: ${defaultVisibility === 'private' ? 'Chỉ mình tôi' : defaultVisibility === 'friends' ? 'Bạn bè' : 'Công khai'}`,
          action: 'privacy'
        },
      ],
    },
    {
      title: 'Ứng dụng',
      items: [
        { icon: Globe, label: 'Ngôn ngữ', desc: lang === 'vi' ? 'Tiếng Việt' : 'English', action: 'lang' },
        { icon: Moon, label: 'Giao diện', desc: theme === 'light' ? 'Sáng' : 'Tối', action: 'theme' },
      ],
    },
    {
      title: 'Khác',
      items: [
        { icon: HelpCircle, label: 'Trợ giúp & Phản hồi', action: 'help' },
      ],
    },
  ]

  return (
    <AppShell>
      {/* pb-24 adds enough bottom spacing so the content is never covered by bottom nav */}
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="tap-highlight p-1">
            <ArrowLeft size={22} className="text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Cài đặt</h1>
        </div>

        {/* Profile preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-6 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (profile?.display_name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{profile?.display_name || profile?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{profile?.username}</p>
          </div>
          <button onClick={() => navigate('/profile?edit=true')} className="text-xs text-orange-600 font-semibold tap-highlight">
            Chỉnh sửa
          </button>
        </motion.div>

        {/* Settings groups */}
        <div className="space-y-6">
          {settingsGroups.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.1 }}
            >
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">{group.title}</p>
              <div className="card overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.to) navigate(item.to)
                      if (item.action) setActiveModal(item.action)
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors tap-highlight text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <item.icon size={18} className="text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                      {item.desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>}
                    </div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sign out */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 space-y-3"
        >
          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-100 dark:border-red-950/40 text-red-650 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors tap-highlight"
          >
            <LogOut size={18} />
            {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </motion.div>

        {/* App version */}
        <p className="text-center text-[11px] text-gray-500 dark:text-gray-500 mt-6">MyDaily v1.0.0</p>
      </div>

      {/* Settings Modal - Increased z-indices to float above nav footer */}
      <AnimatePresence>
        {activeModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 bg-black z-[60] max-w-[480px] mx-auto"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl p-5 z-[65] max-w-[480px] mx-auto max-h-[80vh] overflow-y-auto shadow-2xl safe-bottom text-left"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {activeModal === 'privacy' && 'Quyền riêng tư mặc định'}
                  {activeModal === 'lang' && 'Ngôn ngữ (Language)'}
                  {activeModal === 'theme' && 'Giao diện (Theme)'}
                  {activeModal === 'help' && 'Trợ giúp & Phản hồi'}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 tap-highlight"
                >
                  <X size={20} />
                </button>
              </div>

              {activeModal === 'privacy' && (
                <div className="space-y-2">
                  {[
                    { key: 'private', label: 'Chỉ mình tôi', desc: 'Bài đăng mới sẽ mặc định ở chế độ riêng tư' },
                    { key: 'friends', label: 'Bạn bè', desc: 'Bài đăng mới sẽ mặc định hiển thị với bạn bè' },
                    { key: 'public', label: 'Công khai', desc: 'Bài đăng mới sẽ mặc định hiển thị công khai' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handleSavePrivacy(opt.key)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-colors tap-highlight ${
                        defaultVisibility === opt.key
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100/50 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-200'
                      }`}
                    >
                      <p className="text-sm font-bold">{opt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {activeModal === 'lang' && (
                <div className="space-y-2">
                  {[
                    { key: 'vi', label: 'Tiếng Việt' },
                    { key: 'en', label: 'English' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handleSaveLang(opt.key)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-colors tap-highlight ${
                        lang === opt.key
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100/50 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-200'
                      }`}
                    >
                      <p className="text-sm font-bold">{opt.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {activeModal === 'theme' && (
                <div className="space-y-2">
                  {[
                    { key: 'light', label: 'Giao diện sáng (Light)' },
                    { key: 'dark', label: 'Giao diện tối (Dark)' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handleSaveTheme(opt.key)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-colors tap-highlight ${
                        theme === opt.key
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100/50 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-200'
                      }`}
                    >
                      <p className="text-sm font-bold">{opt.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {activeModal === 'help' && (
                <div className="space-y-3 text-sm text-gray-650 dark:text-gray-300">
                  <p>Cảm ơn bạn đã sử dụng <strong>MyDaily</strong>! Hệ thống hỗ trợ ghi lại khoảnh khắc trong ngày và chia sẻ cùng bạn bè.</p>
                  <p>Nếu bạn gặp sự cố hoặc muốn đóng góp ý kiến, vui lòng gửi phản hồi qua email:</p>
                  <a href="mailto:support@mydaily.com" className="text-orange-500 font-semibold block hover:underline">
                    support@mydaily.com
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phiên bản ứng dụng: 1.0.0 (Build 20260603)</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
