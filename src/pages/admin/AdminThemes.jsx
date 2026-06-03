import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit3, Trash2, Save
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const stateLabels = {
  active: { text: 'Hoạt động', color: '#10b981', bg: '#ecfdf5' },
  draft: { text: 'Nháp', color: '#f59e0b', bg: '#fffbeb' },
  archived: { text: 'Lưu trữ', color: '#64748b', bg: '#f1f5f9' },
}

const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export default function AdminThemes() {
  const [themes, setThemes] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTheme, setEditingTheme] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterSlot, setFilterSlot] = useState('all')
  const [filterState, setFilterState] = useState('all')
  const { profile: adminProfile } = useAuthStore()

  // Form state
  const [form, setForm] = useState({
    name_vi: '',
    name_en: '',
    description: '',
    icon: '',
    color_hex: '#f97316',
    time_slot_id: '',
    applicable_days: [],
    valid_from: '',
    valid_to: '',
    state: 'active',
    tags: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load time slots
      const { data: slots } = await supabase
        .from('theme_time_slots')
        .select('*')
        .order('sort_order')

      setTimeSlots(slots || [])

      // Load themes
      let query = supabase
        .from('themes')
        .select(`
          *,
          time_slot:time_slot_id(id, name, icon, start_hour, end_hour)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (filterSlot !== 'all') query = query.eq('time_slot_id', filterSlot)
      if (filterState !== 'all') query = query.eq('state', filterState)

      const { data, error } = await query
      if (error) throw error
      setThemes(data || [])
    } catch (err) {
      console.error('Load themes error:', err)
    } finally {
      setLoading(false)
    }
  }, [filterSlot, filterState])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadData])

  function openForm(theme = null) {
    if (theme) {
      setEditingTheme(theme)
      setForm({
        name_vi: theme.name_vi || '',
        name_en: theme.name_en || '',
        description: theme.description || '',
        icon: theme.icon || '',
        color_hex: theme.color_hex || '#f97316',
        time_slot_id: theme.time_slot_id || '',
        applicable_days: theme.applicable_days || [],
        valid_from: theme.valid_from || '',
        valid_to: theme.valid_to || '',
        state: theme.state || 'active',
        tags: (theme.tags || []).join(', '),
      })
    } else {
      setEditingTheme(null)
      setForm({
        name_vi: '',
        name_en: '',
        description: '',
        icon: '📸',
        color_hex: '#f97316',
        time_slot_id: timeSlots[0]?.id || '',
        applicable_days: [],
        valid_from: '',
        valid_to: '',
        state: 'active',
        tags: '',
      })
    }
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name_vi.trim()) {
      toast.error('Vui lòng nhập tên chủ đề')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name_vi: form.name_vi.trim(),
        name_en: form.name_en.trim() || null,
        description: form.description.trim() || null,
        icon: form.icon || null,
        color_hex: form.color_hex || null,
        time_slot_id: form.time_slot_id || null,
        applicable_days: form.applicable_days.length > 0 ? form.applicable_days : null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        state: form.state,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      }

      if (editingTheme) {
        const { error } = await supabase
          .from('themes')
          .update(payload)
          .eq('id', editingTheme.id)
        if (error) throw error

        await supabase.from('admin_action_logs').insert({
          admin_id: adminProfile.id,
          action: 'theme_updated',
          target_type: 'theme',
          target_id: editingTheme.id,
          detail: { name_vi: payload.name_vi },
        })
      } else {
        payload.created_by = adminProfile.id
        const { error } = await supabase
          .from('themes')
          .insert(payload)
        if (error) throw error

        await supabase.from('admin_action_logs').insert({
          admin_id: adminProfile.id,
          action: 'theme_created',
          target_type: 'theme',
          detail: { name_vi: payload.name_vi },
        })
      }

      setShowForm(false)
      loadData()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(theme) {
    if (!confirm(`Xóa chủ đề "${theme.name_vi}"?`)) return
    try {
      const { error } = await supabase
        .from('themes')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: adminProfile.id,
        })
        .eq('id', theme.id)

      if (error) throw error

      await supabase.from('admin_action_logs').insert({
        admin_id: adminProfile.id,
        action: 'theme_deleted',
        target_type: 'theme',
        target_id: theme.id,
        detail: { name_vi: theme.name_vi },
      })

      loadData()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  function toggleDay(day) {
    setForm(prev => ({
      ...prev,
      applicable_days: prev.applicable_days.includes(day)
        ? prev.applicable_days.filter(d => d !== day)
        : [...prev.applicable_days, day].sort()
    }))
  }

  return (
    <AdminShell title="Quản lý chủ đề">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            {themes.length} chủ đề
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
            <Plus size={16} /> Thêm chủ đề
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          <select
            value={filterSlot}
            onChange={e => setFilterSlot(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              fontWeight: 500,
              background: filterSlot !== 'all' ? '#fff7ed' : 'white',
              color: filterSlot !== 'all' ? '#ea580c' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 'fit-content',
            }}
          >
            <option value="all">Tất cả khung giờ</option>
            {timeSlots.map(slot => (
              <option key={slot.id} value={slot.id}>
                {slot.icon} {slot.name}
              </option>
            ))}
          </select>

          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              fontWeight: 500,
              background: filterState !== 'all' ? '#f5f3ff' : 'white',
              color: filterState !== 'all' ? '#7c3aed' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 'fit-content',
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="draft">Nháp</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </div>

        {/* Theme List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />
            ))}
          </div>
        ) : themes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Không có chủ đề nào</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {themes.map((theme, idx) => {
              const st = stateLabels[theme.state] || stateLabels.active
              return (
                <motion.div
                  key={theme.id}
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
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: 12,
                    background: theme.color_hex
                      ? `${theme.color_hex}20`
                      : '#fff7ed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                  }}>
                    {theme.icon || '📸'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 600, margin: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {theme.name_vi}
                      </p>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: st.color, background: st.bg,
                        padding: '1px 6px', borderRadius: 6,
                      }}>
                        {st.text}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 11, color: 'var(--color-text-subtle)',
                      margin: '2px 0 0',
                    }}>
                      {theme.time_slot?.icon} {theme.time_slot?.name || 'Không xác định'}
                      {theme.applicable_days?.length > 0 && (
                        <> · {theme.applicable_days.map(d => dayNames[d - 1]).join(', ')}</>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => openForm(theme)}
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
                    <button
                      onClick={() => handleDelete(theme)}
                      style={{
                        width: 32, height: 32,
                        borderRadius: 8,
                        border: 'none',
                        background: '#fef2f2',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} color="#ef4444" />
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
                {editingTheme ? 'Chỉnh sửa chủ đề' : 'Thêm chủ đề mới'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name VI */}
                <div>
                  <label style={labelStyle}>Tên tiếng Việt *</label>
                  <input
                    value={form.name_vi}
                    onChange={e => setForm({ ...form, name_vi: e.target.value })}
                    placeholder="VD: Dậy sớm"
                    className="input-base"
                  />
                </div>

                {/* Name EN */}
                <div>
                  <label style={labelStyle}>Tên tiếng Anh</label>
                  <input
                    value={form.name_en}
                    onChange={e => setForm({ ...form, name_en: e.target.value })}
                    placeholder="VD: Early Rise"
                    className="input-base"
                  />
                </div>

                {/* Icon & Color */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Icon (Emoji)</label>
                    <input
                      value={form.icon}
                      onChange={e => setForm({ ...form, icon: e.target.value })}
                      placeholder="🌅"
                      className="input-base"
                      style={{ textAlign: 'center', fontSize: 20 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Màu sắc</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={form.color_hex}
                        onChange={e => setForm({ ...form, color_hex: e.target.value })}
                        style={{
                          width: 44, height: 44,
                          border: '2px solid var(--color-border)',
                          borderRadius: 10,
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      />
                      <input
                        value={form.color_hex}
                        onChange={e => setForm({ ...form, color_hex: e.target.value })}
                        className="input-base"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle}>Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Mô tả ngắn cho chủ đề..."
                    rows={2}
                    className="input-base"
                    style={{ resize: 'none' }}
                  />
                </div>

                {/* Time Slot */}
                <div>
                  <label style={labelStyle}>Khung giờ</label>
                  <select
                    value={form.time_slot_id}
                    onChange={e => setForm({ ...form, time_slot_id: e.target.value })}
                    className="input-base"
                  >
                    <option value="">Không xác định</option>
                    {timeSlots.map(slot => (
                      <option key={slot.id} value={slot.id}>
                        {slot.icon} {slot.name} ({slot.start_hour}:00 - {slot.end_hour}:00)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Applicable Days */}
                <div>
                  <label style={labelStyle}>Áp dụng ngày (để trống = tất cả)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {dayNames.map((day, i) => {
                      const dayNum = i + 1
                      const isSelected = form.applicable_days.includes(dayNum)
                      return (
                        <button
                          key={dayNum}
                          onClick={() => toggleDay(dayNum)}
                          style={{
                            width: 36, height: 36,
                            borderRadius: 10,
                            border: isSelected ? '2px solid #f97316' : '1px solid var(--color-border)',
                            background: isSelected ? '#fff7ed' : 'white',
                            color: isSelected ? '#ea580c' : 'var(--color-text-muted)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Valid Date Range */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Từ ngày</label>
                    <input
                      type="date"
                      value={form.valid_from}
                      onChange={e => setForm({ ...form, valid_from: e.target.value })}
                      className="input-base"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Đến ngày</label>
                    <input
                      type="date"
                      value={form.valid_to}
                      onChange={e => setForm({ ...form, valid_to: e.target.value })}
                      className="input-base"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label style={labelStyle}>Tags (cách nhau bởi dấu phẩy)</label>
                  <input
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="VD: sáng, tập thể dục, khỏe mạnh"
                    className="input-base"
                  />
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
                    <option value="draft">Nháp</option>
                    <option value="archived">Lưu trữ</option>
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
                    {saving ? 'Đang lưu...' : editingTheme ? 'Cập nhật' : 'Tạo mới'}
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
