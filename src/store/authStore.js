import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),

      fetchProfile: async (userId) => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .eq('is_deleted', false)
          .single()

        if (!error && data) {
          set({ profile: data })
        }
        return { data, error }
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
