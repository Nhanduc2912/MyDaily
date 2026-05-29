import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Save, RotateCcw, Settings, Database, Shield, Bell, Image as ImageIcon
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'

const settingGroups = [
  {
    title: 'Bài đăng',
    icon: ImageIcon,
    color: '#10b981',
    keys: ['max_posts_per_day', 'auto_approve_posts'],
  },
  {
    title: 'Đăng ký & Bảo trì',
    icon: Shield,
    color: '#3b82f6',
    keys: ['allow_registration', 'maintenance_mode'],
  },
  {
    title: 'Thông báo Push',
    icon: Bell,
    color: '#f59e0b',
    keys: ['push_reminder_enabled', 'push_reminder_hours'],
  },
  {
    title: 'Tương tác',
    icon: Settings,
    color: '#8b5cf6',
    keys: ['max_reactions_per_post', 'friend_request_limit'],
  },
]

const settingsMeta = {
  max_posts_per_day: {
    label: 'Số ảnh tối đa mỗi ngày',
    type: 'number',
    hint: 'Giới hạn số ảnh người dùng có thể đăng trong 1 ngày',
  },
  auto_approve_posts: {
    label: 'Tự động duyệt ảnh',
    type: 'boolean',
    hint: 'Bật = ảnh xuất hiện ngay. Tắt = chờ admin duyệt',
  },
  allow_registration: {
    label: 'Cho phép đăng ký mới',
    type: 'boolean',
    hint: 'Tắt để ngừng nhận đăng ký tài khoản mới',
  },
  maintenance_mode: {
    label: 'Chế độ bảo trì',
    type: 'boolean',
    hint: 'Bật để hiển thị trang bảo trì cho người dùng',
  },
  push_reminder_enabled: {
    label: 'Bật nhắc nhở Push',
    type: 'boolean',
    hint: 'Gửi thông báo nhắc chụp ảnh tại các khung giờ',
  },
  push_reminder_hours: {
    label: 'Khung giờ nhắc nhở',
    type: 'array_number',
    hint: 'Danh sách giờ gửi push (0-23)',
  },
  max_reactions_per_post: {
    label: 'Số loại emoji tối đa / bài',
    type: 'number',
    hint: 'Số loại emoji khác nhau có thể react',
  },
  friend_request_limit: {
    label: 'Giới hạn lời mời kết bạn',
    type: 'number',
    hint: 'Số lời mời kết bạn chờ duyệt tối đa',
  },
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({})
  const [originalSettings, setOriginalSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { profile: adminProfile } = useAuthStore()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key')

      if (error) throw error

      const settingsMap = {}
      ;(data || []).forEach(s => {
        settingsMap[s.key] = {
          id: s.id,
          value: s.value?.value,
          description: s.description,
        }
      })
      setSettings(settingsMap)
      setOriginalSettings(JSON.parse(JSON.stringify(settingsMap)))
    } catch (err) {
      console.error('Load settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  function updateSetting(key, newValue) {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value: newValue },
    }))
  }

  function hasChanges() {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const changedKeys = Object.keys(settings).filter(
        key => JSON.stringify(settings[key]?.value) !== JSON.stringify(originalSettings[key]?.value)
      )

      for (const key of changedKeys) {
        const { error } = await supabase
          .from('app_settings')
          .update({
            value: { value: settings[key].value },
            updated_by: adminProfile.id,
          })
          .eq('key', key)

        if (error) throw error
      }

      // Log
      await supabase.from('admin_action_logs').insert({
        admin_id: adminProfile.id,
        action: 'setting_updated',
        target_type: 'setting',
        detail: {
          changed_keys: changedKeys,
          changes: changedKeys.reduce((acc, key) => {
            acc[key] = { from: originalSettings[key]?.value, to: settings[key]?.value }
            return acc
          }, {}),
        },
      })

      setOriginalSettings(JSON.parse(JSON.stringify(settings)))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Save error:', err)
      alert('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setSettings(JSON.parse(JSON.stringify(originalSettings)))
  }

  if (loading) {
    return (
      <AdminShell title="Cài đặt hệ thống">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Cài đặt hệ thống">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Save bar */}
        {hasChanges() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#fff7ed',
              border: '1px solid #f97316',
              borderRadius: 14,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: '#ea580c' }}>
              Có thay đổi chưa lưu
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <RotateCcw size={12} /> Hoàn tác
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Save size={12} /> {saving ? 'Lưu...' : 'Lưu'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Success message */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: 14,
              padding: '10px 14px',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: '#10b981',
            }}
          >
            ✅ Đã lưu thành công!
          </motion.div>
        )}

        {/* Setting Groups */}
        {settingGroups.map((group, gi) => {
          const Icon = group.icon
          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.08 }}
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
                gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  background: `${group.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={16} color={group.color} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{group.title}</span>
              </div>

              <div style={{ padding: '8px 0' }}>
                {group.keys.map((key, i) => {
                  const meta = settingsMeta[key]
                  const setting = settings[key]
                  if (!meta || !setting) return null

                  return (
                    <div
                      key={key}
                      style={{
                        padding: '12px 16px',
                        borderBottom: i < group.keys.length - 1
                          ? '1px solid var(--color-border)'
                          : 'none',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                            {meta.label}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '2px 0 0' }}>
                            {meta.hint}
                          </p>
                        </div>

                        {/* Value Editor */}
                        {meta.type === 'boolean' && (
                          <button
                            onClick={() => updateSetting(key, !setting.value)}
                            style={{
                              width: 52, height: 28,
                              borderRadius: 14,
                              border: 'none',
                              cursor: 'pointer',
                              position: 'relative',
                              background: setting.value
                                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                                : '#e2e8f0',
                              transition: 'background 0.2s',
                              flexShrink: 0,
                            }}
                          >
                            <div style={{
                              position: 'absolute',
                              top: 3,
                              left: setting.value ? 27 : 3,
                              width: 22, height: 22,
                              borderRadius: 11,
                              background: 'white',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                              transition: 'left 0.2s',
                            }} />
                          </button>
                        )}

                        {meta.type === 'number' && (
                          <input
                            type="number"
                            value={setting.value ?? ''}
                            onChange={e => updateSetting(key, parseInt(e.target.value) || 0)}
                            style={{
                              width: 80,
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1.5px solid var(--color-border)',
                              fontSize: 14,
                              fontWeight: 600,
                              textAlign: 'center',
                              fontFamily: 'var(--font-sans)',
                              outline: 'none',
                              flexShrink: 0,
                            }}
                          />
                        )}

                        {meta.type === 'array_number' && (
                          <input
                            value={Array.isArray(setting.value) ? setting.value.join(', ') : ''}
                            onChange={e => {
                              const arr = e.target.value
                                .split(',')
                                .map(v => parseInt(v.trim()))
                                .filter(v => !isNaN(v) && v >= 0 && v <= 23)
                              updateSetting(key, arr)
                            }}
                            placeholder="7, 12, 18, 21"
                            style={{
                              width: 120,
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1.5px solid var(--color-border)',
                              fontSize: 13,
                              fontFamily: 'var(--font-sans)',
                              outline: 'none',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}

        {/* Database Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'var(--color-surface-3)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Database size={14} color="var(--color-text-subtle)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Thông tin kỹ thuật
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 2px' }}>📦 Supabase Project: MyDaily</p>
            <p style={{ margin: '0 0 2px' }}>🗄️ 22 bảng dữ liệu</p>
            <p style={{ margin: '0 0 2px' }}>🔐 RLS (Row Level Security) đã bật</p>
            <p style={{ margin: '0 0 2px' }}>⏱️ Múi giờ: Asia/Ho_Chi_Minh</p>
            <p style={{ margin: 0 }}>🔄 Soft-delete: is_deleted + deleted_at trên tất cả bảng dữ liệu</p>
          </div>
        </motion.div>
      </div>
    </AdminShell>
  )
}
