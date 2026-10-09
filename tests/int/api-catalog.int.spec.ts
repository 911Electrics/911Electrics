import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { API_BASE, API_CATALOG } from '@/lib/api-catalog'

/**
 * `GET /api/admin/v1` tells agents what the API can do, from API_CATALOG. This
 * checks the catalog against the route files on disk in both directions, so a
 * new endpoint cannot ship undocumented and the catalog cannot advertise an
 * operation — or a scope — the handler does not actually have.
 */

const APP = join(process.cwd(), 'src', 'app')
const toSegments = (apiPath: string) => apiPath.replace(/\{(\w+)\}/g, '[$1]')
const fileFor = (apiPath: string) =>
  join(APP, ...toSegments(apiPath).split('/').filter(Boolean), 'route.ts')

/** method -> scope asked for, read from a route file's source. */
function handlerScopes(source: string): Record<string, string | null> {
  const starts = [...source.matchAll(/^export async function (GET|POST|PATCH|PUT|DELETE)\b/gm)]
  return Object.fromEntries(
    starts.map((m, i) => {
      const body = source.slice(m.index, starts[i + 1]?.index ?? source.length)
      return [m[1], /authorize\(req, '([a-z*]+:[a-z*]+)'\)/.exec(body)?.[1] ?? null]
    }),
  )
}

function routeFilesUnder(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) routeFilesUnder(p, out)
    else if (name === 'route.ts') out.push(p)
  }
  return out
}

const NAMESPACE = join(APP, 'api', 'admin', 'v1')

describe('admin API catalog matches the routes on disk', () => {
  for (const endpoint of API_CATALOG) {
    const file = fileFor(`${API_BASE}${endpoint.path}`)

    it(`${endpoint.path} — every listed operation exists and asks for the listed scope`, () => {
      expect(existsSync(file)).toBe(true)
      const actual = handlerScopes(readFileSync(file, 'utf8'))
      const listed = Object.fromEntries(endpoint.operations.map((o) => [o.method, o.scope]))
      expect(actual).toEqual(listed)
    })

    const legacy = endpoint.legacy
    if (legacy) {
      it(`${legacy} — is a thin alias exposing the same methods`, () => {
        const alias = fileFor(legacy)
        expect(existsSync(alias)).toBe(true)
        const src = readFileSync(alias, 'utf8')
        const reexport = /export \{ ([A-Z, ]+) \} from '([^']+)'/.exec(src)
        expect(reexport?.[2]).toBe(`@/app${toSegments(`${API_BASE}${endpoint.path}`)}/route`)
        expect(reexport?.[1].split(', ').sort()).toEqual(
          endpoint.operations.map((o) => o.method).sort(),
        )
        // An alias carries no logic of its own.
        expect(src).not.toMatch(/export async function/)
      })
    }
  }

  it('has no undocumented route under /api/admin/v1', () => {
    const documented = new Set([
      fileFor(API_BASE),
      ...API_CATALOG.map((e) => fileFor(`${API_BASE}${e.path}`)),
    ])
    expect(routeFilesUnder(NAMESPACE).filter((f) => !documented.has(f))).toEqual([])
  })

  it('every handler in the namespace authorizes', () => {
    for (const file of routeFilesUnder(NAMESPACE)) {
      const src = readFileSync(file, 'utf8')
      const handlers = (src.match(/^export async function /gm) ?? []).length
      const guards = (src.match(/await (authorize|authenticate)\(req/g) ?? []).length
      expect({ file, guards }).toEqual({ file, guards: handlers })
    }
  })
})
