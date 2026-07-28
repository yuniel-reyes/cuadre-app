import { useEffect, useRef, useState } from 'react'

interface Props {
  onDetect: (barcode: string) => void
  onClose: () => void
}

// BarcodeDetector is available in Chrome for Android but not in TypeScript lib
declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
  static getSupportedFormats(): Promise<string[]>
}

const FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']

export default function BarcodeScanner({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activeRef = useRef(true)
  const [nativeSupport] = useState(() => 'BarcodeDetector' in window)
  const [cameraError, setCameraError] = useState('')
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    if (!nativeSupport) return

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        streamRef.current = stream
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const detector = new BarcodeDetector({ formats: FORMATS })

        const tick = async () => {
          if (!activeRef.current) return
          const vid = videoRef.current
          if (vid && vid.readyState >= 2) {
            try {
              const results = await detector.detect(vid)
              if (results.length > 0 && activeRef.current) {
                activeRef.current = false
                onDetect(results[0].rawValue)
                return
              }
            } catch (_) {}
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      } catch {
        setCameraError('No se pudo acceder a la cámara.')
      }
    }

    start()
    return () => {
      activeRef.current = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [nativeSupport, onDetect])

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (code) onDetect(code)
  }

  const showManual = !nativeSupport || cameraError

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display font-bold text-ink">Escanear código</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>

        {showManual ? (
          /* Fallback: manual entry */
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {cameraError || 'Tu navegador no soporta escaneo automático.'}
            </p>
            <form onSubmit={handleManual} className="flex gap-2">
              <input
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Código de barras..."
                inputMode="numeric"
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-terracotta text-cream rounded-lg text-sm font-medium disabled:opacity-40"
              >
                Buscar
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Camera viewfinder */}
            <div className="relative bg-black" style={{ aspectRatio: '1' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Frame guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-32 border-2 border-terracotta rounded-lg opacity-90" />
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-cream/80">
                Apunta al código de barras del producto
              </p>
            </div>

            {/* Manual fallback input */}
            <div className="p-4">
              <form onSubmit={handleManual} className="flex gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="O escribe el código..."
                  inputMode="numeric"
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-3 py-2 bg-terracotta text-cream rounded-lg text-sm font-medium disabled:opacity-40"
                >
                  OK
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
