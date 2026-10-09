import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Every Studio server action must authorize for itself.
 *
 * A `layout.tsx` guard protects the page, not the action: a server action is
 * its own POST endpoint that any signed-in user can call directly. For a long
 * time the content, leads, reviews and business-info actions only checked "is
 * someone signed in", so an editor granted only `reviews` could delete every
 * blog post or rewrite the phone number shown on every page.
 *
 * This is a source-level check rather than a behavioural one (the guards need
 * cookies and a database), and it exists to fail when a new action is added
 * without a guard. If it fails: call a guard first thing in the action, or — if
 * the action is genuinely public or self-scoped — add it to the list below with
 * a reason.
 */

const ACTIONS_DIR = join(process.cwd(), 'src', 'app', 'actions')

/** A call to any of these counts as authorizing. */
const GUARDS = [
  'requireActionPermission(',
  'requireActionAdmin(',
  'requireAdmin(', // local admin guards in studio-users, studio-redirects, google
  'requireReviews(', // google.ts
  'requireReplyAccess(', // studio-templates.ts — admin, leads or reviews
]

/** Actions that intentionally do not take a role/permission guard. */
const EXEMPT: Record<string, string> = {
  // Public — these are how you get a session in the first place.
  'studio-auth.ts:loginAction': 'public sign-in',
  'studio-auth.ts:verifyTotpAction': 'public second factor',
  'studio-auth.ts:logoutAction': 'acts on the caller’s own session',
  'studio-reset.ts:requestPasswordReset': 'public, no account enumeration',
  'studio-reset.ts:resetPassword': 'public, authorized by the emailed token',
  'submit-lead.ts:submitLead': 'the public quote form',
  // Self-scoped — any signed-in user, acting only on their own account.
  'sessions.ts:revokeMySession': 'own sessions only',
  'sessions.ts:revokeMyOtherSessions': 'own sessions only',
  'studio-2fa.ts:getTotpStatus': 'own account',
  'studio-2fa.ts:beginTotpSetup': 'own account',
  'studio-2fa.ts:confirmTotpSetup': 'own account',
  'studio-2fa.ts:disableTotp': 'own account, re-checks the password',
  'studio-2fa.ts:regenerateRecoveryCodes': 'own account, re-checks a TOTP code',
  'studio-users.ts:changeOwnPassword': 'own account, re-checks the password',
  // Guards inline with the same checks rather than through a helper.
  'studio-2fa.ts:adminResetUserTotp': "inline `role !== 'admin'` check",
  'studio-reset.ts:sendResetLinkToUser': "inline `role !== 'admin'` check",
  'studio-media.ts:uploadMedia': "inline `can(user, 'content')` check",
}

/** Exported async functions in a file, each with the source of its body. */
function exportedActions(source: string): { name: string; body: string }[] {
  const starts = [...source.matchAll(/^export async function (\w+)/gm)]
  return starts.map((m, i) => ({
    name: m[1],
    body: source.slice(m.index, starts[i + 1]?.index ?? source.length),
  }))
}

const files = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts'))

describe('Studio server actions authorize for themselves', () => {
  it('finds the action files', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const file of files) {
    const source = readFileSync(join(ACTIONS_DIR, file), 'utf8')
    for (const { name, body } of exportedActions(source)) {
      const key = `${file}:${name}`
      if (key in EXEMPT) continue
      it(`${key} calls a permission guard`, () => {
        expect(GUARDS.some((g) => body.includes(g))).toBe(true)
      })
    }
  }

  it('has no stale exemptions', () => {
    const present = new Set(
      files.flatMap((file) =>
        exportedActions(readFileSync(join(ACTIONS_DIR, file), 'utf8')).map((a) => `${file}:${a.name}`),
      ),
    )
    expect(Object.keys(EXEMPT).filter((k) => !present.has(k))).toEqual([])
  })

  it('inline-guarded exemptions really do check', () => {
    const src = (f: string) => readFileSync(join(ACTIONS_DIR, f), 'utf8')
    const bodyOf = (f: string, n: string) => exportedActions(src(f)).find((a) => a.name === n)!.body
    expect(bodyOf('studio-2fa.ts', 'adminResetUserTotp')).toMatch(/role !== 'admin'/)
    expect(bodyOf('studio-reset.ts', 'sendResetLinkToUser')).toMatch(/role !== 'admin'/)
    expect(bodyOf('studio-media.ts', 'uploadMedia')).toMatch(/can\(user, 'content'\)/)
  })
})
