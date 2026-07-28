import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { connectPowerSync, disconnectPowerSync } from '../lib/powersync'
import type { AppUser, Business, UserRole } from '../types'

// ─── Demo mode ───────────────────────────────────────────────────────────────
export const DEMO_MODE = false

const DEMO_BUSINESS_1: Business = {
  id: 'demo-business',
  name: 'Cafetería El Rincón',
  type: 'cafeteria',
  owner_id: 'demo-owner',
  created_at: new Date().toISOString(),
}

const DEMO_BUSINESS_2: Business = {
  id: 'demo-business-2',
  name: 'Tienda La Esquina',
  type: 'tienda',
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

const DEMO_BUSINESSES_BY_ROLE: Record<UserRole, Business[]> = {
  owner:       [DEMO_BUSINESS_1, DEMO_BUSINESS_2],
  supervisor:  [DEMO_BUSINESS_1],
  dependiente: [DEMO_BUSINESS_1],
}
// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AppUser | null
  business: Business | null
  businesses: Business[]
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  setDemoRole: (role: UserRole) => void
  switchBusiness: (businessId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  business: null,
  businesses: [],
  loading: false,
  initialized: false,

  initialize: async () => {
    if (DEMO_MODE) {
      set({
        user: DEMO_USERS.owner,
        business: DEMO_BUSINESS_1,
        businesses: DEMO_BUSINESSES_BY_ROLE.owner,
        initialized: true,
      })
      return
    }

    // Register auth listener once — handles sign in/out/token refresh
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        await disconnectPowerSync()
        set({ user: null, business: null, businesses: [] })
        return
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        // Re-derive active business/role from the refreshed JWT claims
        await loadUserContext(session.user.id, session.access_token, set)
      }
    })

    // Load existing session on startup
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadUserContext(session.user.id, session.access_token, set)
      await connectPowerSync()
    }

    set({ initialized: true })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ loading: false })
      return { error: error.message }
    }
    if (data.session) {
      await loadUserContext(data.user.id, data.session.access_token, set)
      await connectPowerSync()
    }
    set({ loading: false })
    return { error: null }
  },

  signOut: async () => {
    if (DEMO_MODE) {
      set({
        user: DEMO_USERS.owner,
        business: DEMO_BUSINESS_1,
        businesses: DEMO_BUSINESSES_BY_ROLE.owner,
      })
      return
    }
    await disconnectPowerSync()
    await supabase.auth.signOut()
    set({ user: null, business: null, businesses: [] })
  },

  setDemoRole: (role) => {
    const currentBusinessId = get().user?.business_id ?? 'demo-business'
    const available = DEMO_BUSINESSES_BY_ROLE[role]
    const business = available.find((b) => b.id === currentBusinessId) ?? available[0]
    set({
      user: { ...DEMO_USERS[role], business_id: business.id },
      business,
      businesses: available,
    })
  },

  switchBusiness: async (businessId) => {
    if (DEMO_MODE) {
      const { user, businesses } = get()
      if (!user) return
      const business = businesses.find((b) => b.id === businessId)
      if (!business) return
      set({ user: { ...user, business_id: businessId }, business })
      return
    }

    set({ loading: true })
    try {
      const { error } = await supabase.functions.invoke('set-active-business', {
        body: { business_id: businessId },
      })
      if (error) throw error

      // Refresh session → new JWT with updated app_metadata claims
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError || !session) throw refreshError ?? new Error('Session refresh failed')

      await disconnectPowerSync()
      await loadUserContext(session.user.id, session.access_token, set)
      await connectPowerSync()
    } catch (err) {
      console.error('switchBusiness error:', err)
    } finally {
      set({ loading: false })
    }
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadUserContext(
  userId: string,
  accessToken: string,
  set: (partial: Partial<AuthState>) => void
) {
  // Load user profile
  const { data: userRow } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', userId)
    .single()

  if (!userRow) return

  // Load all active memberships with business details
  const { data: memberships } = await supabase
    .from('user_businesses')
    .select('id, role, active, business_id, businesses(*)')
    .eq('user_id', userId)
    .eq('active', true)

  if (!memberships || memberships.length === 0) return

  const businesses = memberships
    .map((m) => m.businesses as unknown as Business)
    .filter(Boolean)

  // Determine active business from JWT app_metadata
  let activeBusinessId: string | undefined
  let activeRole: UserRole | undefined
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    activeBusinessId = payload.app_metadata?.active_business_id
    activeRole = payload.app_metadata?.active_role
  } catch {
    // JWT decode failed — fall back to first membership
  }

  const activeMembership = memberships.find((m) => m.business_id === activeBusinessId)
    ?? memberships[0]
  const activeBusiness = businesses.find((b) => b.id === activeMembership.business_id)
    ?? businesses[0]

  set({
    user: {
      id: userRow.id,
      name: userRow.name,
      business_id: activeBusiness.id,
      role: (activeRole ?? activeMembership.role) as UserRole,
      active: true,
    },
    business: activeBusiness,
    businesses,
  })
}
