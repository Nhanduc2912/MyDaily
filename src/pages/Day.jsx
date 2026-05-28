import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import dayjs, { getMyDailyDate, formatDate } from '@/lib/dayjs'
import { MOODS, REACTION_EMOJIS, VISIBILITY_LABELS } from '@/lib/constants'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Camera, Plus, Check, Trash2,
  Share2, Lock, Users, Globe, StickyNote, CheckSquare, Image, MoreHorizontal
} from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'timeline', label: 'Timeline', icon: Image },
  { key: 'todo', label: 'To-do', icon: CheckSquare },
  { key: 'notes', label: 'Ghi chú', icon: StickyNote },
]

const timeSlotInfo = [
  { range: [5, 7],   label: 'Sáng sớm',  emoji: '🌅', bg: 'bg-orange-50' },
  { range: [7, 11],  label: 'Buổi sáng',  emoji: '☀️', bg: 'bg-yellow-50' },
  { range: [11, 13], label: 'Buổi trưa',  emoji: '🌤️', bg: 'bg-blue-50' },
  { range: [13, 17], label: 'Buổi chiều', emoji: '🌇', bg: 'bg-amber-50' },
  { range: [17, 19], label: 'Chiều tối',  emoji: '🌆', bg: 'bg-orange-50' },
  { range: [19, 22], label: 'Buổi tối',   emoji: '🌙', bg: 'bg-indigo-50' },
  { range: [22, 24], label: 'Đêm khuya',  emoji: '🦉', bg: 'bg-slate-50' },
  { range: [0, 5],   label: 'Nửa đêm',   emoji: '⭐', bg: 'bg-gray-100' },
]

