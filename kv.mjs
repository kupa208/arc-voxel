/**
 * Optional shared storage for hosts without a persistent disk (for example Vercel).
 * Works with any Upstash Redis REST endpoint. Vercel's Upstash integration sets KV_REST_API_URL and KV_REST_API_TOKEN.
 * Without these variables the game keeps its data in local files instead.
 */
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''

export const kvEnabled = Boolean(URL_ && TOKEN)

/** Runs one Redis command, for example kv('HGET', 'key', 'field'). Returns the command result. */
export async function kv(...command) {
  if (!kvEnabled) throw new Error('kv not configured')
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(command),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok || out.error) throw new Error('kv request failed')
  return out.result
}
