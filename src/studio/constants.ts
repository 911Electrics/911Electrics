/**
 * Client-safe Studio constants and helpers. No server imports here so both
 * client components and server code can import from it freely.
 */

export const LEAD_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost', 'spam'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

/** Stages shown as columns on the pipeline board, left → right. Spam is excluded. */
export const PIPELINE_STAGES: LeadStatus[] = ['new', 'contacted', 'quoted', 'won', 'lost']

export const STUDIO_ROLES = ['admin', 'editor'] as const
export type StudioRole = (typeof STUDIO_ROLES)[number]

export const STUDIO_ROLE_LABEL: Record<StudioRole, string> = {
  admin: 'Admin — full access incl. team & settings',
  editor: 'Editor — assignable access below',
}

/**
 * Permissions that can be granted per-user to non-admin (editor) accounts.
 * Admins implicitly have all of these plus the admin-only areas (team,
 * business info, audit log).
 */
export const STUDIO_PERMISSIONS = ['leads', 'content', 'reviews'] as const
export type StudioPermission = (typeof STUDIO_PERMISSIONS)[number]

export const STUDIO_PERMISSION_LABEL: Record<StudioPermission, string> = {
  leads: 'Leads & pipeline',
  content: 'Content — blog, services & service areas',
  reviews: 'Reviews',
}

export const STUDIO_PERMISSION_HINT: Record<StudioPermission, string> = {
  leads: 'View and manage quote requests and the pipeline board.',
  content: 'Create and edit blog posts, services and service areas.',
  reviews: 'Add and manage customer reviews.',
}

/** Default permission set applied when an editor is created from the preset. */
export const EDITOR_DEFAULT_PERMISSIONS: StudioPermission[] = ['leads', 'content', 'reviews']

export function isStudioPermission(v: string): v is StudioPermission {
  return (STUDIO_PERMISSIONS as readonly string[]).includes(v)
}

export const TEMPLATE_KINDS = ['lead', 'review', 'general'] as const
export type TemplateKind = (typeof TEMPLATE_KINDS)[number]

export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  lead: 'Lead replies',
  review: 'Review replies',
  general: 'General',
}

export function isTemplateKind(v: string): v is TemplateKind {
  return (TEMPLATE_KINDS as readonly string[]).includes(v)
}

/** Replace {{name}} / {{business}} placeholders in a template body. */
export function fillTemplate(body: string, vars: { name?: string | null; business?: string | null }): string {
  return body
    .replace(/\{\{\s*name\s*\}\}/gi, vars.name || 'there')
    .replace(/\{\{\s*business\s*\}\}/gi, vars.business || '')
}

export const TESTIMONIAL_SOURCES = ['google', 'yelp', 'facebook', 'direct'] as const
export type TestimonialSource = (typeof TESTIMONIAL_SOURCES)[number]

export const TESTIMONIAL_SOURCE_LABEL: Record<TestimonialSource, string> = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook',
  direct: 'Direct',
}

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'pinterest', 'google', 'yelp'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X (Twitter)',
  pinterest: 'Pinterest',
  google: 'Google',
  yelp: 'Yelp',
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
  spam: 'Spam',
}

// Full static class strings so Tailwind keeps them (no dynamic class names).
export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-brand-100 text-brand-700',
  contacted: 'bg-amber-100 text-amber-800',
  quoted: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-slate-200 text-slate-600',
  spam: 'bg-slate-200 text-slate-600',
}

export function timeAgo(input?: string | null): string {
  if (!input) return ''
  const then = new Date(input).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, (Date.now() - then) / 1000)
  if (s < 60) return 'just now'
  const m = s / 60
  if (m < 60) return `${Math.floor(m)}m ago`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h ago`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)}d ago`
  return new Date(input).toLocaleDateString('en-US', { timeZone: 'UTC' })
}
