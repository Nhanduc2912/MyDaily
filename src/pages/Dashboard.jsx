import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import dayjs, { getMyDailyDate, formatDate } from '@/lib/dayjs'
import { Camera, ChevronRight, Flame, CheckSquare, StickyNote, Calendar, Plus, Sun, Moon, CloudSun } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
}

const timeSlotInfo = [
  { range: [5, 7],   label: 'Sáng sớm',  emoji: '🌅', bg: 'from-orange-50 to-amber-50',    icon: Sun },
  { range: [7, 11],  label: 'Buổi sáng',  emoji: '☀️', bg: 'from-yellow-50 to-orange-50',   icon: Sun },
  { range: [11, 13], label: 'Buổi trưa',  emoji: '🌤️', bg: 'from-blue-50 to-sky-50',        icon: CloudSun },
  { range: [13, 17], label: 'Buổi chiều', emoji: '🌇', bg: 'from-amber-50 to-orange-50',    icon: CloudSun },
  { range: [17, 19], label: 'Chiều tối',  emoji: '🌆', bg: 'from-orange-50 to-red-50',      icon: Moon },
  { range: [19, 22], label: 'Buổi tối',   emoji: '🌙', bg: 'from-indigo-50 to-violet-50',   icon: Moon },
  { range: [22, 24], label: 'Đêm khuya',  emoji: '🦉', bg: 'from-slate-50 to-indigo-50',    icon: Moon },
  { range: [0, 5],   label: 'Nửa đêm',   emoji: '⭐', bg: 'from-gray-100 to-slate-100',    icon: Moon },
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
  const { profile } = useAuthStore()
  const [currentSlot, setCurrentSlot] = useState(getCurrentTimeSlot())
  const [now, setNow] = useState(dayjs())
  const todayDate = getMyDailyDate()

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs())
      setCurrentSlot(getCurrentTimeSlot())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const greeting = getGreeting()

  return (
    <AppShell>
      <div className="px-4 pt-5 pb-4">
        <motion.div
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{greeting} 👋</p>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">
                {profile?.display_name || profile?.username || 'Bạn'}
              </h1>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="tap-highlight"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-base shadow-md shadow-orange-200/50">
                {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
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
            <div className={`bg-gradient-to-r ${currentSlot.bg} rounded-2xl p-4 border border-white/60`}>
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
            <h2 className="text-base font-bold text-gray-800 mb-3">Hôm nay</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate(`/day/${todayDate}`)}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2.5">
                  <Calendar size={18} className="text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-gray-800">Xem ngày</p>
                <p className="text-xs text-gray-400 mt-0.5">Timeline hôm nay</p>
              </button>

              <button
                onClick={() => navigate(`/day/${todayDate}?tab=todo`)}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-2.5">
                  <CheckSquare size={18} className="text-green-500" />
                </div>
                <p className="text-sm font-semibold text-gray-800">To-do</p>
                <p className="text-xs text-gray-400 mt-0.5">Danh sách việc cần làm</p>
              </button>

              <button
                onClick={() => navigate(`/day/${todayDate}?tab=notes`)}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2.5">
                  <StickyNote size={18} className="text-amber-500" />
                </div>
                <p className="text-sm font-semibold text-gray-800">Ghi chú</p>
                <p className="text-xs text-gray-400 mt-0.5">Ghi nhớ trong ngày</p>
              </button>

              <button
                onClick={() => navigate('/stats')}
                className="card p-4 tap-highlight text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center mb-2.5">
                  <Flame size={18} className="text-violet-500" />
                </div>
                <p className="text-sm font-semibold text-gray-800">Thống kê</p>
                <p className="text-xs text-gray-400 mt-0.5">Hoạt động tháng này</p>
              </button>
            </div>
          </motion.div>

          {/* Timeline Preview */}
          <motion.div variants={fadeUp} custom={4}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800">Timeline hôm nay</h2>
              <button
                onClick={() => navigate(`/day/${todayDate}`)}
                className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 tap-highlight"
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
                        ? 'bg-orange-50 border border-orange-100'
                        : isPast
                          ? 'bg-gray-50/50 opacity-60'
                          : 'bg-white border border-gray-50'
                    }`}
                  >
                    <span className="text-lg w-7 text-center">{slot.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isCurrent ? 'text-orange-700' : 'text-gray-600'}`}>
                        {slot.label}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {slot.range[0]}:00 — {slot.range[1] === 24 ? '0' : slot.range[1]}:00
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                        Hiện tại
                      </span>
                    )}
                    {!isCurrent && (
                      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                        <Camera size={12} className="text-gray-300" />
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
                <h3 className="text-sm font-bold text-gray-800">📋 Kế hoạch ngày mai</h3>
                <button className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 tap-highlight">
                  <Plus size={14} /> Thêm
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center py-4">
                Chưa có kế hoạch nào. Nhấn "Thêm" để bắt đầu.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  )
}
