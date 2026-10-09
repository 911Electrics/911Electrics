import 'server-only'

import { query } from '@/db/client'

import { isTemplateKind, type TemplateKind } from './constants'

export type ReplyTemplate = {
  id: number
  title: string
  body: string
  kind: TemplateKind
}

const map = (r: { id: number; title: string; body: string; kind: string }): ReplyTemplate => ({
  id: r.id,
  title: r.title,
  body: r.body,
  kind: isTemplateKind(r.kind) ? r.kind : 'general',
})

/** All templates, or those usable in a context (kind + general). */
export async function getTemplates(context?: 'lead' | 'review'): Promise<ReplyTemplate[]> {
  const rows = context
    ? await query<{ id: number; title: string; body: string; kind: string }>(
        `SELECT id, title, body, kind FROM reply_templates
         WHERE kind = $1 OR kind = 'general' ORDER BY title`,
        [context],
      )
    : await query<{ id: number; title: string; body: string; kind: string }>(
        `SELECT id, title, body, kind FROM reply_templates ORDER BY kind, title`,
      )
  return rows.map(map)
}
