import 'server-only'

import { query } from '@/db/client'

export type UrlRedirect = {
  id: number
  source: string
  destination: string
  permanent: boolean
}

export async function getRedirects(): Promise<UrlRedirect[]> {
  return query<UrlRedirect>(
    `SELECT id, source, destination, permanent FROM url_redirects ORDER BY source`,
  )
}
