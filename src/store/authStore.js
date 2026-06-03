import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),

      fetchProfile: async (userId) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .eq('is_deleted', false)
            .maybeSingle() // Use maybeSingle to avoid 406 error on empty row

          if (!error && data) {
            set({ profile: data })
          }
          return { data, error }
        } catch (err) {
          console.error('fetchProfile error:', err)
          return { data: null, error: err }
        }
      },

      createProfileFallback: async (user) => {
        try {
          const base = user.email ? user.email.split('@')[0] : 'user'
          const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '')
          const username = `${clean || 'user'}_${user.id.substring(0, 4)}`
          
          const profileData = {
            id: user.id,
            username,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || username,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          }

          const { data, error } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single()

          if (!error && data) {
            set({ profile: data })
          }
          return { data, error }
        } catch (err) {
          console.error('createProfileFallback error:', err)
          return { data: null, error: err }
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isAuthenticated: false })
      },
    }),
    {
      name: 'mydaily-auth',
      partialize: (state) => ({ user: state.user, profile: state.profile }),
    }
  )
)
