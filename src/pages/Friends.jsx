import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/layout/AppShell'
import { Search, UserPlus, UserCheck, UserX, Clock, ArrowLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'friends', label: 'Bạn bè' },
  { key: 'requests', label: 'Lời mời' },
  { key: 'search', label: 'Tìm kiếm' },
]

export default function Friends() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [tab, setTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)

  const loadFriends = useCallback(async () => {
    if (!profile?.id) return
    try {
      const { data } = await supabase
        .from('friendships')
        .select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)
        .eq('state', 'accepted')

      if (data) {
        setFriends(data.map(f => ({
          ...f,
          friend: f.requester_id === profile.id ? f.addressee : f.requester,
        })))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile])

  const loadRequests = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('friendships')
      .select('*, requester:profiles!requester_id(*)')
      .eq('addressee_id', profile.id)
      .eq('state', 'pending')

    if (data) setRequests(data)
  }, [profile])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (profile?.id) {
        loadFriends()
        loadRequests()
      } else {
        setLoading(false)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [profile, loadFriends, loadRequests])

  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    if (!profile?.id) return

    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, streak_count')
      .neq('id', profile.id)
      .eq('is_deleted', false)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20)

    if (data) setSearchResults(data)
  }

  const sendRequest = async (userId) => {
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: profile.id, addressee_id: userId })

    if (error) {
      toast.error('Không thể gửi lời mời')
    } else {
      toast.success('Đã gửi lời mời kết bạn!')
      setSearchResults(prev => prev.filter(u => u.id !== userId))
    }
  }

  const respondRequest = async (requestId, accept) => {
    const { error } = await supabase
      .from('friendships')
      .update({
        state: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (!error) {
      toast.success(accept ? 'Đã chấp nhận!' : 'Đã từ chối')
      loadRequests()
      if (accept) loadFriends()
    }
  }

  const UserCard = ({ user, actions }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card p-3 flex items-center gap-3"
    >
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          (user?.display_name || 'U').charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.display_name || user?.username}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">@{user?.username}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
      </div>
    </motion.div>
  )

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="tap-highlight p-1">
            <ArrowLeft size={22} className="text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Bạn bè</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t.label}
              {t.key === 'requests' && requests.length > 0 && (
                <span className="ml-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Friends List */}
        {tab === 'friends' && (
          <div className="space-y-2">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="card p-3 flex items-center gap-3">
                  <div className="skeleton w-11 h-11 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-28 mb-1" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                </div>
              ))
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Chưa có bạn bè</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tìm kiếm và kết bạn ngay!</p>
                <button
                  onClick={() => setTab('search')}
                  className="btn btn-primary mt-4 text-sm px-5 py-2.5 rounded-xl"
                >
                  <Search size={16} /> Tìm kiếm
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {friends.map(f => (
                  <UserCard
                    key={f.id}
                    user={f.friend}
                    actions={
                      <button
                        onClick={() => navigate(`/profile/${f.friend?.username}`)}
                        className="tap-highlight p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
                      </button>
                    }
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Không có lời mời nào</p>
              </div>
            ) : (
              <AnimatePresence>
                {requests.map(r => (
                  <UserCard
                    key={r.id}
                    user={r.requester}
                    actions={
                      <>
                        <button
                          onClick={() => respondRequest(r.id, true)}
                          className="tap-highlight p-2 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"
                        >
                          <UserCheck size={16} />
                        </button>
                        <button
                          onClick={() => respondRequest(r.id, false)}
                          className="tap-highlight p-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400"
                        >
                          <UserX size={16} />
                        </button>
                      </>
                    }
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Search */}
        {tab === 'search' && (
          <>
            <div className="relative mb-4">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc username..."
                className="input-base pl-11"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              {searchQuery.length < 2 ? (
                <p className="text-center text-xs text-gray-400 py-8">Nhập ít nhất 2 ký tự để tìm kiếm</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">Không tìm thấy kết quả</p>
              ) : (
                <AnimatePresence>
                  {searchResults.map(u => (
                    <UserCard
                      key={u.id}
                      user={u}
                      actions={
                        <button
                          onClick={() => sendRequest(u.id)}
                          className="tap-highlight px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center gap-1"
                        >
                          <UserPlus size={14} /> Kết bạn
                        </button>
                      }
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
