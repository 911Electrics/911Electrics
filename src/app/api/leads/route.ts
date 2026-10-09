/**
 * @deprecated Alias of /api/admin/v1/leads — the canonical admin API. Kept so existing
 * integrations (the blog writer, the seed scripts) keep working unchanged; same
 * handlers, same auth. Point new callers at /api/admin/v1.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export { GET } from '@/app/api/admin/v1/leads/route'
