/**
 * Checks the Vercel entry point (api/index.mjs) with the stateless server, under plain Node (the Vercel runtime).
 * Needs no chain and no keys: run `node contracts/test-integration/vercel-handler.mjs`.
 */
import { rmSync } from 'node:fs'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

process.env.VERCEL = '1'
process.env.GAME_SIGNER_PRIVATE_KEY = generatePrivateKey()
process.env.GAME_NICKNAME_FILE = '/tmp/vercel-test-nicks.json'
rmSync(process.env.GAME_NICKNAME_FILE, { force: true }) // start from an empty nickname store
delete process.env.KV_REST_API_URL
delete process.env.UPSTASH_REDIS_REST_URL

const { default: fn } = await import('../../api/index.mjs')
let passed = 0
let failed = 0
const ok = (name, cond, detail = '') => {
  if (cond) { passed++; console.log('PASS', name, cond === true ? '' : cond) } else { failed++; console.log('FAIL', name, detail) }
}

/** Calls the function the way Vercel does after the rewrite: /api/index?__route=<route>&<query> */
async function call(method, route, { query = '', body, ip = '203.0.113.7' } = {}) {
  const url = `https://game.example/api/index?__route=${route}${query ? '&' + query : ''}`
  const res = await fn.fetch(new Request(url, { method, headers: { 'content-type': 'application/json', 'x-real-ip': ip }, body: body ? JSON.stringify(body) : undefined }))
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

const alice = privateKeyToAccount(generatePrivateKey())
const bob = privateKeyToAccount(generatePrivateKey())

async function login(acct) {
  const n = await call('GET', 'auth/nonce', { query: `player=${acct.address}` })
  const signature = await acct.signMessage({ message: n.body.message })
  return call('POST', 'auth/wallet', { body: { player: acct.address, signature } })
}

const cfg = await call('GET', 'config')
ok('config route works through the rewrite', cfg.status === 200 && cfg.body.blockchain === 'ARC-TESTNET', JSON.stringify(cfg.body))

const la = await login(alice)
ok('wallet sign-in returns a signed session', la.status === 200 && String(la.body.session).startsWith('s1.'), JSON.stringify(la.body))
const lb = await login(bob)
ok('a second wallet can sign in', lb.status === 200)

const wrong = await call('POST', 'auth/wallet', { body: { player: alice.address, signature: await bob.signMessage({ message: 'x' }) } })
ok('a signature from another wallet is rejected', wrong.status === 401, JSON.stringify(wrong))

const st = await call('POST', 'wallet/status', { body: { session: la.body.session } })
ok('the session is accepted without any server memory', st.status === 200 && st.body.address === alice.address.toLowerCase(), JSON.stringify(st))
const forged = await call('POST', 'wallet/status', { body: { session: la.body.session.slice(0, -3) + 'AAA' } })
ok('a tampered session is rejected', forged.status === 401)
const junk = await call('POST', 'wallet/status', { body: { session: 'nope' } })
ok('a garbage session is rejected', junk.status === 401)

// nicknames
const n1 = await call('POST', 'profile/nickname', { body: { session: la.body.session, nickname: ' Kien  Trinh ' } })
ok('nickname saved', n1.status === 200 && n1.body.nickname === 'Kien Trinh', JSON.stringify(n1))
const g1 = await call('GET', 'nickname', { query: `address=${alice.address}` })
ok('nickname can be read back', g1.body.nickname === 'Kien Trinh')
const n2 = await call('POST', 'profile/nickname', { body: { session: lb.body.session, nickname: 'kien trinh' } })
ok('a taken nickname is refused', n2.status === 400 && /taken/i.test(n2.body.error || ''), JSON.stringify(n2))
const n3 = await call('POST', 'profile/nickname', { body: { session: lb.body.session, nickname: '<b>x</b>' } })
ok('an unsafe nickname is refused', n3.status === 400, JSON.stringify(n3))
const n4 = await call('POST', 'profile/nickname', { body: { session: 'bad', nickname: 'Abcdef' } })
ok('setting a nickname needs a valid session', n4.status === 401)

// runs
const r1 = await call('POST', 'run/start', { body: { session: la.body.session, hero: 7 } })
ok('a run starts and returns a signed run token', r1.status === 200 && /^0x[0-9a-f]{64}$/.test(r1.body.runId) && String(r1.body.runToken).startsWith('r1.'), JSON.stringify(r1))
const badHero = await call('POST', 'run/start', { body: { session: la.body.session, hero: 8 } })
ok('hero 8 does not exist', badHero.status === 400, JSON.stringify(badHero))
const fin = (session, runToken, runId = r1.body.runId) => call('POST', 'run/finish', { body: { session, runId, runToken, score: 100, gems: 1, maxCombo: 1, wave: 1, elapsed: 1, telemetry: [] } })
const noTok = await fin(la.body.session, undefined)
ok('finishing without a run token is refused', noTok.status === 400 && /No active run/.test(noTok.body.error || ''), JSON.stringify(noTok))
const other = await fin(lb.body.session, r1.body.runToken)
ok("another wallet cannot use someone else's run token", other.status === 400 && /Wallet mismatch/.test(other.body.error || ''), JSON.stringify(other))
const early = await fin(la.body.session, r1.body.runToken)
ok('a valid token reaches the anti-cheat checks (run too short)', early.status === 400 && /too short/i.test(early.body.error || ''), JSON.stringify(early))
const swapped = await fin(la.body.session, r1.body.runToken, '0x' + 'ab'.repeat(32))
ok('a run token only works for its own run id', swapped.status === 400, JSON.stringify(swapped))

const big = await fn.fetch(new Request('https://game.example/api/index?__route=client-error', { method: 'POST', headers: { 'content-length': '999999', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'x' }) }))
ok('oversized requests are refused', big.status === 413)
const nf = await call('GET', 'nothing-here')
ok('unknown routes return 404', nf.status === 404)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
