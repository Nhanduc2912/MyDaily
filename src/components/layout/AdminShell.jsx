import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Image, Palette, Award, Bell,
  Settings, ChevronLeft, Menu, X, LogOut, Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/lib/constants'

const adminNav = [
  { path: ROUTES.ADMIN, icon: LayoutDashboard, label: 'Tổng quan' },
  { path: ROUTES.ADMIN_USERS, icon: Users, label: 'Người dùng' },
  { path: ROUTES.ADMIN_POSTS, icon: Image, label: 'Bài đăng' },
  { path: ROUTES.ADMIN_THEMES, icon: Palette, label: 'Chủ đề' },
  { path: ROUTES.ADMIN_BADGES, icon: Award, label: 'Huy hiệu' },
  { path: ROUTES.ADMIN_NOTIFICATIONS, icon: Bell, label: 'Thông báo' },
  { path: ROUTES.ADMIN_SETTINGS, icon: Settings, label: 'Cài đặt' },
]

export default function AdminShell({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    navigate(ROUTES.HOME)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-surface-2)',
      maxWidth: '100vw',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'var(--color-surface-3)',
            border: 'none',
            borderRadius: 10,
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={16} color="white" />
          </div>
          <div>
            <h1 style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: 0,
              lineHeight: 1.2,
            }}>
              {title || 'Quản trị'}
            </h1>
            <p style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              margin: 0,
              lineHeight: 1,
            }}>
              MyDaily Admin
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          style={{
            background: 'var(--color-surface-3)',
            border: 'none',
            borderRadius: 10,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ChevronLeft size={14} />
          App
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 30,
              }}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 260,
                background: 'white',
                zIndex: 35,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
              }}
            >
              {/* Sidebar Header */}
              <div style={{
                padding: '20px 16px 16px',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Shield size={20} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                      {profile?.display_name || 'Admin'}
                    </p>
                    <p style={{
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      margin: 0,
                      textTransform: 'capitalize',
                    }}>
                      {profile?.role || 'admin'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nav Items */}
              <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                {adminNav.map((item) => {
                  const isActive = location.pathname === item.path
                  const Icon = item.icon
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path)
                        setSidebarOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 400,
                        background: isActive
                          ? 'linear-gradient(135deg, #fff7ed, #ffedd5)'
                          : 'transparent',
                        color: isActive ? '#ea580c' : 'var(--color-text)',
                        marginBottom: 2,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                      {item.label}
                    </button>
                  )
                })}
              </nav>

              {/* Sign Out */}
              <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 14,
                    background: '#fef2f2',
                    color: '#ef4444',
                    fontWeight: 500,
                  }}
                >
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: 16,
          maxWidth: '100%',
          overflowX: 'hidden',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
