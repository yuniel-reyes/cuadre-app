import {
  AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/web'
import { supabase } from './supabase'

// Maps each table to the Supabase upsert/delete operations
// PowerSync calls uploadData() whenever there are local changes to sync up

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) throw new Error('Not authenticated')

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL as string,
      token: session.access_token,
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    try {
      for (const op of transaction.crud) {
        const table = op.table
        const id = op.id

        if (op.op === UpdateType.PUT) {
          const record = { id, ...(op.opData ?? {}) }
          const { error } = await supabase.from(table).upsert(record)
          if (error) throw error
        } else if (op.op === UpdateType.PATCH) {
          const { error } = await supabase.from(table).update(op.opData ?? {}).eq('id', id)
          if (error) throw error
        } else if (op.op === UpdateType.DELETE) {
          const { error } = await supabase.from(table).delete().eq('id', id)
          if (error) throw error
        }
      }

      await transaction.complete()
    } catch (e) {
      console.error('PowerSync upload error:', e)
      throw e
    }
  }
}
