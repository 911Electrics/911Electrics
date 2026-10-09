'use server'

import { revalidatePath } from 'next/cache'

import { query } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { can, getStudioUser } from '@/studio/auth'
import { isTemplateKind } from '@/studio/constants'

export type TemplateResult = { ok: true } | { ok: false; error: string }

/** Templates are shared reply assets — manageable by anyone who replies. */
async function requireReplyAccess() {
  const me = await getStudioUser()
  if (!me) throw new Error('Not authenticated')
  if (!(me.role === 'admin' || can(me, 'leads') || can(me, 'reviews'))) {
    throw new Error('Not allowed')
  }
  return me
}

function parse(formData: FormData): { title: string; body: string; kind: string } | null {
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const kindRaw = String(formData.get('kind') ?? 'general')
  const kind = isTemplateKind(kindRaw) ? kindRaw : 'general'
  if (!title || !body) return null
  return { title, body, kind }
}

export async function createTemplate(formData: FormData): Promise<TemplateResult> {
  const me = await requireReplyAccess()
  const data = parse(formData)
  if (!data) return { ok: false, error: 'Title and body are required.' }
  await query(
    `INSERT INTO reply_templates (title, body, kind, created_by) VALUES ($1, $2, $3, $4)`,
    [data.title, data.body, data.kind, me.id],
  )
  await logAudit('template.create', { summary: `Created reply template "${data.title}"` })
  revalidatePath('/studio/templates')
  return { ok: true }
}

export async function updateTemplate(id: number, formData: FormData): Promise<TemplateResult> {
  await requireReplyAccess()
  const data = parse(formData)
  if (!data) return { ok: false, error: 'Title and body are required.' }
  await query(
    `UPDATE reply_templates SET title = $2, body = $3, kind = $4, updated_at = now() WHERE id = $1`,
    [id, data.title, data.body, data.kind],
  )
  await logAudit('template.update', { targetId: id, summary: `Updated reply template "${data.title}"` })
  revalidatePath('/studio/templates')
  return { ok: true }
}

export async function deleteTemplate(id: number): Promise<void> {
  await requireReplyAccess()
  await query(`DELETE FROM reply_templates WHERE id = $1`, [id])
  await logAudit('template.delete', { targetId: id, summary: 'Deleted a reply template' })
  revalidatePath('/studio/templates')
}
