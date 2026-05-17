import { useState } from 'react'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'

interface Props {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: Props) {
  const { user, business } = useAuthStore()
  const [step, setStep] = useState(1)
  const [mlc, setMlc] = useState('')
  const [usd, setUsd] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const id = crypto.randomUUID()
    await db.execute(
      `INSERT INTO exchange_rates (id, business_id, mlc_to_cup, usd_to_cup, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, user.business_id, parseFloat(mlc), parseFloat(usd), new Date().toISOString(), user.id]
    )

    setSaving(false)
    setStep(3)
  }

  const inputCls = 'w-full px-4 py-3 border border-border rounded-xl text-lg bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent'

  return (
    <div className="fixed inset-0 bg-cream z-50 flex flex-col grain">
      {/* Progress bar */}
      <div className="h-1 bg-sand">
        <div
          className="h-1 bg-terracotta transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-sm mx-auto w-full">

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="space-y-6 w-full text-center">
            <div className="w-20 h-20 bg-terracotta/10 rounded-3xl flex items-center justify-center mx-auto border border-terracotta/20">
              <svg className="w-10 h-10 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-3xl font-black text-ink tracking-tight">Bienvenido a Cuadre</h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Configuremos <span className="font-semibold text-ink">{business?.name}</span> en menos de 2 minutos.
              </p>
            </div>
            <div className="text-left space-y-3">
              {[
                'Configurar tasas de cambio',
                'Agregar tus productos',
                'Empezar a usar el cuadre',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-terracotta/10 text-terracotta rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-terracotta/20">
                    {i + 1}
                  </div>
                  <span className="text-sm text-ink/80">{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-terracotta text-cream py-3 rounded-xl font-semibold hover:bg-ember transition-colors"
            >
              Comenzar →
            </button>
          </div>
        )}

        {/* Step 2 — Exchange rates */}
        {step === 2 && (
          <form onSubmit={handleSaveRates} className="space-y-6 w-full">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-ink">Tasas de cambio</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Usadas para convertir MLC y USD a CUP en los reportes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                  1 MLC = _____ CUP
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="1"
                  required
                  value={mlc}
                  onChange={(e) => setMlc(e.target.value)}
                  placeholder="240"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                  1 USD = _____ CUP
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="1"
                  required
                  value={usd}
                  onChange={(e) => setUsd(e.target.value)}
                  placeholder="300"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-terracotta text-cream py-3 rounded-xl font-semibold hover:bg-ember disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar y continuar →'}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full text-sm text-muted-foreground hover:text-ink transition-colors"
            >
              Omitir por ahora
            </button>
          </form>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="space-y-6 w-full text-center">
            <div className="w-20 h-20 bg-moss/10 rounded-3xl flex items-center justify-center mx-auto border border-moss/20">
              <svg className="w-10 h-10 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Listo para empezar</h2>
              <p className="text-sm text-muted-foreground mt-2">Aquí está lo que puedes hacer ahora:</p>
            </div>
            <div className="text-left bg-sand rounded-2xl p-4 space-y-3 border border-border">
              {[
                { icon: '📦', label: 'Productos', desc: 'Agrega tu catálogo con precios y costos' },
                { icon: '📋', label: 'Turnos', desc: 'Los dependientes abren su turno al llegar' },
                { icon: '💰', label: 'Ventas', desc: 'Registra ventas desde la pantalla POS' },
                { icon: '📊', label: 'Reportes', desc: 'Ve tus ganancias y COGS en tiempo real' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={onComplete}
              className="w-full bg-terracotta text-cream py-3 rounded-xl font-semibold hover:bg-ember transition-colors"
            >
              Ir al panel →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
