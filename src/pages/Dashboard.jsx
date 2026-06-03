import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import dayjs, { getMyDailyDate, formatDate } from '@/lib/dayjs'
import { Camera, ChevronRight, Flame, CheckSquare, StickyNote, Calendar, Plus, Sun, Moon, CloudSun, Trash2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
}

const timeSlotInfo = [
  { range: [5, 7],   label: 'Sáng sớm',  emoji: '🌅', bg: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',    icon: Sun },
  { range: [7, 11],  label: 'Buổi sáng',  emoji: '☀️', bg: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',   icon: Sun },
  { range: [11, 13], label: 'Buổi trưa',  emoji: '🌤️', bg: 'from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20',        icon: CloudSun },
  { range: [13, 17], label: 'Buổi chiều', emoji: '🌇', bg: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',    icon: CloudSun },
  { range: [17, 19], label: 'Chiều tối',  emoji: '🌆', bg: 'from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20',      icon: Moon },
  { range: [19, 22], label: 'Buổi tối',   emoji: '🌙', bg: 'from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20',   icon: Moon },
  { range: [22, 24], label: 'Đêm khuya',  emoji: '🦉', bg: 'from-slate-50 to-indigo-50 dark:from-slate-900/30 dark:to-indigo-950/15',    icon: Moon },
  { range: [0, 5],   label: 'Nửa đêm',   emoji: '⭐', bg: 'from-gray-100 to-slate-100 dark:from-gray-900/50 dark:to-slate-900/30',    icon: Moon },
]

function getCurrentTimeSlot() {
  const hour = dayjs().hour()
  return timeSlotInfo.find(s => {
    if (s.range[0] < s.range[1]) return hour >= s.range[0] && hour < s.range[1]
    return hour >= s.range[0] || hour < s.range[1]
  }) || timeSlotInfo[0]
}

function getGreeting() {
  const hour = dayjs().hour()
  if (hour >= 5 && hour < 12) return 'Chào buổi sáng'
  if (hour >= 12 && hour < 17) return 'Chào buổi chiều'
  if (hour >= 17 && hour < 21) return 'Chào buổi tối'
  return 'Chào đêm khuya'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, fetchProfile } = useAuthStore()
  const [currentSlot, setCurrentSlot] = useState(getCurrentTimeSlot())
  const [now, setNow] = useState(dayjs())
  const todayDate = getMyDailyDate()

  // Plans states
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [newPlanText, setNewPlanText] = useState('')

  const fetchPlans = useCallback(async () => {
    if (!profile?.id) return
    try {
      const tomorrowDate = dayjs(todayDate).add(1, 'day').format('YYYY-MM-DD')
      const { data, error } = await supabase
        .from('day_plans')
        .select('*')
        .eq('user_id', profile.id)
        .eq('plan_date', tomorrowDate)
        .eq('is_deleted', false)
        .order('sort_order')
      if (!error && data) {
        setPlans(data)
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
    } finally {
      setPlansLoading(false)
    }
  }, [profile, todayDate])

  useEffect(() => {
    if (profile?.id) {
      fetchProfile(profile.id)
      const timer = setTimeout(() => {
        fetchPlans()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [profile?.id, fetchProfile, fetchPlans])

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs())
      setCurrentSlot(getCurrentTimeSlot())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const handleAddPlan = async (e) => {
    if (e) e.preventDefault()
    if (!newPlanText.trim() || !profile?.id) return

    try {
      const tomorrowDate = dayjs(todayDate).add(1, 'day').format('YYYY-MM-DD')
      const { data, error } = await supabase
        .from('day_plans')
        .insert({
          user_id: profile.id,
          plan_date: tomorrowDate,
          content: newPlanText.trim(),
        })
        .select()
        .single()
      
      if (error) throw error
      if (data) {
        setPlans(prev => [...prev, data])
        setNewPlanText('')
        setShowAddPlan(false)
        toast.success('Đã thêm kế hoạch ngày mai!')
      }
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi thêm kế hoạch')
    }
  }

  const handleTogglePlan = async (id, isDone) => {
    // optimistic update
    setPlans(prev => prev.map(p => p.id === id ? { ...p, is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null } : p))
    try {
      const { error } = await supabase
        .from('day_plans')
        .update({ is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi cập nhật kế hoạch')
      fetchPlans()
    }
  }

  const handleDeletePlan = async (id) => {
    setPlans(prev => prev.filter(p => p.id !== id))
    try {
      const { error } = await supabase
        .from('day_plans')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast.success('Đã xóa kế hoạch!')
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi xóa kế hoạch')
      fetchPlans()
    }
  }

  const greeting = getGreeting()

  return (
    <AppShell>
      <div className="px-4 pt-5 pb-24">
        <motion.div
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{greeting} 👋</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                {profile?.display_name || profile?.username || 'Bạn'}
              </h1>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="tap-highlight"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-base shadow-md shadow-orange-200/50 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()
                )}
              </div>
            </button>
          </motion.div>

          {/* Streak Card */}
          <motion.div
            variants={fadeUp}
            custom={1}
            className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-lg" />
            <div className="flex items-center justify-between relative">
              <div>
                <p className="text-orange-100 text-xs font-medium">Chuỗi hoạt động</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold streak-fire">🔥</span>
                  <span className="text-3xl font-extrabold">{profile?.streak_count || 0}</span>
                  <span className="text-orange-200 text-sm font-medium">ngày</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-orange-100 text-xs">Kỷ lục</p>
                <p className="text-lg font-bold">{profile?.longest_streak || 0} ngày</p>
              </div>
            </div>
          </motion.div>

          {/* Current Time Slot */}
          <motion.div variants={fadeUp} custom={2}>
            <div className={`bg-gradient-to-r ${currentSlot.bg} rounded-2xl p-4 border border-white/60 dark:border-gray-800/40`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{currentSlot.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{currentSlot.label}</p>
                    <p className="text-xs text-gray-500">{now.format('HH:mm')} — {formatDate(now)}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/camera')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/80 hover:bg-white border border-white/60 tap-highlight transition-colors"
              >
                <Camera size={18} className="text-orange-500" />
                <span className="text-sm font-semibold text-gray-700">Chụp ảnh ngay</span>
              </button>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={fadeUp} custom={3}>
            <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">Hôm nay</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate(`/day/${todayDate}`)}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center mb-2.5">
                  <Calendar size={18} className="text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Xem ngày</p>
                <p className="text-xs text-gray-550 dark:text-gray-400 mt-0.5">Timeline hôm nay</p>
              </button>

              <button
                onClick={() => navigate(`/day/${todayDate}?tab=todo`)}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center mb-2.5">
                  <CheckSquare size={18} className="text-green-500 dark:text-green-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">To-do</p>
                <p className="text-xs text-gray-550 dark:text-gray-400 mt-0.5">Danh sách việc cần làm</p>
              </button>

              <button
                onClick={() => navigate(`/day/${todayDate}?tab=notes`)}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mb-2.5">
                  <StickyNote size={18} className="text-amber-500 dark:text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ghi chú</p>
                <p className="text-xs text-gray-550 dark:text-gray-400 mt-0.5">Ghi nhớ trong ngày</p>
              </button>

              <button
                onClick={() => navigate('/stats')}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center mb-2.5">
                  <Flame size={18} className="text-violet-500 dark:text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Thống kê</p>
                <p className="text-xs text-gray-550 dark:text-gray-400 mt-0.5">Hoạt động tháng này</p>
              </button>
            </div>
          </motion.div>

          {/* Timeline Preview */}
          <motion.div variants={fadeUp} custom={4}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Timeline hôm nay</h2>
              <button
                onClick={() => navigate(`/day/${todayDate}`)}
                className="text-xs text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-0.5 tap-highlight"
              >
                Xem đầy đủ <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {timeSlotInfo.map((slot, i) => {
                const hour = dayjs().hour()
                const isCurrent = slot.range[0] < slot.range[1]
                  ? hour >= slot.range[0] && hour < slot.range[1]
                  : hour >= slot.range[0] || hour < slot.range[1]
                const isPast = slot.range[0] < slot.range[1]
                  ? hour >= slot.range[1]
                  : (slot.range[1] <= 5 && hour >= slot.range[1] && hour < slot.range[0])

                return (
                  <motion.div
                    key={slot.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isCurrent
                        ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/65'
                        : isPast
                          ? 'bg-gray-50/50 dark:bg-gray-800/30 opacity-60'
                          : 'bg-white dark:bg-gray-800 border border-gray-50 dark:border-gray-800'
                    }`}
                  >
                    <span className="text-lg w-7 text-center">{slot.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isCurrent ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {slot.label}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {slot.range[0]}:00 — {slot.range[1] === 24 ? '0' : slot.range[1]}:00
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">
                        Hiện tại
                      </span>
                    )}
                    {!isCurrent && (
                      <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <Camera size={12} className="text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Plan for tomorrow */}
          <motion.div variants={fadeUp} custom={5}>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white">📋 Kế hoạch ngày mai</h3>
                {!showAddPlan && (
                  <button
                    onClick={() => setShowAddPlan(true)}
                    className="text-xs text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-0.5 tap-highlight"
                  >
                    <Plus size={14} /> Thêm
                  </button>
                )}
              </div>

              {/* Add plan input inline */}
              {showAddPlan && (
                <form onSubmit={handleAddPlan} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newPlanText}
                    onChange={(e) => setNewPlanText(e.target.value)}
                    placeholder="Nhập kế hoạch..."
                    className="input-base text-xs py-1.5 flex-1"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!newPlanText.trim()}
                    className="btn btn-primary rounded-xl px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    Thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddPlan(false); setNewPlanText(''); }}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Hủy
                  </button>
                </form>
              )}

              {plansLoading ? (
                <div className="space-y-1.5 py-2">
                  <div className="skeleton h-8 w-full rounded-lg" />
                  <div className="skeleton h-8 w-full rounded-lg" />
                </div>
              ) : plans.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {plans.map((plan) => (
                    <div
                       key={plan.id}
                       className="flex items-center gap-2.5 p-2 rounded-xl border border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 group"
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePlan(plan.id, plan.is_done)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          plan.is_done
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        {plan.is_done && <Check size={12} strokeWidth={3} />}
                      </button>
                      <span className={`text-xs flex-1 truncate ${plan.is_done ? 'line-through text-gray-400 dark:text-gray-550' : 'text-gray-700 dark:text-gray-200'}`}>
                        {plan.content}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-1 rounded-md text-gray-300 dark:text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity tap-highlight"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                  Chưa có kế hoạch nào. Nhấn "Thêm" để bắt đầu.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  )
}
