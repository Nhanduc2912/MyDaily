import { useState, useEffect } from 'react'
import {
  Send, Bell, Users, User, Megaphone, CheckCircle
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'

const notifTypes = [
  { value: 'system', label: 'Hệ thống', icon: '🔔' },
  { value: 'push_reminder', label: 'Nhắc nhở', icon: '⏰' },
]

export default function AdminNotifications() {
  const [recentNotifs, setRecentNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [target, setTarget] = useState('all') // 'all' or user ID
  const [searchUser, setSearchUser] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const { profile: adminProfile } = useAuthStore()

  const [form, setForm] = useState({
    type: 'system',
    title: '',
    body: '',
  })

  useEffect(() => {
    loadRecentNotifs()
  }, [])

  async function loadRecentNotifs() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          user:user_id(username, display_name),
          from_user:from_user_id(username, display_name)
        `)
        .eq('type', 'system')
        .order('created_at', { ascending: false })
        .limit(20)

      setRecentNotifs(data || [])
    } catch (err) {
      console.error('Load notifs error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearchUser(query) {
    setSearchUser(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('is_deleted', false)
        .eq('state', 'active')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10)

      setSearchResults(data || [])
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  async function handleSend() {
    if (!form.title.trim() || !form.body.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung')
      return
    }
    if (target !== 'all' && (target === 'select' || !target)) {
      alert('Vui lòng chọn người nhận thông báo')
      return
    }
    setSending(true)
    try {
      if (target === 'all') {
        // Send to all active users
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_deleted', false)
          .eq('state', 'active')

        if (allUsers && allUsers.length > 0) {
          const notifications = allUsers.map(u => ({
            user_id: u.id,
            from_user_id: adminProfile.id,
            type: form.type,
            title: form.title.trim(),
            body: form.body.trim(),
          }))

          // Batch insert (Supabase handles arrays)
          const { error } = await supabase
            .from('notifications')
            .insert(notifications)

          if (error) throw error
        }
      } else {
        // Send to specific user
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: target,
            from_user_id: adminProfile.id,
            type: form.type,
            title: form.title.trim(),
            body: form.body.trim(),
          })

        if (error) throw error
      }

      // Log admin action
      await supabase.from('admin_action_logs').insert({
        admin_id: adminProfile.id,
        action: 'notification_sent',
        target_type: 'notification',
        detail: {
          target: target === 'all' ? 'all_users' : target,
          title: form.title,
          type: form.type,
        },
      })

      setSent(true)
      setForm({ type: 'system', title: '', body: '' })
      setTarget('all')
      setSearchUser('')
      setSearchResults([])
      loadRecentNotifs()

      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      console.error('Send error:', err)
      alert('Lỗi: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'Vừa xong'
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <AdminShell title="Gửi thông báo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Send Form */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 16,
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            <Megaphone size={18} color="#f97316" />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Gửi thông báo mới
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Target Selection */}
            <div>
              <label style={labelStyle}>Đối tượng nhận</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => { setTarget('all'); setSearchUser(''); setSearchResults([]) }}
                  style={{
                    ...targetBtnStyle,
                    background: target === 'all' ? '#fff7ed' : 'white',
                    borderColor: target === 'all' ? '#f97316' : 'var(--color-border)',
                    color: target === 'all' ? '#ea580c' : 'var(--color-text)',
                  }}
                >
                  <Users size={14} /> Tất cả
                </button>
                <button
                  onClick={() => setTarget('select')}
                  style={{
                    ...targetBtnStyle,
                    background: target !== 'all' ? '#fff7ed' : 'white',
                    borderColor: target !== 'all' ? '#f97316' : 'var(--color-border)',
                    color: target !== 'all' ? '#ea580c' : 'var(--color-text)',
                  }}
                >
                  <User size={14} /> Chọn người
                </button>
              </div>

              {/* User search */}
              {target !== 'all' && (
                <div style={{ position: 'relative' }}>
                  <input
                    value={searchUser}
                    onChange={e => handleSearchUser(e.target.value)}
                    placeholder="Tìm username..."
                    className="input-base"
                    style={{ marginBottom: 4 }}
                  />
                  {searchResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      boxShadow: 'var(--shadow-modal)',
                      zIndex: 10,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}>
                      {searchResults.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setTarget(user.id)
                            setSearchUser(`@${user.username}`)
                            setSearchResults([])
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            background: target === user.id ? '#fff7ed' : 'white',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontFamily: 'var(--font-sans)',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: 28, height: 28,
                            borderRadius: 8,
                            background: user.avatar_url
                              ? `url(${user.avatar_url}) center/cover`
                              : 'linear-gradient(135deg, #f97316, #ea580c)',
                            flexShrink: 0,
                          }} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 500 }}>{user.display_name || user.username}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-subtle)' }}>@{user.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Type */}
            <div>
              <label style={labelStyle}>Loại thông báo</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="input-base"
              >
                {notifTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Tiêu đề *</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="VD: Cập nhật hệ thống"
                className="input-base"
              />
            </div>

            {/* Body */}
            <div>
              <label style={labelStyle}>Nội dung *</label>
              <textarea
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="Nội dung chi tiết của thông báo..."
                rows={3}
                className="input-base"
                style={{ resize: 'none' }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: sent
                  ? '#10b981'
                  : 'linear-gradient(135deg, #f97316, #ea580c)',
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                opacity: sending ? 0.6 : 1,
                transition: 'background 0.3s',
              }}
            >
              {sent ? (
                <><CheckCircle size={18} /> Đã gửi thành công!</>
              ) : sending ? (
                'Đang gửi...'
              ) : (
                <><Send size={18} /> Gửi thông báo</>
              )}
            </button>
          </div>
        </div>

        {/* Recent Notifications */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Bell size={16} color="#f59e0b" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Thông báo hệ thống gần đây
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton"
                  style={{ height: 48, borderRadius: 8, marginBottom: 8 }} />
              ))}
            </div>
          ) : recentNotifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
                Chưa có thông báo nào
              </p>
            </div>
          ) : (
            <div>
              {recentNotifs.map((notif, idx) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '10px 16px',
                    borderBottom: idx < recentNotifs.length - 1
                      ? '1px solid var(--color-border)'
                      : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: notif.is_read ? '#94a3b8' : '#f97316',
                    marginTop: 6,
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                      {notif.title}
                    </p>
                    <p style={{
                      fontSize: 12, color: 'var(--color-text-muted)',
                      margin: '2px 0 0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {notif.body}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '2px 0 0' }}>
                      Gửi đến @{notif.user?.username || '?'} · {formatTime(notif.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  display: 'block',
  marginBottom: 6,
}

const targetBtnStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 10,
  border: '1.5px solid',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
}
