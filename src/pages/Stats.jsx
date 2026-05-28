import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import dayjs from '@/lib/dayjs'
import { ArrowLeft, Calendar, Camera, CheckSquare, Flame, TrendingUp } from 'lucide-react'

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

export default function Stats() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [stats, setStats] = useState(null)
  const [dailyActivity, setDailyActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [month, profile])

  const loadStats = async () => {
    if (!profile?.id) { setLoading(false); return }
    setLoading(true)

    try {
      // Monthly stats
      const { data: monthlyData } = await supabase
        .from('monthly_stats')
        .select('*')
        .eq('user_id', profile.id)
        .eq('year_month', month)
        .single()

      setStats(monthlyData)

      // Daily activity for heatmap
      const startDate = dayjs(month + '-01').startOf('month').format('YYYY-MM-DD')
      const endDate = dayjs(month + '-01').endOf('month').format('YYYY-MM-DD')

      const { data: streakData } = await supabase
        .from('streak_logs')
        .select('*')
        .eq('user_id', profile.id)
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .order('log_date')

      setDailyActivity(streakData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const currentMonth = dayjs(month + '-01')
  const daysInMonth = currentMonth.daysInMonth()
  const firstDayOfWeek = currentMonth.day() // 0 = Sunday
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  const getActivityLevel = (date) => {
    const entry = dailyActivity.find(d => d.log_date === date)
    if (!entry) return 0
    if (entry.has_post && entry.has_todo) return 3
    if (entry.has_post) return 2
    if (entry.has_todo) return 1
    return 0
  }

  const activityColors = ['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-600']

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="tap-highlight p-1">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Thống kê</h1>
        </div>

        {/* Month Picker */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setMonth(dayjs(month + '-01').subtract(1, 'month').format('YYYY-MM'))}
            className="tap-highlight p-2 rounded-lg bg-gray-50"
          >
            <ArrowLeft size={16} className="text-gray-500" />
          </button>
          <h2 className="text-base font-bold text-gray-800">
            {MONTHS[currentMonth.month()]} {currentMonth.year()}
          </h2>
          <button
            onClick={() => setMonth(dayjs(month + '-01').add(1, 'month').format('YYYY-MM'))}
            disabled={month === dayjs().format('YYYY-MM')}
            className="tap-highlight p-2 rounded-lg bg-gray-50 disabled:opacity-30"
          >
            <ArrowLeft size={16} className="text-gray-500 rotate-180" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4 text-center">
                <Camera size={20} className="text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-gray-800">{stats?.total_posts || 0}</p>
                <p className="text-xs text-gray-400">Bài đăng</p>
              </div>
              <div className="card p-4 text-center">
                <Calendar size={20} className="text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-gray-800">{stats?.active_days || 0}</p>
                <p className="text-xs text-gray-400">Ngày hoạt động</p>
              </div>
              <div className="card p-4 text-center">
                <CheckSquare size={20} className="text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-gray-800">
                  {stats?.total_todos ? Math.round((stats.completed_todos / stats.total_todos) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-400">To-do hoàn thành</p>
              </div>
              <div className="card p-4 text-center">
                <TrendingUp size={20} className="text-violet-500 mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-gray-800">
                  {stats?.avg_post_hour ? `${Math.floor(stats.avg_post_hour)}h` : '--'}
                </p>
                <p className="text-xs text-gray-400">Giờ TB chụp</p>
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="card p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Flame size={16} className="text-orange-500" />
                Lịch hoạt động
              </h3>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map(d => (
                  <div key={d} className="text-center text-[10px] text-gray-400 font-medium">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {[...Array(firstDayOfWeek)].map((_, i) => (
                  <div key={`e-${i}`} className="aspect-square" />
                ))}
                {/* Day cells */}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1
                  const dateStr = currentMonth.date(day).format('YYYY-MM-DD')
                  const level = getActivityLevel(dateStr)
                  const isToday = dateStr === dayjs().format('YYYY-MM-DD')

                  return (
                    <button
                      key={day}
                      onClick={() => navigate(`/day/${dateStr}`)}
                      className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium tap-highlight relative ${activityColors[level]} ${
                        level > 0 ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {day}
                      {isToday && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-[10px] text-gray-400">Ít</span>
                {activityColors.map((c, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                ))}
                <span className="text-[10px] text-gray-400">Nhiều</span>
              </div>
            </div>

            {/* Streak info */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs font-medium">Chuỗi hiện tại</p>
                  <p className="text-2xl font-extrabold flex items-center gap-2">
                    <span className="streak-fire">🔥</span> {profile?.streak_count || 0} ngày
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-orange-100 text-xs">Kỷ lục</p>
                  <p className="text-lg font-bold">{profile?.longest_streak || 0} ngày</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}
