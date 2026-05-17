import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const { signIn, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError(error)
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-cream px-4 grain">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl font-black tracking-tight text-ink">Cuadre</h1>
          <p className="text-muted-foreground mt-2 text-sm font-mono uppercase tracking-widest">
            Control de turno y ventas
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl border border-border p-7 space-y-5 shadow-sm"
        >
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent placeholder:text-ink/30"
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-terracotta text-cream py-3 rounded-xl font-semibold text-sm hover:bg-ember disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>
      </div>
    </div>
  )
}
