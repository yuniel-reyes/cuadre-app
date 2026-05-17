import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { AppUser, Business } from '../types'

interface AuthState {
  user: AppUser | null
  business: Business | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  business: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: appUser } = await supabase
        .from('users')
        .select('*, businesses(*)')
        .eq('id', session.user.id)
        .single()

      if (appUser) {
        set({
          user: appUser,
          business: appUser.businesses,
          initialized: true,
        })
        return
      }
    }

    set({ initialized: true })

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null, business: null })
        return
      }
      if (event === 'SIGNED_IN' && session.user) {
        const { data: appUser } = await supabase
          .from('users')
          .select('*, businesses(*)')
          .eq('id', session.user.id)
          .single()

        if (appUser) {
          set({ user: appUser, business: appUser.businesses })
        }
      }
    })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, business: null })
  },
}))