export default function Day() {
  const navigate = useNavigate()
  const { date } = useParams()
  const [searchParams] = useSearchParams()
  const { profile } = useAuthStore()

  const pageDate = date || getMyDailyDate()
  const [tab, setTab] = useState(searchParams.get('tab') || 'timeline')
  const [page, setPage] = useState(null)
  const [posts, setPosts] = useState([])
  const [todos, setTodos] = useState([])
  const [notes, setNotes] = useState([])
  const [mood, setMood] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTodo, setNewTodo] = useState('')
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    loadData()
  }, [pageDate, profile])

  const loadData = async () => {
    if (!profile?.id) { setLoading(false); return }
    setLoading(true)

    try {
      // Load or create daily page
      let { data: pageData } = await supabase
        .from('daily_pages')
        .select('*')
        .eq('user_id', profile.id)
        .eq('page_date', pageDate)
        .eq('is_deleted', false)
        .single()

      if (!pageData && pageDate === getMyDailyDate()) {
        const { data: newPage } = await supabase
          .from('daily_pages')
          .insert({ user_id: profile.id, page_date: pageDate })
          .select('*')
          .single()
        pageData = newPage
      }

      setPage(pageData)
      setMood(pageData?.mood || null)

      if (pageData) {
        // Posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('*, themes(name_vi, icon), theme_time_slots(name, emoji)')
          .eq('page_id', pageData.id)
          .eq('is_deleted', false)
          .order('taken_at', { ascending: true })
        setPosts(postsData || [])

        // Todos
        const { data: todosData } = await supabase
          .from('todos')
          .select('*')
          .eq('page_id', pageData.id)
          .eq('is_deleted', false)
          .order('sort_order')
        setTodos(todosData || [])

        // Notes
        const { data: notesData } = await supabase
          .from('notes')
          .select('*')
          .eq('page_id', pageData.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
        setNotes(notesData || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleTodo = async (id, isDone) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null } : t))
    await supabase
      .from('todos')
      .update({ is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null })
      .eq('id', id)
  }

  const addTodo = async () => {
    if (!newTodo.trim() || !page?.id) return
    const { data, error } = await supabase
      .from('todos')
      .insert({ page_id: page.id, user_id: profile.id, content: newTodo.trim() })
      .select()
      .single()
    if (!error && data) {
      setTodos(prev => [...prev, data])
      setNewTodo('')
      toast.success('Đã thêm!')
    }
  }

  const addNote = async () => {
    if (!newNote.trim() || !page?.id) return
    const { data, error } = await supabase
      .from('notes')
      .insert({ page_id: page.id, user_id: profile.id, content: newNote.trim() })
      .select()
      .single()
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
      toast.success('Đã thêm ghi chú!')
    }
  }

  const updateMood = async (moodValue) => {
    setMood(moodValue)
    if (page?.id) {
      await supabase
        .from('daily_pages')
        .update({ mood: moodValue })
        .eq('id', page.id)
    }
  }

  const prevDate = dayjs(pageDate).subtract(1, 'day').format('YYYY-MM-DD')
  const nextDate = dayjs(pageDate).add(1, 'day').format('YYYY-MM-DD')
  const isToday = pageDate === getMyDailyDate()
  const doneTodos = todos.filter(t => t.is_done).length
  const todoPct = todos.length > 0 ? Math.round((doneTodos / todos.length) * 100) : 0

  const groupPostsBySlot = () => {
    const groups = []
    timeSlotInfo.forEach(slot => {
      const slotPosts = posts.filter(p => {
        const h = dayjs(p.taken_at).hour()
        if (slot.range[0] < slot.range[1]) return h >= slot.range[0] && h < slot.range[1]
        return h >= slot.range[0] || h < slot.range[1]
      })
      groups.push({ ...slot, posts: slotPosts })
    })
    return groups
  }

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/dashboard')} className="tap-highlight p-1">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/day/${prevDate}`)} className="tap-highlight p-1">
              <ChevronLeft size={20} className="text-gray-500" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-800">
                {isToday ? 'Hôm nay' : dayjs(pageDate).format('DD/MM/YYYY')}
              </p>
              <p className="text-[10px] text-gray-400">{formatDate(pageDate)}</p>
            </div>
            <button
              onClick={() => !isToday && navigate(`/day/${nextDate}`)}
              className={`tap-highlight p-1 ${isToday ? 'opacity-30' : ''}`}
              disabled={isToday}
            >
              <ChevronRight size={20} className="text-gray-500" />
            </button>
          </div>
          <button className="tap-highlight p-1">
            <Share2 size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Mood Picker */}
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 mr-1">Tâm trạng:</span>
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => updateMood(m.value)}
              className={`text-xl tap-highlight transition-transform ${
                mood === m.value ? 'scale-125' : 'opacity-40 hover:opacity-70'
              }`}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <t.icon size={14} />
              {t.label}
              {t.key === 'todo' && todos.length > 0 && (
                <span className="text-[10px] text-orange-500">({todoPct}%)</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-4">
                <div className="skeleton h-4 w-24 mb-2" />
                <div className="skeleton h-32 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* TIMELINE TAB */}
            {tab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {groupPostsBySlot().map((slot, si) => (
                  <motion.div
                    key={slot.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: si * 0.04 }}
                    className={`${slot.bg} rounded-2xl p-3`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{slot.emoji}</span>
                      <span className="text-xs font-bold text-gray-700">{slot.label}</span>
                      <span className="text-[10px] text-gray-400">
                        {slot.range[0]}:00 — {slot.range[1] === 24 ? '0' : slot.range[1]}:00
                      </span>
                    </div>

                    {slot.posts.length > 0 ? (
                      <div className="space-y-2">
                        {slot.posts.map(post => (
                          <div key={post.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                            <img
                              src={post.image_url}
                              alt=""
                              className="w-full aspect-[4/3] object-cover"
                              loading="lazy"
                            />
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  {post.themes && (
                                    <span className="text-xs font-semibold text-orange-600">
                                      {post.themes.icon} {post.themes.name_vi}
                                    </span>
                                  )}
                                  {post.custom_title && (
                                    <p className="text-sm font-medium text-gray-800 mt-0.5">{post.custom_title}</p>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400">
                                  {dayjs(post.taken_at).format('HH:mm')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 bg-white/50 rounded-xl border border-dashed border-gray-200">
                        <Camera size={14} className="text-gray-300 mr-1.5" />
                        <span className="text-xs text-gray-400">Chưa có ảnh</span>
                      </div>
                    )}
                  </motion.div>
                ))}

                {isToday && (
                  <button
                    onClick={() => navigate('/camera')}
                    className="w-full btn btn-primary rounded-2xl py-3.5"
                  >
                    <Camera size={18} /> Chụp ảnh ngay
                  </button>
                )}
              </motion.div>
            )}

            {/* TODO TAB */}
            {tab === 'todo' && (
              <motion.div
                key="todo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Progress */}
                {todos.length > 0 && (
                  <div className="card p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Hoàn thành</span>
                      <span className="text-xs font-bold text-orange-600">{todoPct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${todoPct}%` }}
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{doneTodos}/{todos.length} việc</p>
                  </div>
                )}

                {/* Add todo */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                    placeholder="Thêm việc cần làm..."
                    className="input-base flex-1"
                  />
                  <button
                    onClick={addTodo}
                    disabled={!newTodo.trim()}
                    className="btn btn-primary rounded-xl px-4 disabled:opacity-40"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Todo list */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {todos.map((todo, i) => (
                      <motion.div
                        key={todo.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="card p-3 flex items-center gap-3"
                      >
                        <button
                          onClick={() => toggleTodo(todo.id, todo.is_done)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            todo.is_done
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {todo.is_done && <Check size={14} className="text-white" />}
                        </button>
                        <span className={`text-sm flex-1 ${todo.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {todo.content}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {todos.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8">
                      Chưa có việc nào. Thêm việc cần làm ở trên!
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* NOTES TAB */}
            {tab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Add note */}
                <div className="mb-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Viết ghi chú..."
                    rows={3}
                    className="input-base resize-none"
                  />
                  <button
                    onClick={addNote}
                    disabled={!newNote.trim()}
                    className="btn btn-primary w-full mt-2 rounded-xl py-2.5 disabled:opacity-40"
                  >
                    <Plus size={16} /> Thêm ghi chú
                  </button>
                </div>

                {/* Notes list */}
                <div className="space-y-2">
                  {notes.map((note, i) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="card p-4"
                      style={{ borderLeft: `3px solid ${note.color_hex || '#f97316'}` }}
                    >
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {dayjs(note.created_at).format('HH:mm')}
                      </p>
                    </motion.div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8">
                      Chưa có ghi chú nào.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  )
}
