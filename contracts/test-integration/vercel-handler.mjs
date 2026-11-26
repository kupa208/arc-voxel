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
const badHero = await call('POST', 'run/start', { body: { session: la.body.session, hero: 10 } })
ok('hero 10 does not exist', badHero.status === 400, JSON.stringify(badHero))
const fin = (session, runToken, runId = r1.body.runId) => call('POST', 'run/finish', { body: { session, runId, runToken, score: 100, gems: 1, maxCombo: 1, wave: 1, elapsed: 1, telemetry: [] } })
const noTok = await fin(la.body.session, undefined)
ok('finishing without a run token is refused', noTok.status === 400 && /No active run/.test(noTok.body.error || ''), JSON.stringify(noTok))
const other = await fin(lb.body.session, r1.body.runToken)
ok("another wallet cannot use someone else's run token", other.status === 400 && /Wallet mismatch/.test(other.body.error || ''), JSON.stringify(other))
const early = await fin(la.body.session, r1.body.runToken)
ok('a valid token reaches the anti-cheat checks (run too short)', early.status === 400 && /too short/i.test(early.body.error || ''), JSON.stringify(early))
const swapped = await fin(la.body.session, r1.body.runToken, '0x' + 'ab'.repeat(32))
ok('a run token only works for its own run id', swapped.status === 400, JSON.stringify(swapped))

// ---- nickname lookup, mode boards and the "real attempt" rule for saved runs ----
const resolved = await call('GET', 'nickname/resolve', { query: 'name=KIEN%20trinh' })
ok('a nickname resolves to its wallet (case-insensitive)', resolved.status === 200 && resolved.body.address === alice.address.toLowerCase(), JSON.stringify(resolved))
const unknownNick = await call('GET', 'nickname/resolve', { query: 'name=nobody-here' })
ok('an unknown nickname is a 404', unknownNick.status === 404)
for (const mode of ['endless', 'bossrush']) {
  const mb = await call('GET', 'mode/board', { query: `mode=${mode}` })
  ok(`${mode} board starts empty`, mb.status === 200 && Array.isArray(mb.body.entries) && mb.body.entries.length === 0, JSON.stringify(mb))
}
const badMode = await call('GET', 'mode/board', { query: 'mode=nope' })
ok('an unknown mode is refused', badMode.status === 400)
const cfg2 = await call('GET', 'config')
ok('config tells the game the save rule', cfg2.body.saveRule && cfg2.body.saveRule.minSeconds === 60 && cfg2.body.saveRule.minPoints === 200, JSON.stringify(cfg2.body.saveRule))

const { createTokens } = await import('../../tokens.mjs')
const toks = createTokens(process.env.GAME_SIGNER_PRIVATE_KEY)
function forgedRun(player, ageS, runId) {
  return toks.sign('r', { runId, player: player.toLowerCase(), startedAt: Date.now() - ageS * 1000, roomId: 0, hero: 0 }, 3_600_000)
}
const telemetry40 = Array.from({ length: 8 }, (_, i) => ({ t: (i + 1) * 5, s: (i + 1) * 100, k: 0, g: 0, w: 1 + Math.floor(((i + 1) * 5) / 20) }))
const rid = '0x' + 'cd'.repeat(32)
const shortRun = await call('POST', 'run/finish', { body: { session: la.body.session, runId: rid, runToken: forgedRun(alice.address, 40, rid), score: 2000, gems: 3, maxCombo: 1, wave: 3, elapsed: 40, telemetry: telemetry40 } })
console.log('   (short run answer)', shortRun.status, shortRun.body.error)
ok('a 40-second run under 200 points is not saved onchain', shortRun.status === 400 && /survive 60 seconds or reach 200 points/.test(shortRun.body.error || ''), JSON.stringify(shortRun))
const rid2 = '0x' + 'ef'.repeat(32)
const modeBad = await call('POST', 'mode/finish', { body: { session: la.body.session, mode: 'bossrush', runId: rid2, runToken: forgedRun(alice.address, 40, rid2), bosses: 3, timeMs: 5000, score: 2000, gems: 3, maxCombo: 1, wave: 3, elapsed: 40, telemetry: telemetry40 } })
console.log('   (mode answer)', modeBad.status, modeBad.body.error)
ok('a boss rush time faster than the bosses allow is refused', modeBad.status >= 400, JSON.stringify(modeBad))

const big = await fn.fetch(new Request('https://game.example/api/index?__route=client-error', { method: 'POST', headers: { 'content-length': '999999', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'x' }) }))
ok('oversized requests are refused', big.status === 413)
const nf = await call('GET', 'nothing-here')
ok('unknown routes return 404', nf.status === 404)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
