import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, Eye, Trash2, CheckCircle, XCircle,
  AlertTriangle, Flag, X, RotateCcw, Image as ImageIcon
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'

const moderationLabels = {
  approved: { text: 'Đã duyệt', color: '#10b981', bg: '#ecfdf5' },
  pending: { text: 'Chờ duyệt', color: '#f59e0b', bg: '#fffbeb' },
  rejected: { text: 'Từ chối', color: '#ef4444', bg: '#fef2f2' },
  removed: { text: 'Đã gỡ', color: '#64748b', bg: '#f1f5f9' },
}

const reportReasons = {
  nudity: { text: 'Nội dung nhạy cảm', emoji: '🔞' },
  spam: { text: 'Spam', emoji: '🚫' },
  hate: { text: 'Kích động thù hận', emoji: '😡' },
  violence: { text: 'Bạo lực', emoji: '⚠️' },
  other: { text: 'Khác', emoji: '📝' },
}

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'flagged', label: '🚩 Bị gắn cờ' },
  { key: 'reports', label: '⚠️ Báo cáo' },
]

export default function AdminPosts() {
  const [activeTab, setActiveTab] = useState('all')
  const [posts, setPosts] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMod, setFilterMod] = useState('all')
  const [selectedPost, setSelectedPost] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [moderationNote, setModerationNote] = useState('')
  const { profile: adminProfile } = useAuthStore()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'reports') {
        let query = supabase
          .from('post_reports')
          .select(`
            *,
            reporter:reporter_id(username, display_name, avatar_url),
            post:post_id(
              id, image_url, custom_title, caption, taken_at,
              moderation_state, is_flagged, is_deleted,
              user:user_id(username, display_name, avatar_url)
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50)

        if (filterMod !== 'all') query = query.eq('state', filterMod)
        const { data, error } = await query
        if (error) throw error
        setReports(data || [])
      } else {
        let query = supabase
          .from('posts')
          .select(`
            *,
            user:user_id(username, display_name, avatar_url),
            theme:theme_id(name_vi, icon),
            time_slot:time_slot_id(name, icon),
            _reports:post_reports(count)
          `)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(50)

        if (activeTab === 'flagged') {
          query = query.eq('is_flagged', true)
        }
        if (filterMod !== 'all') {
          query = query.eq('moderation_state', filterMod)
        }
        if (searchQuery.trim()) {
          query = query.or(`custom_title.ilike.%${searchQuery}%,caption.ilike.%${searchQuery}%`)
        }

        const { data, error } = await query
        if (error) throw error
        setPosts(data || [])
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, filterMod, searchQuery])

  useEffect(() => {
    const timer = setTimeout(loadData, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  async function handleModeration(postId, action) {
    setActionLoading(true)
    try {
      const newState = action === 'approve' ? 'approved'
        : action === 'reject' ? 'rejected'
        : action === 'remove' ? 'removed'
        : 'approved'

      const updates = {
        moderation_state: newState,
        moderated_by: adminProfile.id,
        moderated_at: new Date().toISOString(),
      }

      if (action === 'remove') {
        updates.state = 'removed'
        updates.is_flagged = false
      }
      if (action === 'approve') {
        updates.is_flagged = false
      }

      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)

      if (error) throw error

      // Log moderation
      await supabase.from('post_moderation_logs').insert({
        post_id: postId,
        action: newState === 'approved' ? 'approved'
          : newState === 'rejected' ? 'rejected'
          : 'removed',
        reason: moderationNote || undefined,
        note: moderationNote || undefined,
        actioned_by: adminProfile.id,
      })

      // Log admin action
      await supabase.from('admin_action_logs').insert({
        admin_id: adminProfile.id,
        action: `post_${newState}`,
        target_type: 'post',
        target_id: postId,
        detail: { moderation_state: newState, note: moderationNote },
      })

      // Get post owner to notify
      const post = posts.find(p => p.id === postId) || selectedPost
      if (post && (newState === 'rejected' || newState === 'removed')) {
        await supabase.from('notifications').insert({
          user_id: post.user_id || post.user?.id,
          from_user_id: adminProfile.id,
          type: 'post_moderated',
          ref_type: 'post',
          ref_id: postId,
          title: newState === 'removed' ? 'Bài đăng đã bị gỡ' : 'Bài đăng bị từ chối',
          body: moderationNote || 'Bài đăng của bạn vi phạm quy định cộng đồng.',
        })
      }

      setModerationNote('')
      setShowDetail(false)
      setSelectedPost(null)
      loadData()
    } catch (err) {
      console.error('Moderation error:', err)
      alert('Lỗi: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReportAction(reportId, action) {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('post_reports')
        .update({
          state: action,
          reviewed_by: adminProfile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (error) throw error
      loadData()
    } catch (err) {
      console.error('Report action error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSoftDelete(postId) {
    if (!confirm('Xóa mềm bài đăng này? Bài đăng sẽ bị ẩn khỏi người dùng.')) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: adminProfile.id,
        })
        .eq('id', postId)

      if (error) throw error

      await supabase.from('admin_action_logs').insert({
        admin_id: adminProfile.id,
        action: 'post_removed',
        target_type: 'post',
        target_id: postId,
      })

      setShowDetail(false)
      loadData()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <AdminShell title="Bài đăng & Kiểm duyệt">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--color-surface-3)',
          borderRadius: 12,
          padding: 4,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setFilterMod('all') }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                background: activeTab === tab.key
                  ? 'white'
                  : 'transparent',
                color: activeTab === tab.key
                  ? 'var(--color-text)'
                  : 'var(--color-text-muted)',
                boxShadow: activeTab === tab.key ? 'var(--shadow-soft)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search - only for posts tab */}
        {activeTab !== 'reports' && (
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
              placeholder="Tìm theo tiêu đề hoặc mô tả..."
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 14,
                color: 'var(--color-text)', background: 'transparent',
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
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterMod}
            onChange={e => setFilterMod(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              fontWeight: 500,
              background: filterMod !== 'all' ? '#fff7ed' : 'white',
              color: filterMod !== 'all' ? '#ea580c' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {activeTab === 'reports' ? (
              <>
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="reviewed">Đã xem xét</option>
                <option value="dismissed">Đã bỏ qua</option>
                <option value="actioned">Đã xử lý</option>
              </>
            ) : (
              <>
                <option value="all">Tất cả trạng thái</option>
                <option value="approved">Đã duyệt</option>
                <option value="pending">Chờ duyệt</option>
                <option value="rejected">Từ chối</option>
                <option value="removed">Đã gỡ</option>
              </>
            )}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />
            ))}
          </div>
        ) : activeTab === 'reports' ? (
          /* Reports View */
          reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <CheckCircle size={40} color="#10b981" />
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8 }}>
                Không có báo cáo nào
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reports.map((report, idx) => {
                const reason = reportReasons[report.reason] || reportReasons.other
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{
                      background: 'white',
                      borderRadius: 14,
                      padding: 14,
                      boxShadow: 'var(--shadow-soft)',
                      border: report.state === 'pending'
                        ? '2px solid #f59e0b'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12 }}>
                      {/* Post thumbnail */}
                      <div style={{
                        width: 64, height: 64,
                        borderRadius: 10,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#f1f5f9',
                      }}>
                        {report.post?.image_url && (
                          <img src={report.post.image_url} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 12, fontWeight: 600,
                            color: report.state === 'pending' ? '#f59e0b' : '#64748b',
                            background: report.state === 'pending' ? '#fffbeb' : '#f1f5f9',
                            padding: '2px 8px', borderRadius: 6,
                          }}>
                            {report.state === 'pending' ? 'Chờ xử lý' :
                             report.state === 'reviewed' ? 'Đã xem' :
                             report.state === 'dismissed' ? 'Bỏ qua' : 'Đã xử lý'}
                          </span>
                        </div>

                        <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>
                          {reason.emoji} {reason.text}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: 0 }}>
                          Báo cáo bởi @{report.reporter?.username} · {formatTime(report.created_at)}
                        </p>
                        {report.description && (
                          <p style={{
                            fontSize: 12, color: 'var(--color-text-muted)',
                            margin: '4px 0 0',
                            fontStyle: 'italic',
                          }}>
                            "{report.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    {report.state === 'pending' && (
                      <div style={{
                        display: 'flex', gap: 8, marginTop: 10,
                        justifyContent: 'flex-end',
                      }}>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleReportAction(report.id, 'dismissed')}
                          style={{
                            ...smallBtnStyle,
                            background: '#f1f5f9', color: '#64748b',
                          }}
                        >
                          Bỏ qua
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => {
                            handleReportAction(report.id, 'actioned')
                            if (report.post) handleModeration(report.post.id, 'remove')
                          }}
                          style={{
                            ...smallBtnStyle,
                            background: '#fef2f2', color: '#ef4444',
                          }}
                        >
                          Gỡ bài
                        </button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )
        ) : (
          /* Posts View */
          posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <ImageIcon size={40} color="var(--color-text-subtle)" />
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8 }}>
                Không có bài đăng nào
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {posts.map((post, idx) => {
                const mod = moderationLabels[post.moderation_state] || moderationLabels.approved
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => { setSelectedPost(post); setShowDetail(true) }}
                    style={{
                      background: 'white',
                      borderRadius: 14,
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-soft)',
                      border: post.is_flagged
                        ? '2px solid #ef4444'
                        : '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Image */}
                    <div style={{
                      width: '100%',
                      height: 140,
                      background: '#f1f5f9',
                      position: 'relative',
                    }}>
                      <img
                        src={post.image_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      {/* Moderation badge */}
                      <span style={{
                        position: 'absolute',
                        top: 6, right: 6,
                        fontSize: 10, fontWeight: 600,
                        color: mod.color,
                        background: mod.bg,
                        padding: '2px 6px',
                        borderRadius: 6,
                      }}>
                        {mod.text}
                      </span>
                      {post.is_flagged && (
                        <span style={{
                          position: 'absolute',
                          top: 6, left: 6,
                          fontSize: 14,
                        }}>
                          🚩
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{
                        fontSize: 12, fontWeight: 500, margin: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {post.custom_title || post.theme?.name_vi || 'Không tiêu đề'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '2px 0 0' }}>
                        @{post.user?.username} · {formatTime(post.taken_at)}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowDetail(false); setSelectedPost(null); setModerationNote('') }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ y: 500 }}
              animate={{ y: 0 }}
              exit={{ y: 500 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '20px 20px 0 0',
                width: '100%',
                maxWidth: 480,
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              {/* Image */}
              <div style={{
                width: '100%',
                height: 280,
                background: '#0f172a',
                position: 'relative',
              }}>
                <img
                  src={selectedPost.image_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <button
                  onClick={() => { setShowDetail(false); setSelectedPost(null); setModerationNote('') }}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 32, height: 32,
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color="white" />
                </button>
              </div>

              <div style={{ padding: '16px 16px 32px' }}>
                {/* Post Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: 10,
                    background: selectedPost.user?.avatar_url
                      ? `url(${selectedPost.user.avatar_url}) center/cover`
                      : 'linear-gradient(135deg, #f97316, #ea580c)',
                    flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {selectedPost.user?.display_name || selectedPost.user?.username}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: '2px 0 0' }}>
                      {formatTime(selectedPost.taken_at)}
                      {selectedPost.theme && ` · ${selectedPost.theme.icon} ${selectedPost.theme.name_vi}`}
                    </p>
                  </div>
                </div>

                {selectedPost.custom_title && (
                  <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>
                    {selectedPost.custom_title}
                  </p>
                )}
                {selectedPost.caption && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
                    {selectedPost.caption}
                  </p>
                )}

                {/* Status info */}
                <div style={{
                  display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 6,
                    ...(() => {
                      const m = moderationLabels[selectedPost.moderation_state]
                      return { color: m?.color, background: m?.bg }
                    })(),
                  }}>
                    {moderationLabels[selectedPost.moderation_state]?.text}
                  </span>
                  {selectedPost.is_flagged && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 6,
                      color: '#ef4444', background: '#fef2f2',
                    }}>
                      🚩 Gắn cờ ({selectedPost.flag_count})
                    </span>
                  )}
                  <span style={{
                    fontSize: 11,
                    padding: '3px 8px', borderRadius: 6,
                    color: 'var(--color-text-subtle)',
                    background: 'var(--color-surface-3)',
                  }}>
                    {selectedPost.visibility}
                  </span>
                </div>

                {/* Moderation Note */}
                <textarea
                  value={moderationNote}
                  onChange={e => setModerationNote(e.target.value)}
                  placeholder="Ghi chú kiểm duyệt (sẽ gửi cho người dùng khi gỡ/từ chối)..."
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
                    marginBottom: 12,
                  }}
                />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedPost.moderation_state !== 'approved' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleModeration(selectedPost.id, 'approve')}
                      style={{
                        ...actionBtnStyle,
                        background: '#ecfdf5', color: '#10b981',
                        border: '1px solid #10b981',
                      }}
                    >
                      <CheckCircle size={14} /> Duyệt
                    </button>
                  )}
                  <button
                    disabled={actionLoading}
                    onClick={() => handleModeration(selectedPost.id, 'reject')}
                    style={{
                      ...actionBtnStyle,
                      background: '#fffbeb', color: '#f59e0b',
                      border: '1px solid #f59e0b',
                    }}
                  >
                    <XCircle size={14} /> Từ chối
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleModeration(selectedPost.id, 'remove')}
                    style={{
                      ...actionBtnStyle,
                      background: '#fef2f2', color: '#ef4444',
                      border: '1px solid #ef4444',
                    }}
                  >
                    <Trash2 size={14} /> Gỡ bài
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleSoftDelete(selectedPost.id)}
                    style={{
                      ...actionBtnStyle,
                      background: '#f1f5f9', color: '#64748b',
                      border: '1px solid #94a3b8',
                    }}
                  >
                    <Trash2 size={14} /> Xóa mềm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  )
}

const smallBtnStyle = {
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
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
