import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export default function BusinessSwitcher() {
  const { business, businesses, switchBusiness, loading } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (businesses.length <= 1) return null

  const handleSwitch = async (id: string) => {
    setOpen(false)
    if (id !== business?.id) await switchBusiness(id)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-sand hover:bg-border/50 transition-colors text-sm font-medium text-ink disabled:opacity-50 max-w-[160px]"
        title="Cambiar negocio"
      >
        <svg className="w-3.5 h-3.5 text-terracotta shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="truncate">{business?.name}</span>
        <svg className="w-3 h-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <p className="px-3 pt-2.5 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Mis negocios
          </p>
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => handleSwitch(b.id)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-sand transition-colors ${
                b.id === business?.id ? 'bg-terracotta/5' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${b.id === business?.id ? 'bg-terracotta' : 'bg-border'}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{b.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{b.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
