import { useStatus } from '@powersync/react'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function SyncStatusPill() {
  const status = useStatus()

  const connected = status.connected
  const syncing = status.dataFlowStatus?.downloading || status.dataFlowStatus?.uploading

  let label = ''
  let dotClass = ''

  if (!connected) {
    label = 'Offline'
    dotClass = 'bg-ember'
  } else if (syncing) {
    label = 'Sincronizando'
    dotClass = 'bg-terracotta animate-pulse'
  } else if (status.lastSyncedAt) {
    label = timeAgo(status.lastSyncedAt)
    dotClass = 'bg-moss'
  } else {
    label = 'Conectado'
    dotClass = 'bg-moss'
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sand border border-border">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
    </div>
  )
}
