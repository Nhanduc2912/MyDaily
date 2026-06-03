import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, MoreVertical, UserCheck, UserX, Ban,
  X, Eye, Shield, ShieldOff
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const stateLabels = {
  active: { text: 'Hoạt động', color: '#10b981', bg: '#ecfdf5' },
  suspended: { text: 'Tạm ngưng', color: '#f59e0b', bg: '#fffbeb' },
  banned: { text: 'Đã cấm', color: '#ef4444', bg: '#fef2f2' },
  deactivated: { text: 'Hủy kích hoạt', color: '#64748b', bg: '#f1f5f9' },
}

const roleLabels = {
  user: { text: 'Người dùng', color: '#64748b' },
  admin: { text: 'Admin', color: '#f97316' },
  moderator: { text: 'Moderator', color: '#8b5cf6' },
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterState, setFilterState] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showActionMenu, setShowActionMenu] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [actionReason, setActionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const { profile: adminProfile } = useAuthStore()

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (filterState !== 'all') query = query.eq('state', filterState)
      if (filterRole !== 'all') query = query.eq('role', filterRole)
      if (searchQuery.trim()) {
        query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Load users error:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterState, filterRole])

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300)
    return () => clearTimeout(timer)
  }, [loadUsers])

  async function handleStateChange(userId, newState) {
    if (!actionReason.trim() && newState !== 'active') {
      toast.error('Vui lòng nhập lý do')
      return
    }
    setActionLoading(true)
    try {
      const user = users.find(u => u.id === userId)
      const oldState = user.state

      const { error } = await supabase
        .from('profiles')
        .update({ state: newState, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      // Log state change
      await supabase.from('profile_state_logs').insert({
        profile_id: userId,
        old_state: oldState,
        new_state: newState,
        reason: actionReason || `Chuyển sang ${stateLabels[newState]?.text}`,
        changed_by: adminProfile.id,
      })

      // Log admin action
      await supabase.from('admin_action_logs').insert({
        admin_id: adminProfile.id,
        action: `user_${newState}`,
        target_type: 'user',
        target_id: userId,
        detail: { reason: actionReason, old_state: oldState, new_state: newState },
      })

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: userId,
        from_user_id: adminProfile.id,
        type: 'system',
        title: `Tài khoản ${stateLabels[newState]?.text?.toLowerCase()}`,
        body: actionReason || `Tài khoản của bạn đã được ${stateLabels[newState]?.text?.toLowerCase()}.`,
      })

      setActionReason('')
      setShowActionMenu(null)
      setShowDetail(false)
      loadUsers()
    } catch (err) {
      console.error('State change error:', err)
      toast.error('Có lỗi xảy ra: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRoleChange(userId, newRole) {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      await supabase.from('admin_action_logs').insert({
        admin_id: adminProfile.id,
        action: `role_changed_to_${newRole}`,
        target_type: 'user',
        target_id: userId,
        detail: { new_role: newRole },
      })

      setShowActionMenu(null)
      loadUsers()
    } catch (err) {
      console.error('Role change error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <AdminShell title="Người dùng">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Search */}
        <div style={{
          background: 'white',
          borderRadius: 14,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid var(--color-border)',
        }}>
          <Search size={18} color="var(--color-text-subtle)" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm username hoặc tên hiển thị..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--color-text)',
              background: 'transparent',
              fontFamily: 'var(--font-sans)',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            }}>
              <X size={16} color="var(--color-text-subtle)" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          {/* State Filter */}
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              fontWeight: 500,
              background: filterState !== 'all' ? '#fff7ed' : 'white',
              color: filterState !== 'all' ? '#ea580c' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 'fit-content',
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="suspended">Tạm ngưng</option>
            <option value="banned">Đã cấm</option>
            <option value="deactivated">Hủy kích hoạt</option>
          </select>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              fontWeight: 500,
              background: filterRole !== 'all' ? '#f5f3ff' : 'white',
              color: filterRole !== 'all' ? '#7c3aed' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 'fit-content',
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">Người dùng</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>

        {/* User count */}
        <p style={{
          fontSize: 12,
          color: 'var(--color-text-subtle)',
          margin: 0,
        }}>
          Hiển thị {users.length} người dùng
        </p>

        {/* User List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--color-text-muted)',
          }}>
            <p style={{ fontSize: 14 }}>Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map((user, idx) => {
              const st = stateLabels[user.state] || stateLabels.active
              const rl = roleLabels[user.role] || roleLabels.user
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  style={{
                    background: 'white',
                    borderRadius: 14,
                    padding: '12px 14px',
                    boxShadow: 'var(--shadow-soft)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Avatar */}
                  <div
                    onClick={() => { setSelectedUser(user); setShowDetail(true) }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: user.avatar_url
                        ? `url(${user.avatar_url}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #f97316, #ea580c)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {!user.avatar_url && (user.display_name?.[0] || user.username[0]).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div
                    onClick={() => { setSelectedUser(user); setShowDetail(true) }}
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 600,
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {user.display_name || user.username}
                      </p>
                      {user.role !== 'user' && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: rl.color,
                          background: `${rl.color}15`,
                          padding: '1px 6px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                        }}>
                          {rl.text}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 12,
                      color: 'var(--color-text-subtle)',
                      margin: '2px 0 0',
                    }}>
                      @{user.username} · 🔥 {user.streak_count || 0}
                    </p>
                  </div>

                  {/* State Badge */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: st.color,
                    background: st.bg,
                    padding: '3px 8px',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                  }}>
                    {st.text}
                  </span>

                  {/* Action Menu */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                    >
                      <MoreVertical size={18} color="var(--color-text-subtle)" />
                    </button>

                    <AnimatePresence>
                      {showActionMenu === user.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            background: 'white',
                            borderRadius: 12,
                            boxShadow: 'var(--shadow-modal)',
                            border: '1px solid var(--color-border)',
                            minWidth: 180,
                            zIndex: 20,
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            onClick={() => { setSelectedUser(user); setShowDetail(true); setShowActionMenu(null) }}
                            style={menuItemStyle}
                          >
                            <Eye size={14} /> Xem chi tiết
                          </button>

                          {user.state !== 'active' && (
                            <button
                              onClick={() => handleStateChange(user.id, 'active')}
                              style={{ ...menuItemStyle, color: '#10b981' }}
                            >
                              <UserCheck size={14} /> Kích hoạt
                            </button>
                          )}
                          {user.state === 'active' && (
                            <button
                              onClick={() => {
                                const reason = prompt('Nhập lý do tạm ngưng:')
                                if (reason !== null) {
                                  setActionReason(reason)
                                  handleStateChange(user.id, 'suspended')
                                }
                              }}
                              style={{ ...menuItemStyle, color: '#f59e0b' }}
                            >
                              <UserX size={14} /> Tạm ngưng
                            </button>
                          )}
                          {user.state !== 'banned' && (
                            <button
                              onClick={() => {
                                const reason = prompt('Nhập lý do cấm tài khoản:')
                                if (reason !== null) {
                                  setActionReason(reason)
                                  handleStateChange(user.id, 'banned')
                                }
                              }}
                              style={{ ...menuItemStyle, color: '#ef4444' }}
                            >
                              <Ban size={14} /> Cấm tài khoản
                            </button>
                          )}

                          <div style={{ height: 1, background: 'var(--color-border)' }} />

                          {user.role === 'user' && (
                            <button
                              onClick={() => handleRoleChange(user.id, 'moderator')}
                              style={{ ...menuItemStyle, color: '#8b5cf6' }}
                            >
                              <Shield size={14} /> Nâng Moderator
                            </button>
                          )}
                          {user.role === 'moderator' && (
                            <button
                              onClick={() => handleRoleChange(user.id, 'user')}
                              style={menuItemStyle}
                            >
                              <ShieldOff size={14} /> Hạ về User
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowDetail(false); setSelectedUser(null) }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '20px 20px 0 0',
                width: '100%',
                maxWidth: 480,
                maxHeight: '80vh',
                overflowY: 'auto',
                padding: '20px 16px 32px',
              }}
            >
              {/* Handle */}
              <div style={{
                width: 40,
                height: 4,
                borderRadius: 4,
                background: '#e2e8f0',
                margin: '0 auto 16px',
              }} />

              {/* User Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: selectedUser.avatar_url
                    ? `url(${selectedUser.avatar_url}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {!selectedUser.avatar_url && (selectedUser.display_name?.[0] || selectedUser.username[0]).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    {selectedUser.display_name || selectedUser.username}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    @{selectedUser.username}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 20,
              }}>
                {[
                  { label: 'Vai trò', value: roleLabels[selectedUser.role]?.text || selectedUser.role },
                  { label: 'Trạng thái', value: stateLabels[selectedUser.state]?.text || selectedUser.state },
                  { label: 'Streak', value: `🔥 ${selectedUser.streak_count || 0} ngày` },
                  { label: 'Streak dài nhất', value: `${selectedUser.longest_streak || 0} ngày` },
                  { label: 'Ngày tạo', value: formatDate(selectedUser.created_at) },
                  { label: 'Hoạt động cuối', value: formatDate(selectedUser.last_active_date) },
                  { label: 'Giới tính', value: selectedUser.gender || '—' },
                  { label: 'Múi giờ', value: selectedUser.timezone || '—' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'var(--color-surface-3)',
                    borderRadius: 10,
                    padding: '10px 12px',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: 0 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '2px 0 0' }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {selectedUser.bio && (
                <div style={{
                  background: 'var(--color-surface-3)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 20,
                }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '0 0 4px' }}>Bio</p>
                  <p style={{ fontSize: 13, margin: 0 }}>{selectedUser.bio}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>
                  Hành động
                </h4>

                <textarea
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder="Nhập lý do (bắt buộc khi tạm ngưng/cấm)..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    resize: 'none',
                    outline: 'none',
                  }}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedUser.state !== 'active' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStateChange(selectedUser.id, 'active')}
                      style={{
                        ...actionBtnStyle,
                        background: '#ecfdf5',
                        color: '#10b981',
                        border: '1px solid #10b981',
                      }}
                    >
                      <UserCheck size={14} /> Kích hoạt
                    </button>
                  )}
                  {selectedUser.state === 'active' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStateChange(selectedUser.id, 'suspended')}
                      style={{
                        ...actionBtnStyle,
                        background: '#fffbeb',
                        color: '#f59e0b',
                        border: '1px solid #f59e0b',
                      }}
                    >
                      <UserX size={14} /> Tạm ngưng
                    </button>
                  )}
                  {selectedUser.state !== 'banned' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStateChange(selectedUser.id, 'banned')}
                      style={{
                        ...actionBtnStyle,
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                      }}
                    >
                      <Ban size={14} /> Cấm
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  )
}

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text)',
  fontFamily: 'var(--font-sans)',
  textAlign: 'left',
}

const actionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
}
