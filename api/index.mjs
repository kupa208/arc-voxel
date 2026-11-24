/**
 * Vercel entry point: one function serves every /api route (see vercel.json).
 * The game page and the vendor bundles are static files in public/.
 */
import { handle } from '../server.mjs'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    // vercel.json rewrites /api/<route> to /api/index?__route=<route>. Restore the original path for the router.
    const route = url.searchParams.get('__route')
    if (route !== null && (url.pathname === '/api/index' || url.pathname === '/api')) {
      url.pathname = '/api/' + route.replace(/^\/+/u, '')
      url.searchParams.delete('__route')
    }
    const method = request.method
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text()
    const forwarded = String(request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    const ip = request.headers.get('x-real-ip') || forwarded || 'unknown'
    const routed = new Request(url, { method, headers: request.headers, body })
    return handle(routed, { requestIP: () => ({ address: ip }) })
  },
}
