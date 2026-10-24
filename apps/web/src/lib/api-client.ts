import { createApiClient } from '@xq/api-client'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1'

export const apiClient = createApiClient({ baseUrl: apiBaseUrl })

/** Socket.IO listens at the server origin; the REST API's /api/v1 prefix is HTTP-only. */
export function socketOrigin(): string {
  return new URL(apiBaseUrl).origin
}
