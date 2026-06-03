import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import dayjs, { getMyDailyDate, formatDate } from '@/lib/dayjs'
import { MOODS, REACTION_EMOJIS, VISIBILITY_LABELS } from '@/lib/constants'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Camera, Plus, Check, Trash2,
  Share2, Lock, Users, Globe, StickyNote, CheckSquare, Image, CalendarPlus
} from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'timeline', label: 'Timeline', icon: Image },
  { key: 'todo', label: 'To-do', icon: CheckSquare },
  { key: 'notes', label: 'Ghi chú', icon: StickyNote },
  { key: 'plan', label: 'Ngày mai', icon: CalendarPlus },
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
  const { date, username } = useParams()
  const [searchParams] = useSearchParams()
  const { profile } = useAuthStore()

  const isOwnPage = !username || username === profile?.username
  const [targetProfile, setTargetProfile] = useState(null)
  const [isFriend, setIsFriend] = useState(false)
  const [privacyError, setPrivacyError] = useState(null) // null | 'private' | 'not_friend' | 'not_found'

  const pageDate = date || getMyDailyDate()
  const [tab, setTab] = useState(isOwnPage ? (searchParams.get('tab') || 'timeline') : 'timeline')
  const [page, setPage] = useState(null)
  const [posts, setPosts] = useState([])
  const [todos, setTodos] = useState([])
  const [notes, setNotes] = useState([])
  const [plans, setPlans] = useState([])
  const [mood, setMood] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTodo, setNewTodo] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newPlan, setNewPlan] = useState('')
  const [reactions, setReactions] = useState({})
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)

  const loadData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    setLoading(true)
    setPrivacyError(null)

    try {
      let pageOwnerId = profile.id
      let confirmedFriend = false

      if (!isOwnPage) {
        // Fetch target user's profile
        const { data: userProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .eq('is_deleted', false)
          .maybeSingle()

        if (profileErr || !userProfile) {
          setPrivacyError('not_found')
          setLoading(false)
          return
        }

        pageOwnerId = userProfile.id
        setTargetProfile(userProfile)

        // Check friendship state
        const { data: friendship } = await supabase
          .from('friendships')
          .select('*')
          .or(`and(requester_id.eq.${profile.id},addressee_id.eq.${userProfile.id}),and(requester_id.eq.${userProfile.id},addressee_id.eq.${profile.id})`)
          .eq('state', 'accepted')
          .maybeSingle()

        confirmedFriend = !!friendship
        setIsFriend(confirmedFriend)
      } else {
        setTargetProfile(profile)
      }

      // Load target daily page
      let { data: pageData, error: pageErr } = await supabase
        .from('daily_pages')
        .select('*')
        .eq('user_id', pageOwnerId)
        .eq('page_date', pageDate)
        .eq('is_deleted', false)
        .maybeSingle()

      if (!isOwnPage) {
        if (pageErr || !pageData) {
          setPrivacyError('private')
          setLoading(false)
          return
        }

        // Privacy rules checks
        const vis = pageData.visibility || 'private'
        if (vis === 'private') {
          setPrivacyError('private')
          setLoading(false)
          return
        }
        if (vis === 'friends' && !confirmedFriend && profile.role !== 'admin') {
          setPrivacyError('not_friend')
          setLoading(false)
          return
        }
      }

      // If own page doesn't exist yet and date is today, create it
      if (isOwnPage && !pageData && pageDate === getMyDailyDate()) {
        const { data: newPage } = await supabase
          .from('daily_pages')
          .upsert(
            { user_id: profile.id, page_date: pageDate, is_deleted: false, deleted_at: null, visibility: localStorage.getItem('default_visibility') || 'private' },
            { onConflict: 'user_id,page_date' }
          )
          .select('*')
          .single()
        pageData = newPage
      }

      setPage(pageData)
      setMood(pageData?.mood || null)

      if (pageData) {
        // Posts with reactions
        let postsQuery = supabase
          .from('posts')
          .select('*, themes(name_vi, icon), theme_time_slots(name, icon)')
          .eq('page_id', pageData.id)
          .eq('is_deleted', false)

        if (!isOwnPage) {
          postsQuery = postsQuery.in('visibility', isFriend ? ['public', 'friends'] : ['public'])
        }

        const { data: postsData } = await postsQuery.order('taken_at', { ascending: true })
        setPosts(postsData || [])

        // Load reactions for all posts
        if (postsData && postsData.length > 0) {
          const postIds = postsData.map(p => p.id)
          const { data: reactionsData } = await supabase
            .from('reactions')
            .select('*')
            .in('post_id', postIds)

          const reactMap = {}
          ;(reactionsData || []).forEach(r => {
            if (!reactMap[r.post_id]) reactMap[r.post_id] = []
            reactMap[r.post_id].push(r)
          })
          setReactions(reactMap)
        }

        if (isOwnPage) {
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

          // Plans for tomorrow
          const tomorrow = dayjs(pageDate).add(1, 'day').format('YYYY-MM-DD')
          const { data: plansData } = await supabase
            .from('day_plans')
            .select('*')
            .eq('user_id', profile.id)
            .eq('plan_date', tomorrow)
            .eq('is_deleted', false)
            .order('sort_order')
          setPlans(plansData || [])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [pageDate, profile, username, isOwnPage, isFriend])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadData])

  const toggleTodo = async (id, isDone) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null } : t))
    await supabase
      .from('todos')
      .update({ is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null })
      .eq('id', id)
  }

  const deleteTodo = async (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id)
  }

  const addTodo = async () => {
    if (!newTodo.trim() || !profile?.id) return
    let currentPage = page
    if (!currentPage) {
      const { data: newPage, error: pageError } = await supabase
        .from('daily_pages')
        .upsert(
          { user_id: profile.id, page_date: pageDate, is_deleted: false, deleted_at: null },
          { onConflict: 'user_id,page_date' }
        )
        .select('*')
        .single()
      if (pageError) {
        toast.error('Không thể tạo trang cho ngày này')
        console.error(pageError)
        return
      }
      currentPage = newPage
      setPage(newPage)
    }

    const { data, error } = await supabase
      .from('todos')
      .insert({ page_id: currentPage.id, user_id: profile.id, content: newTodo.trim() })
      .select()
      .single()
    if (!error && data) {
      setTodos(prev => [...prev, data])
      setNewTodo('')
      toast.success('Đã thêm!')
    }
  }

  const addNote = async () => {
    if (!newNote.trim() || !profile?.id) return
    let currentPage = page
    if (!currentPage) {
      const { data: newPage, error: pageError } = await supabase
        .from('daily_pages')
        .upsert(
          { user_id: profile.id, page_date: pageDate, is_deleted: false, deleted_at: null },
          { onConflict: 'user_id,page_date' }
        )
        .select('*')
        .single()
      if (pageError) {
        toast.error('Không thể tạo trang cho ngày này')
        console.error(pageError)
        return
      }
      currentPage = newPage
      setPage(newPage)
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({ page_id: currentPage.id, user_id: profile.id, content: newNote.trim() })
      .select()
      .single()
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
      toast.success('Đã thêm ghi chú!')
    }
  }

  const changePostVisibility = async (postId, visibility) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, visibility } : p))
    setSelectedPost(null)
    toast.success('Đã cập nhật quyền riêng tư!')
    
    const { error } = await supabase
      .from('posts')
      .update({ visibility })
      .eq('id', postId)
      
    if (error) {
      toast.error('Lỗi khi cập nhật')
      loadData()
    }
  }

  const handleSoftDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài đăng này không?')) return
    
    setPosts(prev => prev.filter(p => p.id !== postId))
    setSelectedPost(null)
    toast.success('Đã xóa bài đăng')
    
    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), state: 'deleted' })
      .eq('id', postId)
      
    if (error) {
      toast.error('Lỗi khi xóa bài đăng')
      loadData()
    }
  }

  const deleteNote = async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    await supabase.from('notes').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id)
  }

  const addPlan = async () => {
    if (!newPlan.trim() || !profile?.id) return
    const tomorrow = dayjs(pageDate).add(1, 'day').format('YYYY-MM-DD')
    const { data, error } = await supabase
      .from('day_plans')
      .insert({
        user_id: profile.id,
        plan_date: tomorrow,
        source_page: page?.id || null,
        content: newPlan.trim(),
      })
      .select()
      .single()
    if (!error && data) {
      setPlans(prev => [...prev, data])
      setNewPlan('')
      toast.success('Đã thêm kế hoạch!')
    }
  }

  const togglePlan = async (id, isDone) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null } : p))
    await supabase.from('day_plans').update({ is_done: !isDone, done_at: !isDone ? new Date().toISOString() : null }).eq('id', id)
  }

  const deletePlan = async (id) => {
    setPlans(prev => prev.filter(p => p.id !== id))
    await supabase.from('day_plans').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id)
  }

  const toggleReaction = async (postId, emoji) => {
    const postReactions = reactions[postId] || []
    const existing = postReactions.find(r => r.user_id === profile.id && r.emoji === emoji)

    if (existing) {
      // Remove reaction
      setReactions(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(r => r.id !== existing.id),
      }))
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      // Add reaction
      const { data, error } = await supabase
        .from('reactions')
        .insert({ post_id: postId, user_id: profile.id, emoji })
        .select()
        .single()
      if (!error && data) {
        setReactions(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data],
        }))
      }
    }
    setShowReactionPicker(null)
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

  const handleShare = async () => {
    if (page?.share_link_token) {
      const url = `${window.location.origin}/share/${page.share_link_token}`
      try {
        if (navigator.share) {
          await navigator.share({ title: `MyDaily - ${formatDate(pageDate)}`, url })
        } else {
          await navigator.clipboard.writeText(url)
          toast.success('Đã sao chép link chia sẻ!')
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  const togglePageVisibility = async () => {
    if (!page?.id) return
    const options = ['private', 'friends', 'public']
    const nextIdx = (options.indexOf(page.visibility || 'private') + 1) % options.length
    const nextVis = options[nextIdx]
    
    try {
      const { error } = await supabase
        .from('daily_pages')
        .update({ visibility: nextVis })
        .eq('id', page.id)
      if (error) throw error
      setPage(prev => ({ ...prev, visibility: nextVis }))
      toast.success(`Đã đổi trạng thái trang sang: ${VISIBILITY_LABELS[nextVis].label}`)
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi cập nhật quyền riêng tư')
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

  if (privacyError) {
    return (
      <AppShell>
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="tap-highlight p-1">
              <ArrowLeft size={22} className="text-gray-700 dark:text-gray-200" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Quay lại</h1>
          </div>
          
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-4 text-3xl">
              {privacyError === 'not_friend' ? '👥' : '🔒'}
            </div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
              {privacyError === 'private' && 'Trang nhật ký riêng tư'}
              {privacyError === 'not_friend' && 'Trang chỉ dành cho bạn bè'}
              {privacyError === 'not_found' && 'Không tìm thấy trang'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
              {privacyError === 'private' && 'Chủ sở hữu đã đặt trang này ở chế độ riêng tư.'}
              {privacyError === 'not_friend' && `Bạn cần kết bạn với @${username} để xem nhật ký ngày này.`}
              {privacyError === 'not_found' && 'Trang nhật ký này không tồn tại hoặc đã bị xóa.'}
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="tap-highlight p-1">
            <ArrowLeft size={22} className="text-gray-700 dark:text-gray-200" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/day/${prevDate}${!isOwnPage ? '/' + username : ''}`)} className="tap-highlight p-1">
              <ChevronLeft size={20} className="text-gray-500" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {isOwnPage ? (isToday ? 'Hôm nay' : dayjs(pageDate).format('DD/MM/YYYY')) : `${targetProfile?.display_name || targetProfile?.username}`}
              </p>
              <p className="text-[10px] text-gray-400">
                {!isOwnPage ? dayjs(pageDate).format('DD/MM/YYYY') : formatDate(pageDate)}
              </p>
            </div>
            <button
              onClick={() => !isToday && navigate(`/day/${nextDate}${!isOwnPage ? '/' + username : ''}`)}
              className={`tap-highlight p-1 ${isToday ? 'opacity-30' : ''}`}
              disabled={isToday}
            >
              <ChevronRight size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {isOwnPage && page && (
              <button
                onClick={togglePageVisibility}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-850 font-semibold text-gray-600 dark:text-gray-300 tap-highlight animate-fade-in"
                title="Thay đổi quyền riêng tư của ngày này"
              >
                <span>{VISIBILITY_LABELS[page.visibility || 'private']?.icon}</span>
                <span>{VISIBILITY_LABELS[page.visibility || 'private']?.label}</span>
              </button>
            )}
            {isOwnPage && (
              <button onClick={handleShare} className="tap-highlight p-1">
                <Share2 size={20} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Mood Picker */}
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Tâm trạng:</span>
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => isOwnPage && updateMood(m.value)}
              className={`text-xl transition-transform ${
                isOwnPage ? 'tap-highlight hover:opacity-70' : 'cursor-default'
              } ${
                mood === m.value ? 'scale-125 opacity-100' : 'opacity-20'
              }`}
              title={m.label}
              disabled={!isOwnPage}
            >
              {m.emoji}
            </button>
          ))}
        </div>

        {/* Tabs */}
        {isOwnPage && (
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl mb-5">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                  tab === t.key ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500'
                }`}
              >
                <t.icon size={13} />
                {t.label}
                {t.key === 'todo' && todos.length > 0 && (
                  <span className="text-[10px] text-orange-500">({todoPct}%)</span>
                )}
                {t.key === 'plan' && plans.length > 0 && (
                  <span className="text-[10px] text-blue-500">({plans.length})</span>
                )}
              </button>
            ))}
          </div>
        )}

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
                        {slot.posts.map(post => {
                          const postReactions = reactions[post.id] || []
                          const reactionCounts = {}
                          postReactions.forEach(r => {
                            reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1
                          })
                          const myReactions = postReactions
                            .filter(r => r.user_id === profile.id)
                            .map(r => r.emoji)

                          return (
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
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-400">
                                      {dayjs(post.taken_at).format('HH:mm')}
                                    </span>
                                    {post.user_id === profile?.id && (
                                      <button
                                        onClick={() => setSelectedPost(post)}
                                        className="tap-highlight p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Reactions */}
                                <div className="flex items-center gap-1 mt-2 flex-wrap">
                                  {Object.entries(reactionCounts).map(([emoji, count]) => (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(post.id, emoji)}
                                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors tap-highlight ${
                                        myReactions.includes(emoji)
                                          ? 'border-orange-300 bg-orange-50'
                                          : 'border-gray-200 bg-gray-50'
                                      }`}
                                    >
                                      {emoji} {count}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setShowReactionPicker(
                                      showReactionPicker === post.id ? null : post.id
                                    )}
                                    className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-200 text-gray-400 tap-highlight hover:bg-gray-50"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Reaction Picker */}
                                <AnimatePresence>
                                  {showReactionPicker === post.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -5 }}
                                      className="flex gap-1 mt-2 p-2 bg-gray-50 rounded-xl"
                                    >
                                      {REACTION_EMOJIS.map(emoji => (
                                        <button
                                          key={emoji}
                                          onClick={() => toggleReaction(post.id, emoji)}
                                          className={`text-lg p-1 rounded-lg tap-highlight transition-transform hover:scale-110 ${
                                            myReactions.includes(emoji) ? 'bg-orange-100' : ''
                                          }`}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 bg-white/50 rounded-xl border border-dashed border-gray-200">
                        <Camera size={14} className="text-gray-300 mr-1.5" />
                        <span className="text-xs text-gray-400">Chưa có ảnh</span>
                      </div>
                    )}
                  </motion.div>
                ))}

                {isToday && isOwnPage && (
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
                    {todos.map((todo) => (
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
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="tap-highlight p-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} className="text-gray-300 hover:text-red-400" />
                        </button>
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
                      className="card p-4 relative group"
                      style={{ borderLeft: `3px solid ${note.color_hex || '#f97316'}` }}
                    >
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 tap-highlight p-1"
                      >
                        <Trash2 size={12} className="text-gray-300 hover:text-red-400" />
                      </button>
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

            {/* PLAN FOR TOMORROW TAB */}
            {tab === 'plan' && (
              <motion.div
                key="plan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="card p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarPlus size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-blue-800">
                      Kế hoạch cho ngày {dayjs(pageDate).add(1, 'day').format('DD/MM')}
                    </h3>
                  </div>
                  <p className="text-[11px] text-blue-500">
                    Lên kế hoạch trước để bắt đầu ngày mới hiệu quả hơn!
                  </p>
                </div>

                {/* Add plan */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPlan()}
                    placeholder="Thêm kế hoạch ngày mai..."
                    className="input-base flex-1"
                  />
                  <button
                    onClick={addPlan}
                    disabled={!newPlan.trim()}
                    className="btn btn-primary rounded-xl px-4 disabled:opacity-40"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Plan list */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {plans.map((plan) => (
                      <motion.div
                        key={plan.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="card p-3 flex items-center gap-3"
                      >
                        <button
                          onClick={() => togglePlan(plan.id, plan.is_done)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            plan.is_done
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {plan.is_done && <Check size={14} className="text-white" />}
                        </button>
                        <span className={`text-sm flex-1 ${plan.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {plan.content}
                        </span>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="tap-highlight p-1"
                        >
                          <Trash2 size={14} className="text-gray-300 hover:text-red-400" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {plans.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8">
                      Chưa có kế hoạch nào cho ngày mai. Hãy lên plan ngay!
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Sheet for Post Actions */}
      <AnimatePresence>
        {selectedPost && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="fixed inset-0 bg-black z-40 max-w-[480px] mx-auto"
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 z-50 max-w-[480px] mx-auto shadow-2xl safe-bottom"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-bold text-gray-800 mb-4">Tùy chọn bài viết</h3>
              
              <div className="space-y-4">
                {/* Visibility options */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">Quyền riêng tư</p>
                  <div className="flex gap-2">
                    {[
                      { key: 'private', label: 'Chỉ mình tôi', icon: Lock },
                      { key: 'friends', label: 'Bạn bè', icon: Users },
                      { key: 'public', label: 'Công khai', icon: Globe },
                    ].map(opt => {
                      const Icon = opt.icon
                      const active = selectedPost.visibility === opt.key
                      return (
                        <button
                          key={opt.key}
                          onClick={() => changePostVisibility(selectedPost.id, opt.key)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border-2 transition-colors tap-highlight ${
                            active
                              ? 'bg-orange-50 text-orange-600 border-orange-200'
                              : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <Icon size={14} />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Delete option */}
                <button
                  onClick={() => handleSoftDeletePost(selectedPost.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 font-semibold text-sm transition-colors tap-highlight"
                >
                  <Trash2 size={18} />
                  <span>Xóa bài viết</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
