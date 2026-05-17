import { PowerSyncDatabase } from '@powersync/web'
import { AppSchema } from './schema'
import { SupabaseConnector } from './supabaseConnector'

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'cuadre.db' },
})

export const connector = new SupabaseConnector()

export async function connectPowerSync() {
  await db.connect(connector)
}

export async function disconnectPowerSync() {
  await db.disconnect()
}
