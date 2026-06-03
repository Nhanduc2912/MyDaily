import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users, Image, AlertTriangle, CheckCircle,
  Activity, Eye, Clock, ArrowUpRight
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { ROUTES } from '@/lib/constants'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4 }
  }),
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentActions, setRecentActions] = useState([])
  const [pendingReports, setPendingReports] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadDashboard = useCallback(async () => {
    try {
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalPosts },
        { count: todayPosts },
        { count: pendingReportsCount },
        { count: flaggedPosts },
        { data: reports },
        { data: actions },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('state', 'active'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false)
          .gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('post_reports').select('*', { count: 'exact', head: true }).eq('state', 'pending'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_flagged', true).eq('is_deleted', false),
        supabase.from('post_reports').select(`
          *, reporter:reporter_id(username, display_name),
          post:post_id(image_url, custom_title, user_id)
        `).eq('state', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('admin_action_logs').select(`
          *, admin:admin_id(username, display_name)
        `).order('created_at', { ascending: false }).limit(8),
      ])

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalPosts: totalPosts || 0,
        todayPosts: todayPosts || 0,
        pendingReports: pendingReportsCount || 0,
        flaggedPosts: flaggedPosts || 0,
      })
      setPendingReports(reports || [])
      setRecentActions(actions || [])
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadDashboard])

  const statCards = stats ? [
    {
      label: 'Tổng người dùng',
      value: stats.totalUsers,
      icon: Users,
      color: '#3b82f6',
      bg: '#eff6ff',
      sub: `${stats.activeUsers} đang hoạt động`,
      onClick: () => navigate(ROUTES.ADMIN_USERS),
    },
    {
      label: 'Tổng bài đăng',
      value: stats.totalPosts,
      icon: Image,
      color: '#10b981',
      bg: '#ecfdf5',
      sub: `${stats.todayPosts} hôm nay`,
      onClick: () => navigate(ROUTES.ADMIN_POSTS),
    },
    {
      label: 'Báo cáo chờ duyệt',
      value: stats.pendingReports,
      icon: AlertTriangle,
      color: '#f59e0b',
      bg: '#fffbeb',
      sub: 'Cần xử lý',
      onClick: () => navigate(ROUTES.ADMIN_POSTS),
      urgent: stats.pendingReports > 0,
    },
    {
      label: 'Ảnh bị gắn cờ',
      value: stats.flaggedPosts,
      icon: Eye,
      color: '#ef4444',
      bg: '#fef2f2',
      sub: 'Cần kiểm duyệt',
      onClick: () => navigate(ROUTES.ADMIN_POSTS),
      urgent: stats.flaggedPosts > 0,
    },
  ] : []

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'Vừa xong'
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
    return `${Math.floor(diff / 86400)} ngày trước`
  }

  const actionLabels = {
    'user_suspended': { text: 'Tạm ngưng tài khoản', color: '#f59e0b' },
    'user_banned': { text: 'Cấm tài khoản', color: '#ef4444' },
    'user_activated': { text: 'Kích hoạt tài khoản', color: '#10b981' },
    'post_removed': { text: 'Gỡ bài đăng', color: '#ef4444' },
    'post_approved': { text: 'Duyệt bài đăng', color: '#10b981' },
    'post_rejected': { text: 'Từ chối bài đăng', color: '#f59e0b' },
    'theme_created': { text: 'Tạo chủ đề mới', color: '#8b5cf6' },
    'theme_updated': { text: 'Cập nhật chủ đề', color: '#3b82f6' },
    'badge_created': { text: 'Tạo huy hiệu mới', color: '#8b5cf6' },
    'setting_updated': { text: 'Cập nhật cài đặt', color: '#3b82f6' },
    'notification_sent': { text: 'Gửi thông báo', color: '#f97316' },
  }

  const reportReasons = {
    nudity: '🔞 Nội dung nhạy cảm',
    spam: '🚫 Spam',
    hate: '😡 Kích động thù hận',
    violence: '⚠️ Bạo lực',
    other: '📝 Khác',
  }

  if (loading) {
    return (
      <AdminShell title="Tổng quan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Tổng quan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}>
          {statCards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                onClick={card.onClick}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 16,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-soft)',
                  border: card.urgent
                    ? `2px solid ${card.color}`
                    : '1px solid var(--color-border)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {card.urgent && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: card.color,
                    animation: 'streak-pulse 1.5s ease-in-out infinite',
                  }} />
                )}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <Icon size={18} color={card.color} />
                </div>
                <p style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--color-text)',
                  margin: 0,
                  lineHeight: 1,
                }}>
                  {card.value}
                </p>
                <p style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-text-muted)',
                  margin: '4px 0 0',
                }}>
                  {card.label}
                </p>
                <p style={{
                  fontSize: 11,
                  color: 'var(--color-text-subtle)',
                  margin: '2px 0 0',
                }}>
                  {card.sub}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Pending Reports */}
        <motion.div
          variants={fadeUp}
          custom={4}
          initial="hidden"
          animate="visible"
          style={{
            background: 'white',
            borderRadius: 16,
            boxShadow: 'var(--shadow-soft)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#f59e0b" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Báo cáo mới nhất</span>
            </div>
            <button
              onClick={() => navigate(ROUTES.ADMIN_POSTS)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: '#f97316',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>

          {pendingReports.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
            }}>
              <CheckCircle size={32} color="#10b981" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
                Không có báo cáo nào cần xử lý 🎉
              </p>
            </div>
          ) : (
            <div>
              {pendingReports.map((report, idx) => (
                <div
                  key={report.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < pendingReports.length - 1 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#f1f5f9',
                  }}>
                    {report.post?.image_url && (
                      <img
                        src={report.post.image_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 500,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {reportReasons[report.reason] || report.reason}
                    </p>
                    <p style={{
                      fontSize: 11,
                      color: 'var(--color-text-subtle)',
                      margin: '2px 0 0',
                    }}>
                      Bởi @{report.reporter?.username} · {formatTime(report.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Admin Actions */}
        <motion.div
          variants={fadeUp}
          custom={5}
          initial="hidden"
          animate="visible"
          style={{
            background: 'white',
            borderRadius: 16,
            boxShadow: 'var(--shadow-soft)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Activity size={16} color="#8b5cf6" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Hoạt động gần đây</span>
          </div>

          {recentActions.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
            }}>
              <Clock size={32} color="var(--color-text-subtle)" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
                Chưa có hoạt động nào
              </p>
            </div>
          ) : (
            <div>
              {recentActions.map((action, idx) => {
                const info = actionLabels[action.action] || { text: action.action, color: '#64748b' }
                return (
                  <div
                    key={action.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: idx < recentActions.length - 1 ? '1px solid var(--color-border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: info.color,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                        <span style={{ color: info.color }}>{info.text}</span>
                      </p>
                      <p style={{
                        fontSize: 11,
                        color: 'var(--color-text-subtle)',
                        margin: '2px 0 0',
                      }}>
                        {action.admin?.display_name || 'Admin'} · {formatTime(action.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </AdminShell>
  )
}
