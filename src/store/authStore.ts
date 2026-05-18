import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { AppUser, Business, UserRole } from '../types'

// ─── Demo mode ───────────────────────────────────────────────────────────────
export const DEMO_MODE = true

const DEMO_BUSINESS: Business = {
  id: 'demo-business',
  name: 'Cafetería El Rincón',
  type: 'cafeteria',
  owner_id: 'demo-owner',
  created_at: new Date().toISOString(),
}

const DEMO_USERS: Record<UserRole, AppUser> = {
  owner: {
    id: 'demo-owner',
    business_id: 'demo-business',
    name: 'Carlos Méndez',
    role: 'owner',
    active: true,
  },
  supervisor: {
    id: 'demo-supervisor',
    business_id: 'demo-business',
    name: 'María García',
    role: 'supervisor',
    active: true,
  },
  dependiente: {
    id: 'demo-dependiente',
    business_id: 'demo-business',
    name: 'Luis Torres',
    role: 'dependiente',
    active: true,
  },
}
// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AppUser | null
  business: Business | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  setDemoRole: (role: UserRole) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  business: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (DEMO_MODE) {
      set({
        user: DEMO_USERS.owner,
        business: DEMO_BUSINESS,
        initialized: true,
      })
      return
    }

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

  setDemoRole: (role) => {
    set({ user: DEMO_USERS[role], business: DEMO_BUSINESS })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    if (DEMO_MODE) {
      set({ user: DEMO_USERS.owner, business: DEMO_BUSINESS })
      return
    }
    await supabase.auth.signOut()
    set({ user: null, business: null })
  },
}))
