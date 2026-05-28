import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, LogOut, User, Bell, Shield, Moon, Globe, HelpCircle, ChevronRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const settingsGroups = [
  {
    title: 'Tài khoản',
    items: [
      { icon: User, label: 'Thông tin cá nhân', desc: 'Tên, ảnh đại diện, bio', to: '/profile' },
      { icon: Bell, label: 'Thông báo', desc: 'Quản lý cài đặt thông báo', to: '/notifications' },
      { icon: Shield, label: 'Quyền riêng tư', desc: 'Mặc định hiển thị bài đăng', action: 'privacy' },
    ],
  },
  {
    title: 'Ứng dụng',
    items: [
      { icon: Globe, label: 'Ngôn ngữ', desc: 'Tiếng Việt', action: 'lang' },
      { icon: Moon, label: 'Giao diện', desc: 'Sáng', action: 'theme' },
    ],
  },
  {
    title: 'Khác',
    items: [
      { icon: HelpCircle, label: 'Trợ giúp & Phản hồi', action: 'help' },
    ],
  },
]

export default function Settings() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)

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

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="tap-highlight p-1">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Cài đặt</h1>
        </div>

        {/* Profile preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-6 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
            {(profile?.display_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{profile?.display_name || profile?.username}</p>
            <p className="text-xs text-gray-400 truncate">@{profile?.username}</p>
          </div>
          <button onClick={() => navigate('/profile')} className="text-xs text-orange-600 font-semibold tap-highlight">
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{group.title}</p>
              <div className="card overflow-hidden divide-y divide-gray-50">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => item.to ? navigate(item.to) : null}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors tap-highlight text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <item.icon size={18} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      {item.desc && <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>}
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
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
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-100 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors tap-highlight"
          >
            <LogOut size={18} />
            {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </motion.div>

        {/* App version */}
        <p className="text-center text-[11px] text-gray-300 mt-6">MyDaily v1.0.0</p>
      </div>
    </AppShell>
  )
}
