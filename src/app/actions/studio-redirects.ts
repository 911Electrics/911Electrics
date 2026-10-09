'use server'

import { revalidatePath } from 'next/cache'

import { query } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { getStudioUser } from '@/studio/auth'

export type RedirectResult = { ok: true } | { ok: false; error: string }

async function requireAdmin() {
  const me = await getStudioUser()
  if (!me || me.role !== 'admin') throw new Error('Admins only')
  return me
}

/** Normalize a path: ensure a leading slash; allow absolute URLs for destination. */
function normalize(value: string, allowAbsolute = false): string {
  const v = value.trim()
  if (allowAbsolute && /^https?:\/\//i.test(v)) return v
  if (!v) return ''
  return v.startsWith('/') ? v : `/${v}`
}

function parse(formData: FormData): { source: string; destination: string; permanent: boolean } | null {
  const source = normalize(String(formData.get('source') ?? ''))
  const destination = normalize(String(formData.get('destination') ?? ''), true)
  const permanent = formData.get('permanent') !== 'off'
  if (!source || !destination || source === destination) return null
  return { source, destination, permanent }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbError(err: any): string {
  if (err?.code === '23505') return 'A redirect from that path already exists.'
  return err instanceof Error ? err.message : 'Could not save the redirect.'
}

export async function createRedirect(formData: FormData): Promise<RedirectResult> {
  await requireAdmin()
  const data = parse(formData)
  if (!data) return { ok: false, error: 'Enter a valid “from” and “to” path (and they must differ).' }
  try {
    await query(
      `INSERT INTO url_redirects (source, destination, permanent) VALUES ($1, $2, $3)`,
      [data.source, data.destination, data.permanent],
    )
  } catch (err) {
    return { ok: false, error: dbError(err) }
  }
  await logAudit('redirect.create', { summary: `${data.source} → ${data.destination}` })
  revalidatePath('/studio/redirects')
  return { ok: true }
}

export async function updateRedirect(id: number, formData: FormData): Promise<RedirectResult> {
  await requireAdmin()
  const data = parse(formData)
  if (!data) return { ok: false, error: 'Enter a valid “from” and “to” path (and they must differ).' }
  try {
    await query(
      `UPDATE url_redirects SET source = $2, destination = $3, permanent = $4, updated_at = now() WHERE id = $1`,
      [id, data.source, data.destination, data.permanent],
    )
  } catch (err) {
    return { ok: false, error: dbError(err) }
  }
  await logAudit('redirect.update', { targetId: id, summary: `${data.source} → ${data.destination}` })
  revalidatePath('/studio/redirects')
  return { ok: true }
}

export async function deleteRedirect(id: number): Promise<void> {
  await requireAdmin()
  await query(`DELETE FROM url_redirects WHERE id = $1`, [id])
  await logAudit('redirect.delete', { targetId: id, summary: 'Deleted a redirect' })
  revalidatePath('/studio/redirects')
}

/** Bulk add (one "from,to" per line). Used to load a migration map quickly. */
export async function bulkAddRedirects(text: string): Promise<{ added: number; skipped: number }> {
  await requireAdmin()
  let added = 0
  let skipped = 0
  for (const line of text.split('\n')) {
    const [from, to] = line.split(/[,\t]/).map((s) => s?.trim())
    const source = normalize(from ?? '')
    const destination = normalize(to ?? '', true)
    if (!source || !destination || source === destination) {
      skipped++
      continue
    }
    try {
      await query(
        `INSERT INTO url_redirects (source, destination, permanent) VALUES ($1, $2, true)
         ON CONFLICT (source) DO UPDATE SET destination = EXCLUDED.destination, updated_at = now()`,
        [source, destination],
      )
      added++
    } catch {
      skipped++
    }
  }
  if (added > 0) await logAudit('redirect.bulk', { summary: `Imported ${added} redirects` })
  revalidatePath('/studio/redirects')
  return { added, skipped }
}
