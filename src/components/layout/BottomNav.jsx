import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Camera, Users, User, Bell } from 'lucide-react'

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Trang chủ' },
  { path: '/friends', icon: Users, label: 'Bạn bè' },
  { path: '/camera', icon: Camera, label: 'Chụp', isCenter: true },
  { path: '/notifications', icon: Bell, label: 'Thông báo' },
  { path: '/profile', icon: User, label: 'Cá nhân' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 safe-bottom">
      <div className="glass border-t border-gray-100/80 px-2 pb-1 pt-1.5">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname.startsWith('/day'))
            const Icon = item.icon

            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative -mt-6 tap-highlight"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-300/50"
                  >
                    <Icon size={24} className="text-white" strokeWidth={2.5} />
                  </motion.div>
                  <span className="text-[10px] font-medium text-orange-600 block text-center mt-1">{item.label}</span>
                </button>
              )
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center py-1.5 px-3 tap-highlight relative"
              >
                <div className="relative">
                  <Icon
                    size={22}
                    className={isActive ? 'text-orange-500' : 'text-gray-400'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
