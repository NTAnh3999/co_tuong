import { createApiClient } from '@xq/api-client'

// Without an explicit override, call the API on whatever host served this page (not a baked-in
// hostname) so the session cookie's SameSite=Lax check always sees a same-site request — the
// browser treats different hosts (e.g. localhost vs. a LAN IP) as cross-site even when both
// point at the same machine, and a cross-site fetch silently drops the cookie.
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL !== undefined) return process.env.NEXT_PUBLIC_API_BASE_URL
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3001/api/v1`
  return 'http://localhost:3001/api/v1'
}

const apiBaseUrl = resolveApiBaseUrl()

export const apiClient = createApiClient({ baseUrl: apiBaseUrl })

/** Socket.IO listens at the server origin; the REST API's /api/v1 prefix is HTTP-only. */
export function socketOrigin(): string {
  return new URL(apiBaseUrl).origin
}
