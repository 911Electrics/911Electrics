'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { logoutAction } from '@/app/actions/studio-auth'
import type { StudioPermission } from '@/studio/constants'
import { cn } from '@/utilities/ui'

type NavItem = {
  href: string
  label: string
  icon: string
  exact?: boolean
  adminOnly?: boolean
  perm?: StudioPermission
  anyPerm?: StudioPermission[]
}

// Inline SVG path data — no icon dependency, no client weight.
const ICONS: Record<string, string> = {
  home: 'M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9',
  inbox: 'M3 13h4l1.5 3h7L17 13h4M5 6h14l1 7v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5l1-7Z',
  pencil: 'M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4',
  bolt: 'M13 3 5 13h5l-1 8 8-10h-5l1-8Z',
  pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  star: 'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4Z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-5l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h5l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a4 4 0 0 1 0 7.8',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  shield: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3ZM9.5 12l1.8 1.8 3.2-3.6',
  board: 'M4 5h16v14H4zM9 5v14M15 5v14',
  chart: 'M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6',
  plug: 'M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v6',
  arrow: 'M4 12h14M13 6l6 6-6 6',
  key: 'M15 7a4 4 0 1 1-3.9 4.9L4 19v-3h3v-3h2.6l1.5-1.5A4 4 0 0 1 15 7ZM16 10h.01',
}

const NAV: NavItem[] = [
  { href: '/studio', label: 'Dashboard', icon: 'home', exact: true },
  { href: '/studio/leads', label: 'Quote Requests', icon: 'inbox', perm: 'leads' },
  { href: '/studio/pipeline', label: 'Pipeline', icon: 'board', perm: 'leads' },
  { href: '/studio/posts', label: 'Blog Posts', icon: 'pencil', perm: 'content' },
  { href: '/studio/services', label: 'Services', icon: 'bolt', perm: 'content' },
  { href: '/studio/cities', label: 'Service Areas', icon: 'pin', perm: 'content' },
  { href: '/studio/testimonials', label: 'Reviews', icon: 'star', perm: 'reviews' },
  { href: '/studio/templates', label: 'Templates', icon: 'doc', anyPerm: ['leads', 'reviews'] },
  { href: '/studio/analytics', label: 'Analytics', icon: 'chart', adminOnly: true },
  { href: '/studio/settings', label: 'Business Info', icon: 'gear', adminOnly: true },
  { href: '/studio/redirects', label: 'Redirects', icon: 'arrow', adminOnly: true },
  { href: '/studio/team', label: 'Team', icon: 'users', adminOnly: true },
  { href: '/studio/api-keys', label: 'API keys', icon: 'key', adminOnly: true },
  { href: '/studio/audit', label: 'Audit log', icon: 'shield', adminOnly: true },
  { href: '/studio/setup', label: 'Setup', icon: 'plug', adminOnly: true },
  { href: '/studio/account', label: 'Account', icon: 'user' },
]

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="18">
      <path d={d} />
    </svg>
  )
}

export function StudioSidebar({
  userName,
  isAdmin,
  permissions,
}: {
  userName: string
  isAdmin: boolean
  permissions: StudioPermission[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const nav = NAV.filter((item) => {
    if (item.adminOnly) return isAdmin
    if (item.perm) return isAdmin || permissions.includes(item.perm)
    if (item.anyPerm) return isAdmin || item.anyPerm.some((p) => permissions.includes(p))
    return true
  })

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="911 Construction & Electric Inc." className="h-7 w-auto" src="/logo.png" />
        <button
          aria-label="Toggle menu"
          className="rounded-md p-2 hover:bg-slate-100"
          onClick={() => setOpen((v) => !v)}
        >
          <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-slate-200 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="911 Construction & Electric Inc." className="h-9 w-auto" src="/logo.png" />
          <div className="mt-1.5 text-xs text-slate-500">Owner dashboard</div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active = isActive(item)
            return (
              <Link
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon d={ICONS[item.icon]} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <a
            className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            href="/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon d="M14 5h5v5M19 5l-7 7M11 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
            View live site
          </a>
          <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2">
            <span className="min-w-0 truncate text-sm text-slate-500" title={userName}>
              {userName}
            </span>
            <form action={logoutAction}>
              <button className="text-sm font-medium text-brand-600 hover:text-brand-700" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
