import { PowerSyncDatabase } from '@powersync/web'
import { AppSchema } from './schema'
import { SupabaseConnector } from './supabaseConnector'

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'cuadre.db' },
})

// Temporary debug: expose db to window for console inspection
if (typeof window !== 'undefined') {
  (window as any).__psdb = db
}

export const connector = new SupabaseConnector()

export async function connectPowerSync() {
  await db.connect(connector)
}

export async function disconnectPowerSync() {
  await db.disconnect()
}
