import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Save, Award, Star } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'

const rarityLabels = {
  common: { text: 'Phổ thông', color: '#64748b', bg: '#f1f5f9' },
  rare: { text: 'Hiếm', color: '#3b82f6', bg: '#eff6ff' },
  epic: { text: 'Sử thi', color: '#8b5cf6', bg: '#f5f3ff' },
  legendary: { text: 'Huyền thoại', color: '#f59e0b', bg: '#fffbeb' },
}

const conditionTypes = [
  { value: 'streak_days', label: 'Số ngày streak' },
  { value: 'streak_morning', label: 'Streak buổi sáng' },
  { value: 'post_count', label: 'Số bài đăng' },
  { value: 'todo_complete_streak', label: 'Streak hoàn thành to-do' },
  { value: 'todo_late_night', label: 'To-do đêm khuya' },
  { value: 'posts_per_day_slots', label: 'Bài đăng nhiều khung giờ/ngày' },
  { value: 'friend_count', label: 'Số bạn bè' },
  { value: 'reaction_received', label: 'Reaction nhận được' },
  { value: 'custom', label: 'Tùy chỉnh' },
]

export default function AdminBadges() {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBadge, setEditingBadge] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterRarity, setFilterRarity] = useState('all')
  const { profile: adminProfile } = useAuthStore()

  const [form, setForm] = useState({
    code: '',
    name_vi: '',
    name_en: '',
    description_vi: '',
    icon: '',
    condition_type: 'streak_days',
    condition_value: '{}',
    rarity: 'common',
    state: 'active',
  })

  const loadBadges = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterRarity !== 'all') query = query.eq('rarity', filterRarity)

      const { data, error } = await query
      if (error) throw error
      setBadges(data || [])
    } catch (err) {
      console.error('Load badges error:', err)
    } finally {
      setLoading(false)
    }
  }, [filterRarity])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBadges()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadBadges])

  function openForm(badge = null) {
    if (badge) {
      setEditingBadge(badge)
      setForm({
        code: badge.code || '',
        name_vi: badge.name_vi || '',
        name_en: badge.name_en || '',
        description_vi: badge.description_vi || '',
        icon: badge.icon || '',
        condition_type: badge.condition_type || 'streak_days',
        condition_value: JSON.stringify(badge.condition_value || {}, null, 2),
        rarity: badge.rarity || 'common',
        state: badge.state || 'active',
      })
    } else {
      setEditingBadge(null)
      setForm({
        code: '',
        name_vi: '',
        name_en: '',
        description_vi: '',
        icon: '🏆',
        condition_type: 'streak_days',
        condition_value: '{"days": 7}',
        rarity: 'common',
        state: 'active',
      })
    }
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name_vi.trim()) {
      alert('Vui lòng nhập mã và tên huy hiệu')
      return
    }

    let conditionValue
    try {
      conditionValue = JSON.parse(form.condition_value)
    } catch {
      alert('Điều kiện JSON không hợp lệ')
      return
    }

    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name_vi: form.name_vi.trim(),
        name_en: form.name_en.trim() || null,
        description_vi: form.description_vi.trim() || null,
        icon: form.icon || null,
        condition_type: form.condition_type,
        condition_value: conditionValue,
        rarity: form.rarity,
        state: form.state,
      }

      if (editingBadge) {
        const { error } = await supabase
          .from('badges')
          .update(payload)
          .eq('id', editingBadge.id)
        if (error) throw error

        await supabase.from('admin_action_logs').insert({
          admin_id: adminProfile.id,
          action: 'badge_updated',
          target_type: 'badge',
          target_id: editingBadge.id,
          detail: { name_vi: payload.name_vi },
        })
      } else {
        const { error } = await supabase
          .from('badges')
          .insert(payload)
        if (error) throw error

        await supabase.from('admin_action_logs').insert({
          admin_id: adminProfile.id,
          action: 'badge_created',
          target_type: 'badge',
          detail: { name_vi: payload.name_vi, code: payload.code },
        })
      }

      setShowForm(false)
      loadBadges()
    } catch (err) {
      console.error('Save error:', err)
      alert('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleState(badge) {
    try {
      const newState = badge.state === 'active' ? 'inactive' : 'active'
      const { error } = await supabase
        .from('badges')
        .update({ state: newState })
        .eq('id', badge.id)
      if (error) throw error
      loadBadges()
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  return (
    <AdminShell title="Quản lý huy hiệu">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            {badges.length} huy hiệu
          </p>
          <button
            onClick={() => openForm()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Plus size={16} /> Thêm huy hiệu
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterRarity}
            onChange={e => setFilterRarity(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              fontWeight: 500,
              background: filterRarity !== 'all' ? '#fff7ed' : 'white',
              color: filterRarity !== 'all' ? '#ea580c' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Tất cả độ hiếm</option>
            <option value="common">Phổ thông</option>
            <option value="rare">Hiếm</option>
            <option value="epic">Sử thi</option>
            <option value="legendary">Huyền thoại</option>
          </select>
        </div>

        {/* Badge List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />
            ))}
          </div>
        ) : badges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Award size={40} color="var(--color-text-subtle)" />
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8 }}>
              Không có huy hiệu nào
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {badges.map((badge, idx) => {
              const rarity = rarityLabels[badge.rarity] || rarityLabels.common
              return (
                <motion.div
                  key={badge.id}
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
                    opacity: badge.state === 'inactive' ? 0.5 : 1,
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 48, height: 48,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${rarity.bg}, white)`,
                    border: `2px solid ${rarity.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0,
                  }}>
                    {badge.icon || '🏆'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{
                        fontSize: 14, fontWeight: 600, margin: 0,
                      }}>
                        {badge.name_vi}
                      </p>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: rarity.color, background: rarity.bg,
                        padding: '2px 6px', borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {rarity.text}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 12, color: 'var(--color-text-subtle)',
                      margin: '2px 0 0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {badge.description_vi || badge.code}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleToggleState(badge)}
                      title={badge.state === 'active' ? 'Tắt' : 'Bật'}
                      style={{
                        width: 32, height: 32,
                        borderRadius: 8,
                        border: 'none',
                        background: badge.state === 'active' ? '#ecfdf5' : '#fef2f2',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Star
                        size={14}
                        color={badge.state === 'active' ? '#10b981' : '#ef4444'}
                        fill={badge.state === 'active' ? '#10b981' : 'none'}
                      />
                    </button>
                    <button
                      onClick={() => openForm(badge)}
                      style={{
                        width: 32, height: 32,
                        borderRadius: 8,
                        border: 'none',
                        background: '#eff6ff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit3 size={14} color="#3b82f6" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
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
              initial={{ y: 600 }}
              animate={{ y: 0 }}
              exit={{ y: 600 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '20px 20px 0 0',
                width: '100%',
                maxWidth: 480,
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: '20px 16px 32px',
              }}
            >
              {/* Handle */}
              <div style={{
                width: 40, height: 4, borderRadius: 4,
                background: '#e2e8f0', margin: '0 auto 16px',
              }} />

              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
                {editingBadge ? 'Chỉnh sửa huy hiệu' : 'Thêm huy hiệu mới'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Code */}
                <div>
                  <label style={labelStyle}>Mã huy hiệu * (viết hoa, không dấu)</label>
                  <input
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    placeholder="VD: EARLY_BIRD"
                    className="input-base"
                    disabled={!!editingBadge}
                    style={editingBadge ? { opacity: 0.6 } : {}}
                  />
                </div>

                {/* Name VI */}
                <div>
                  <label style={labelStyle}>Tên tiếng Việt *</label>
                  <input
                    value={form.name_vi}
                    onChange={e => setForm({ ...form, name_vi: e.target.value })}
                    placeholder="VD: Chim Sớm"
                    className="input-base"
                  />
                </div>

                {/* Name EN */}
                <div>
                  <label style={labelStyle}>Tên tiếng Anh</label>
                  <input
                    value={form.name_en}
                    onChange={e => setForm({ ...form, name_en: e.target.value })}
                    placeholder="VD: Early Bird"
                    className="input-base"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label style={labelStyle}>Icon (Emoji)</label>
                  <input
                    value={form.icon}
                    onChange={e => setForm({ ...form, icon: e.target.value })}
                    placeholder="🏆"
                    className="input-base"
                    style={{ textAlign: 'center', fontSize: 24 }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle}>Mô tả</label>
                  <textarea
                    value={form.description_vi}
                    onChange={e => setForm({ ...form, description_vi: e.target.value })}
                    placeholder="Mô tả cách đạt được huy hiệu..."
                    rows={2}
                    className="input-base"
                    style={{ resize: 'none' }}
                  />
                </div>

                {/* Condition Type */}
                <div>
                  <label style={labelStyle}>Loại điều kiện</label>
                  <select
                    value={form.condition_type}
                    onChange={e => setForm({ ...form, condition_type: e.target.value })}
                    className="input-base"
                  >
                    {conditionTypes.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>

                {/* Condition Value */}
                <div>
                  <label style={labelStyle}>Giá trị điều kiện (JSON)</label>
                  <textarea
                    value={form.condition_value}
                    onChange={e => setForm({ ...form, condition_value: e.target.value })}
                    placeholder='{"days": 7}'
                    rows={3}
                    className="input-base"
                    style={{ resize: 'none', fontFamily: 'monospace', fontSize: 13 }}
                  />
                </div>

                {/* Rarity */}
                <div>
                  <label style={labelStyle}>Độ hiếm</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Object.entries(rarityLabels).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setForm({ ...form, rarity: key })}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: 10,
                          border: form.rarity === key
                            ? `2px solid ${val.color}`
                            : '1px solid var(--color-border)',
                          background: form.rarity === key ? val.bg : 'white',
                          color: form.rarity === key ? val.color : 'var(--color-text-muted)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {val.text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* State */}
                <div>
                  <label style={labelStyle}>Trạng thái</label>
                  <select
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    className="input-base"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                  </select>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'white',
                      color: 'var(--color-text)',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      opacity: saving ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'Đang lưu...' : editingBadge ? 'Cập nhật' : 'Tạo mới'}
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

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  display: 'block',
  marginBottom: 6,
}
