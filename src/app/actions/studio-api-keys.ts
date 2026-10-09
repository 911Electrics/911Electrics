'use server'

import { revalidatePath } from 'next/cache'

import { normalizeGrants } from '@/lib/api-scopes'
import { createApiKey, isMissingTable, revokeApiKey } from '@/studio/api-keys'
import { logAudit } from '@/studio/audit'
import { requireActionAdmin } from '@/studio/auth'

export type CreateApiKeyResult =
  | { ok: true; key: string; name: string }
  | { ok: false; error: string }

const EXPIRY_DAYS = new Set([30, 90, 365])
const NOT_INSTALLED =
  'API keys are not installed yet — apply db/migrations/20260918_api_keys.sql to the database.'

export async function createApiKeyAction(formData: FormData): Promise<CreateApiKeyResult> {
  const me = await requireActionAdmin()

  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 3 || name.length > 60) {
    return { ok: false, error: 'Give the key a name between 3 and 60 characters.' }
  }

  // "Full access" wins over any individual boxes that are also ticked.
  const submitted = formData.getAll('scopes').map(String)
  const scopes = submitted.includes('*') ? normalizeGrants(['*']) : normalizeGrants(submitted)
  if (scopes.length === 0) return { ok: false, error: 'Choose at least one permission.' }

  const days = Number(formData.get('expiresInDays') ?? 0)
  const expiresAt = EXPIRY_DAYS.has(days) ? new Date(Date.now() + days * 86_400_000) : null

  try {
    const { key, record } = await createApiKey({
      name,
      scopes,
      expiresAt,
      createdBy: { id: me.id, email: me.email },
    })
    await logAudit('apikey.create', {
      targetType: 'api_key',
      targetId: record.id,
      summary: `${name} (${record.prefix}) — ${scopes.join(', ')}`,
    })
    revalidatePath('/studio/api-keys')
    return { ok: true, key, name }
  } catch (err) {
    if (isMissingTable(err)) return { ok: false, error: NOT_INSTALLED }
    console.error('API key create failed', err)
    return { ok: false, error: 'Could not create the key.' }
  }
}

export async function revokeApiKeyAction(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireActionAdmin()
  try {
    const record = await revokeApiKey(id)
    if (!record) return { ok: false, error: 'That key does not exist or is already revoked.' }
    await logAudit('apikey.revoke', {
      targetType: 'api_key',
      targetId: id,
      summary: `${record.name} (${record.prefix})`,
    })
    revalidatePath('/studio/api-keys')
    return { ok: true }
  } catch (err) {
    if (isMissingTable(err)) return { ok: false, error: NOT_INSTALLED }
    console.error('API key revoke failed', err)
    return { ok: false, error: 'Could not revoke the key.' }
  }
}
