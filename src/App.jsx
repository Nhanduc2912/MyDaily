import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import { ROUTES, ROLES } from '@/lib/constants'

// Pages
import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import Day from '@/pages/Day'
import Camera from '@/pages/Camera'
import Friends from '@/pages/Friends'
import Profile from '@/pages/Profile'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'
import Notifications from '@/pages/Notifications'
import Share from '@/pages/Share'

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminPosts from '@/pages/admin/AdminPosts'
import AdminThemes from '@/pages/admin/AdminThemes'
import AdminBadges from '@/pages/admin/AdminBadges'
import AdminNotifications from '@/pages/admin/AdminNotifications'
import AdminSettings from '@/pages/admin/AdminSettings'

// Guards
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="skeleton w-8 h-8 rounded-full" /></div>
  if (!isAuthenticated) return <Navigate to={ROUTES.AUTH} replace />
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, isLoading, profile } = useAuthStore()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to={ROUTES.AUTH} replace />
  if (profile?.role !== ROLES.ADMIN && profile?.role !== ROLES.MODERATOR) return <Navigate to={ROUTES.DASHBOARD} replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />
  return children
}

export default function App() {
  const { setUser, setLoading, fetchProfile, createProfileFallback } = useAuthStore()

  useEffect(() => {
    // Init auth session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          setUser(session.user)
          const { data: profile } = await fetchProfile(session.user.id)
          if (!profile) {
            await createProfileFallback(session.user)
          }
        }
      } catch (err) {
        console.error('Session init error:', err)
      } finally {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          setUser(session.user)
          const { data: profile } = await fetchProfile(session.user.id)
          if (!profile) {
            await createProfileFallback(session.user)
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Auth state change error:', err)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            maxWidth: '340px',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path={ROUTES.HOME} element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path={ROUTES.AUTH} element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path={ROUTES.SHARE} element={<Share />} />

        {/* Protected */}
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path={ROUTES.DAY} element={<ProtectedRoute><Day /></ProtectedRoute>} />
        <Route path={ROUTES.CAMERA} element={<ProtectedRoute><Camera /></ProtectedRoute>} />
        <Route path={ROUTES.FRIENDS} element={<ProtectedRoute><Friends /></ProtectedRoute>} />
        <Route path={ROUTES.PROFILE_ME} element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path={ROUTES.PROFILE} element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path={ROUTES.STATS} element={<ProtectedRoute><Stats /></ProtectedRoute>} />
        <Route path={ROUTES.SETTINGS} element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path={ROUTES.NOTIFICATIONS} element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

        {/* Admin */}
        <Route path={ROUTES.ADMIN} element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_USERS} element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_POSTS} element={<AdminRoute><AdminPosts /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_THEMES} element={<AdminRoute><AdminThemes /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_BADGES} element={<AdminRoute><AdminBadges /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<AdminRoute><AdminNotifications /></AdminRoute>} />
        <Route path={ROUTES.ADMIN_SETTINGS} element={<AdminRoute><AdminSettings /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </>
  )
}
