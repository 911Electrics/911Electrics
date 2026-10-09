/**
 * Token interpolation for templated city pages.
 *
 * The cityPageTemplate global holds shared copy with {{city}} (and
 * {{region}}) tokens. At render time we substitute the tokens for the
 * current city — in plain strings and recursively inside Lexical rich
 * text state.
 */

export type CityTokens = {
  city: string
  region?: string
}

const TOKEN_RE = /\{\{\s*(city|region)\s*\}\}/g

export function interpolateString(value: string, tokens: CityTokens): string {
  return value.replace(TOKEN_RE, (_, key: 'city' | 'region') => tokens[key] ?? '')
}

/**
 * Walks any JSON-ish value (Lexical editor state, arrays of section copy,
 * etc.) and interpolates every string. Returns a new value; the input is
 * not mutated. Keys named `id`, `url` or `relationTo` are left untouched.
 */
export function interpolateDeep<T>(value: T, tokens: CityTokens): T {
  if (typeof value === 'string') {
    return interpolateString(value, tokens) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateDeep(item, tokens)) as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = key === 'id' || key === 'url' || key === 'relationTo' ? v : interpolateDeep(v, tokens)
    }
    return out as T
  }
  return value
}
