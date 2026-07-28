import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types'

interface UserRow {
  id: string
  name: string
  role: UserRole
  active: number
  ub_id: string  // user_businesses.id for updates
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner:        'Dueño',
  supervisor:   'Supervisor',
  dependiente:  'Dependiente',
}

const ROLE_STYLES: Record<UserRole, string> = {
  owner:       'bg-terracotta/10 text-terracotta border-terracotta/30',
  supervisor:  'bg-ember/10 text-ember border-ember/30',
  dependiente: 'bg-sand text-ink/60 border-border',
}

export default function UserManagementPage() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'dependiente' as UserRole })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null)

  const { data: users = [] } = useQuery<UserRow>(
    `SELECT u.id, u.name, ub.role, ub.active, ub.id as ub_id
     FROM users u
     JOIN user_businesses ub ON ub.user_id = u.id
     WHERE ub.business_id = ?
     ORDER BY ub.role, u.name`,
    [user?.business_id]
  )

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data, error: signUpError } = await supabaseAdmin.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Error creando el usuario')
      setSaving(false)
      return
    }

    // Insert user profile
    const { error: userError } = await supabase
      .from('users')
      .insert({ id: data.user.id, name: form.name })

    if (userError) {
      setError(userError.message)
      setSaving(false)
      return
    }

    // Insert membership
    const { error: memberError } = await supabase
      .from('user_businesses')
      .insert({
        user_id: data.user.id,
        business_id: user!.business_id,
        role: form.role,
        active: true,
      })

    if (memberError) {
      setError(memberError.message)
      setSaving(false)
      return
    }

    setCreated({ name: form.name, email: form.email, password: form.password })
    setForm({ name: '', email: '', password: '', role: 'dependiente' })
    setSaving(false)
    setShowForm(false)
  }

  const toggleActive = async (u: UserRow) => {
    await db.execute(
      `UPDATE user_businesses SET active = ? WHERE id = ?`,
      [u.active ? 0 : 1, u.ub_id]
    )
  }

  const handleChangeRole = async (u: UserRow, role: UserRole) => {
    await db.execute(`UPDATE user_businesses SET role = ? WHERE id = ?`, [role, u.ub_id])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-ink">Usuarios</h2>
        <button
          onClick={() => { setShowForm(true); setCreated(null) }}
          className="text-sm bg-terracotta text-cream px-3 py-1.5 rounded-lg font-medium hover:bg-ember transition-colors"
        >
          + Agregar
        </button>
      </div>

      {/* Created credentials banner */}
      {created && (
        <div className="bg-moss/10 border border-moss/30 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-moss">Usuario creado. Comparte estas credenciales:</p>
          <div className="bg-cream rounded-lg p-3 text-sm font-mono space-y-1 border border-border">
            <p><span className="text-muted-foreground">Nombre:</span> {created.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {created.email}</p>
            <p><span className="text-muted-foreground">Contraseña:</span> {created.password}</p>
          </div>
          <p className="text-xs text-moss/80">
            El usuario debe confirmar su email antes de poder entrar (si la confirmación está activa en Supabase).
          </p>
          <button onClick={() => setCreated(null)} className="text-xs text-moss underline">
            Cerrar
          </button>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className={`bg-card border border-border rounded-xl p-3 flex items-center gap-3 ${
              !u.active ? 'opacity-50' : ''
            }`}
          >
            <div className="w-9 h-9 bg-sand rounded-full flex items-center justify-center shrink-0 border border-border">
              <span className="text-sm font-semibold text-ink/60">
                {u.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink truncate">{u.name}</span>
                <span className={`tag text-[10px] shrink-0 ${ROLE_STYLES[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
              </div>
              {!u.active && <span className="text-xs text-muted-foreground">Inactivo</span>}
            </div>
            {u.id !== user?.id && (
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={u.role}
                  onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                  className="text-xs border border-border rounded-lg px-2 py-1 bg-cream text-ink focus:outline-none"
                >
                  <option value="dependiente">Dependiente</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="owner">Dueño</option>
                </select>
                <button
                  onClick={() => toggleActive(u)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                    u.active
                      ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                      : 'border-moss/30 text-moss hover:bg-moss/10'
                  }`}
                >
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add user form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-ink">Nuevo usuario</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground text-xl leading-none hover:text-ink">×</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { field: 'name', label: 'Nombre', type: 'text', placeholder: 'María García' },
                { field: 'email', label: 'Email', type: 'email', placeholder: 'maria@ejemplo.com' },
                { field: 'password', label: 'Contraseña temporal', type: 'text', placeholder: 'Mín. 6 caracteres' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                    {label}
                  </label>
                  <input
                    required
                    type={type}
                    minLength={field === 'password' ? 6 : undefined}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => set(field, e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
                >
                  <option value="dependiente">Dependiente</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-terracotta text-cream py-2.5 rounded-xl font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creando...' : 'Crear usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
