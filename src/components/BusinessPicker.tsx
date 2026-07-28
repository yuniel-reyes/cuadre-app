import { useAuthStore } from '../store/authStore'

export default function BusinessPicker() {
  const { businesses, switchBusiness, loading } = useAuthStore()

  return (
    <div className="min-h-svh bg-cream flex flex-col items-center justify-center p-6 grain">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-terracotta/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-terracotta/20">
            <svg className="w-8 h-8 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">¿Con qué negocio vas a trabajar?</h1>
          <p className="text-sm text-muted-foreground mt-1">Tienes acceso a más de un negocio. Elige uno para continuar.</p>
        </div>

        <div className="space-y-2">
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => switchBusiness(b.id)}
              disabled={loading}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-terracotta/40 hover:bg-terracotta/5 transition-colors disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{b.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{b.type}</p>
                </div>
                <svg className="w-4 h-4 text-muted-foreground group-hover:text-terracotta transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-center text-sm text-muted-foreground font-mono">Cambiando negocio...</p>
        )}
      </div>
    </div>
  )
}
