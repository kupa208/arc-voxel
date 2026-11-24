/**
 * Signed, expiring tokens for hosts where the server keeps no memory between requests (Vercel).
 * A token is base64url(JSON payload) + "." + base64url(HMAC-SHA256). The secret is derived from the
 * game signer key (or TOKEN_SECRET), so no extra setting is needed and a token can never be forged
 * without that key. Tokens carry only non-secret game data (wallet address, run start time).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const b64 = (buf) => Buffer.from(buf).toString('base64url')

export function createTokens(secretSource) {
  const secret = createHmac('sha256', 'arc-voxel-quest/tokens/v1').update(String(secretSource)).digest()
  const mac = (body) => createHmac('sha256', secret).update(body).digest()

  /** @param {string} kind e.g. "s" (session) or "r" (run) @param {object} data @param {number} ttlMs */
  function sign(kind, data, ttlMs) {
    const body = b64(JSON.stringify({ k: kind, d: data, e: Date.now() + ttlMs }))
    return `${kind}1.${body}.${b64(mac(body))}`
  }

  /** Returns the payload data, or null when the token is malformed, forged, of another kind or expired. */
  function verify(kind, token) {
    const parts = String(token || '').split('.')
    if (parts.length !== 3 || parts[0] !== `${kind}1` || parts[1].length > 4000) return null
    const want = mac(parts[1])
    let got
    try { got = Buffer.from(parts[2], 'base64url') } catch { return null }
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null
    try {
      const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
      if (p.k !== kind || typeof p.e !== 'number' || p.e < Date.now()) return null
      return p.d
    } catch { return null }
  }

  /** A short code derived from an input and a time bucket (for stateless sign-in challenges). */
  function code(input) {
    return mac(String(input)).subarray(0, 16).toString('hex')
  }

  return { sign, verify, code }
}
