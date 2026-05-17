import { Link } from 'react-router-dom'

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-black tracking-tight text-ink">Cuadre</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">v1.0</span>
        </a>
        <div className="hidden gap-8 text-sm font-medium md:flex">
          <a href="#problema" className="text-ink/70 hover:text-ink transition-colors">El problema</a>
          <a href="#modulos" className="text-ink/70 hover:text-ink transition-colors">Módulos</a>
          <a href="#hoja-de-ruta" className="text-ink/70 hover:text-ink transition-colors">Hoja de ruta</a>
          <a href="#precio" className="text-ink/70 hover:text-ink transition-colors">Precio</a>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition hover:bg-terracotta"
        >
          Probar Cuadre →
        </Link>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grain opacity-40" />
      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-32">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="tag bg-terracotta/10 text-terracotta border-terracotta/30">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
            Hecho en Cuba · Para Cuba
          </span>
          <span className="tag">CUP · MLC · USD</span>
        </div>

        <h1 className="font-display text-[clamp(3rem,9vw,8.5rem)] font-black leading-[0.88] tracking-[-0.03em] text-ink">
          Cuadra el día,<br />
          <span className="italic text-terracotta">sin lío.</span>
        </h1>

        <div className="mt-10 grid gap-10 md:grid-cols-12">
          <p className="md:col-span-6 md:col-start-7 text-lg leading-relaxed text-ink/75">
            Cuadre es el sistema de gestión comercial pensado para MIPYMEs,
            paladares y cuentapropistas cubanos. POS que funciona sin internet,
            inventario, cuentas y reportes claros. Lo instalas hoy,
            lo usas hoy.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <a
            href="#contacto"
            className="group inline-flex items-center gap-3 rounded-full bg-terracotta px-7 py-4 text-base font-semibold text-cream shadow-[0_8px_30px_-8px_oklch(0.62_0.16_38)] transition hover:bg-ember"
          >
            Pedir una demo
            <span className="transition group-hover:translate-x-1">→</span>
          </a>
          <a
            href="#modulos"
            className="inline-flex items-center gap-2 px-4 py-4 text-base font-medium text-ink underline decoration-terracotta decoration-2 underline-offset-4 hover:decoration-4"
          >
            Ver qué incluye
          </a>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-10 md:grid-cols-4">
          {[
            ['72h', 'operando sin internet'],
            ['3 clics', 'para cerrar una venta'],
            ['15 min', 'de configuración inicial'],
            ['3 monedas', 'nativas en cada ticket'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="font-display text-4xl font-bold text-ink md:text-5xl">{k}</div>
              <div className="mt-2 text-sm text-muted-foreground">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  const items = ['Paladares', 'Bodegas', 'Tiendas MLC', 'Cuentapropistas', 'Cafeterías', 'Barberías', 'Talleres', 'MIPYMEs']
  return (
    <div className="overflow-hidden border-b border-border bg-ink py-6 text-cream">
      <div className="marquee font-display text-3xl font-medium italic">
        {[...items, ...items].map((it, i) => (
          <span key={i} className="flex items-center gap-16">
            {it}
            <span className="text-terracotta">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Problema() {
  const rows = [
    ['UI solo en inglés', 'Adopción nula sin español nativo', 'Crítica'],
    ['POS offline limitado', 'Inutilizable con internet inestable', 'Crítica'],
    ['Sin multi-moneda simple', 'Cuba opera en CUP, MLC y USD a la vez', 'Alta'],
    ['Reportes rudimentarios', 'El dueño no puede generar los suyos', 'Alta'],
    ['Personalización con código', 'Imposible adaptar sin developers', 'Alta'],
    ['Sin hardware local barato', 'Cuba usa térmicas viejas y USB', 'Media'],
  ]
  return (
    <section id="problema" className="relative border-b border-border px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="tag mb-6">§01 · El problema</div>
            <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
              Excel, cuadernos y caos.
            </h2>
            <p className="mt-6 text-ink/70">
              SAP es inaccesible. QuickBooks no llega. Los sistemas que existen
              piensan en otro mercado. Las MIPYMEs cubanas cuadran cuentas a
              mano cada noche.
            </p>
          </div>

          <div className="md:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-12 border-b border-border bg-ink px-6 py-4 text-xs font-mono uppercase tracking-widest text-cream/70">
                <div className="col-span-5">Brecha</div>
                <div className="col-span-5">Impacto en Cuba</div>
                <div className="col-span-2 text-right">Prioridad</div>
              </div>
              {rows.map(([gap, impact, prio], i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 items-center border-b border-border px-6 py-5 text-sm last:border-b-0 hover:bg-secondary/40"
                >
                  <div className="col-span-5 font-medium text-ink">{gap}</div>
                  <div className="col-span-5 text-ink/70">{impact}</div>
                  <div className="col-span-2 text-right">
                    <span className={`tag ${
                      prio === 'Crítica'
                        ? 'bg-terracotta text-cream border-terracotta'
                        : prio === 'Alta'
                        ? 'bg-ember/15 text-ember border-ember/40'
                        : 'bg-sand text-ink/70'
                    }`}>
                      {prio}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Modulos() {
  const mods = [
    {
      n: '01',
      title: 'POS',
      sub: 'Punto de venta offline',
      desc: 'Vende sin internet hasta 72 horas. Sincroniza automáticamente al volver la conexión. Cobro en CUP, MLC o USD con vuelto en la moneda recibida.',
      bullets: ['Service Worker + IndexedDB', 'Cierre de caja guiado', 'Búsqueda por código de barras'],
    },
    {
      n: '02',
      title: 'Inventario',
      sub: 'Stock que cuadra solo',
      desc: 'Alta de productos con foto, costo y precio. Alertas de stock mínimo. Valoración FIFO o AVCO automática. Gestión de proveedores locales.',
      bullets: ['Multi-almacén', 'Costo automático', 'Alertas en Telegram'],
    },
    {
      n: '03',
      title: 'Contabilidad',
      sub: 'Cuentas sin jerga',
      desc: 'P&L en cubano: ventas menos costos igual ganancia. Cierre de caja diario. COGS automático al vender. Sin debe ni haber, sin estados financieros NIIF.',
      bullets: ['P&L simplificado', 'Cierre diario', 'Gastos por categoría'],
    },
    {
      n: '04',
      title: 'CRM',
      sub: 'Tu cartera, ordenada',
      desc: 'Clientes con teléfono, dirección y notas. Historial completo de compras. Segmenta frecuentes, nuevos e inactivos. Búscalos desde el POS al cobrar.',
      bullets: ['Historial por cliente', 'Segmentación simple', 'Notas internas'],
    },
  ]
  return (
    <section id="modulos" className="border-b border-border bg-sand/50 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="tag mb-6">§02 · Módulos</div>
            <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
              Cuatro piezas.<br />
              <span className="italic text-terracotta">Un negocio cuadrado.</span>
            </h2>
          </div>
          <p className="max-w-sm text-ink/70">
            Construido desde cero para Cuba, simplificado hasta los huesos
            para que un dueño sin experiencia técnica lo entienda en una tarde.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2">
          {mods.map((m) => (
            <article key={m.n} className="group relative bg-cream p-10 transition hover:bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs tracking-widest text-terracotta">{m.n}</div>
                  <h3 className="mt-3 font-display text-4xl font-bold tracking-tight">{m.title}</h3>
                  <div className="mt-1 font-display text-lg italic text-muted-foreground">{m.sub}</div>
                </div>
                <span className="text-2xl text-terracotta opacity-0 transition group-hover:opacity-100">→</span>
              </div>
              <p className="mt-6 text-ink/75 leading-relaxed">{m.desc}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.bullets.map((b) => (
                  <li key={b} className="tag bg-ink/5">{b}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function MultiMoneda() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-ink px-6 py-24 text-cream md:py-32">
      <div className="absolute inset-0 grain opacity-30" />
      <div className="relative mx-auto grid max-w-7xl gap-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="tag mb-6 border-cream/30 text-cream/70">§03 · Multi-moneda</div>
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
            CUP, MLC, USD.<br />
            <span className="italic text-ember">En el mismo ticket.</span>
          </h2>
          <p className="mt-6 max-w-md text-cream/70">
            Configura tu tasa de cambio del día. Cobra como te paguen.
            Devuelve vuelto en la moneda recibida. Al cierre, reporte separado
            por divisa.
          </p>
        </div>

        <div className="md:col-span-7">
          <div className="rounded-2xl border border-cream/10 bg-cream/5 p-8 backdrop-blur">
            <div className="mb-6 flex items-center justify-between border-b border-cream/10 pb-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-cream/50">Ticket #001247</div>
                <div className="font-display text-2xl text-cream">Paladar La Guarida</div>
              </div>
              <div className="tag border-moss/40 bg-moss/20 text-cream">● en línea</div>
            </div>

            <div className="space-y-3 text-cream/90">
              {[
                ['Ropa vieja', '$ 1,200 CUP'],
                ['Mojito x2', '$ 6.00 USD'],
                ['Flan de la casa', '$ 350 CUP'],
              ].map(([item, price]) => (
                <div key={item} className="flex justify-between font-mono text-sm">
                  <span>{item}</span>
                  <span>{price}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-cream/10 pt-6">
              {[
                ['CUP', '1,550'],
                ['USD', '6.00'],
                ['MLC', '0.00'],
              ].map(([cur, amt]) => (
                <div key={cur} className="rounded-lg border border-cream/10 bg-ink/40 p-4">
                  <div className="font-mono text-[10px] tracking-widest text-cream/50">{cur}</div>
                  <div className="font-display text-2xl font-bold text-cream">{amt}</div>
                </div>
              ))}
            </div>

            <button className="mt-6 w-full rounded-xl bg-terracotta py-4 font-semibold text-cream transition hover:bg-ember">
              Cobrar y cerrar venta →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Roadmap() {
  const phases = [
    ['Fase 0', 'Setup', 'Arquitectura · branding · ES nativo'],
    ['Fase 1', 'POS MVP', 'Offline-first · multi-moneda · cierre'],
    ['Fase 2', 'Inventario + COGS', 'Stock · costo automático en P&L'],
    ['Fase 3', 'Contabilidad', 'P&L · balance · cierre de día'],
    ['Fase 4', 'CRM + Dashboard', 'Clientes · KPIs · pantalla principal'],
    ['Fase 5', 'QA + Onboarding', 'Wizard · pruebas · documentación'],
  ]
  return (
    <section id="hoja-de-ruta" className="border-b border-border px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16">
          <div className="tag mb-6">§04 · Hoja de ruta</div>
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
            De cero a producción<br />
            <span className="italic text-terracotta">en nada.</span>
          </h2>
        </div>

        <div className="relative">
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-border md:block" />
          <div className="grid gap-8 md:grid-cols-6">
            {phases.map(([fase, title, desc], i) => (
              <div key={fase} className="relative">
                <div className={`mb-6 hidden h-3 w-3 rounded-full md:block ring-4 ring-cream ${i < 2 ? 'bg-terracotta' : 'bg-border'}`} />
                <div className="font-mono text-xs uppercase tracking-widest text-terracotta">{fase}</div>
                <div className="mt-2 font-display text-xl font-bold text-ink">{title}</div>
                <p className="mt-3 text-sm text-ink/70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Precio() {
  const plans = [
    {
      name: 'Cuentapropista',
      price: '50',
      desc: 'Instalación + 1 mes de soporte',
      features: ['POS móvil', 'Hasta 200 productos', '1 usuario'],
    },
    {
      name: 'MIPYME',
      price: '120',
      desc: 'Instalación + 3 meses de soporte',
      featured: true,
      features: ['Todo lo anterior', 'Inventario + CRM', 'Hasta 5 usuarios', 'Reportes avanzados'],
    },
    {
      name: 'Multi-local',
      price: '150',
      desc: '+ implementación a medida',
      features: ['Todo lo anterior', 'Multi-almacén', 'Usuarios ilimitados', 'Soporte prioritario'],
    },
  ]
  return (
    <section id="precio" className="border-b border-border bg-sand/50 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="tag mb-6">§05 · Precio</div>
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
            Pago único.<br /><span className="italic text-terracotta">Sin sorpresas.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 ${
                p.featured ? 'border-terracotta bg-ink text-cream' : 'border-border bg-cream'
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-terracotta px-3 py-1 text-xs font-mono uppercase tracking-widest text-cream">
                  Más popular
                </div>
              )}
              <div className="font-display text-2xl font-bold">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-6xl font-black">${p.price}</span>
                <span className={`text-sm ${p.featured ? 'text-cream/60' : 'text-muted-foreground'}`}>USD</span>
              </div>
              <p className={`mt-2 text-sm ${p.featured ? 'text-cream/70' : 'text-ink/70'}`}>{p.desc}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className={p.featured ? 'text-ember' : 'text-terracotta'}>✦</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Precios en USD o equivalente en MLC / CUP a la tasa del día. Pago en efectivo, transferencia o MLC.
        </p>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section id="contacto" className="relative overflow-hidden bg-terracotta px-6 py-24 text-cream md:py-32">
      <div className="absolute inset-0 grain opacity-20" />
      <div className="relative mx-auto max-w-5xl text-center">
        <h2 className="font-display text-6xl font-black leading-[0.9] tracking-tight md:text-8xl">
          Cuadra tu negocio<br />
          <span className="italic">esta semana.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-lg text-lg text-cream/85">
          Escríbenos por WhatsApp o correo. Te montamos una demo en tu local
          o por videollamada — sin compromiso.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="https://wa.me/5350000000"
            className="inline-flex items-center gap-2 rounded-full bg-cream px-7 py-4 font-semibold text-ink transition hover:bg-ink hover:text-cream"
          >
            WhatsApp · +53 5000 0000
          </a>
          <a
            href="mailto:hola@cuadre.cu"
            className="inline-flex items-center gap-2 rounded-full border-2 border-cream/40 px-7 py-4 font-semibold transition hover:border-cream"
          >
            hola@cuadre.cu
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-ink px-6 py-12 text-cream/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6">
        <div>
          <div className="font-display text-3xl font-black text-cream">Cuadre</div>
          <p className="mt-2 max-w-sm text-sm">
            Sistema de gestión comercial hecho para Cuba.
            POS offline, inventario y reportes en cristiano.
          </p>
        </div>
        <div className="font-mono text-xs">
          © 2026 Cuadre · La Habana · v1.0
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main>
      <Nav />
      <Hero />
      <Marquee />
      <Problema />
      <Modulos />
      <MultiMoneda />
      <Roadmap />
      <Precio />
      <CTA />
      <Footer />
    </main>
  )
}
