/**
 * Sign in with email: Circle user-controlled wallets (email one-time code + PIN).
 *
 * The player types an email, Circle emails a one-time code and shows it in its own hosted window, the player sets a PIN
 * once and gets a smart-contract wallet on Arc Testnet (gas sponsored by Circle's Gas Station). Every transaction is
 * approved with that PIN in Circle's hosted window. The Circle API key stays on the server.
 *
 * Routes (wired in server.mjs):
 *   POST /api/email/request-otp {email, deviceId}        -> {deviceToken, deviceEncryptionKey, otpToken}
 *   POST /api/email/initialize  {userToken}              -> {wallet} or {challengeId} (PIN + wallet setup)
 *   POST /api/email/session     {userToken}              -> {session, address, walletId}
 *   POST /api/email/challenge   {session, userToken, to, data} -> {challengeId}
 *   POST /api/email/last-tx     {session, userToken}     -> {id, state, txHash} of the newest transaction
 */
import { createHash } from 'node:crypto'
import { isAddress, toFunctionSelector } from 'viem'

const BLOCKCHAIN = 'ARC-TESTNET'
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?\.[A-Za-z]{2,24}$/
const OTP_PER_EMAIL = { max: 3, windowMs: 10 * 60 * 1000 }
const OTP_PER_IP = { max: 10, windowMs: 60 * 60 * 1000 }
const INIT_PER_IP = { max: 40, windowMs: 60 * 60 * 1000 }
const WALLET_CACHE_MS = 60 * 1000

/** Game calls a player may approve with their PIN. Anything else is refused before Circle is asked. */
const GAME_SIGNATURES = [
  'enterSeason()',
  'upgradeHero()',
  'claimPrize(uint256,uint256)',
  'buySkin(uint8)',
  'equipSkin(uint8)',
  'rolloverEmptySeason(uint256)',
  'submitRun((address,uint256,uint256,uint256,uint256,uint8,uint256,bytes32,uint256),bytes)',
]
const APPROVE_SELECTOR = toFunctionSelector('approve(address,uint256)')

/** Circle error codes -> a short message the player can act on. */
const CIRCLE_MESSAGES = {
  155104: 'Your sign-in expired. Sign in with email again.',
  155105: 'Your sign-in expired. Sign in with email again.',
  155130: 'That code expired. Request a new one.',
  155131: 'That code is not valid any more. Request a new one.',
  155133: 'That code is not correct. Try again.',
  155134: 'That code is not correct. Try again.',
  155135: 'That email address is not valid.',
  155138: 'Circle could not send the email. Try again in a moment.',
  155141: 'Too many wrong codes. Request a new one.',
  155142: 'Too many codes were sent to this email. Wait a while and try again.',
  155146: 'Too many wrong codes. Request a new one.',
}

/** Circle SDK errors are { message, code, status } (axios-style { response.data } is also understood). */
const errCode = (err) => Number((err && err.response && err.response.data && err.response.data.code) || (err && err.code)) || 0
const errStatus = (err) => Number((err && err.response && err.response.status) || (err && err.status)) || 0
const errText = (err) => String((err && err.response && err.response.data && err.response.data.message) || (err && err.message) || '')

export class EmailError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Never log or store an email address in clear text. */
export const hashEmail = (email) => createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 12)

export function normalizeEmail(raw) {
  const email = String(raw || '').trim().toLowerCase()
  if (email.length > 254 || !EMAIL_RE.test(email)) throw new EmailError(400, 'Enter a valid email address.', 155135)
  return email
}

/** Sliding-window limiter. `hit` throws when the key used up its budget. */
export function createLimiter() {
  const buckets = new Map()
  return {
    hit(key, { max, windowMs }, message) {
      const now = Date.now()
      const list = (buckets.get(key) || []).filter((t) => now - t < windowMs)
      if (list.length >= max) {
        buckets.set(key, list)
        const retry = Math.ceil((windowMs - (now - list[0])) / 1000)
        throw new EmailError(429, message + ` Try again in ${Math.max(1, Math.ceil(retry / 60))} min.`, 429)
      }
      list.push(now)
      buckets.set(key, list)
      if (buckets.size > 20_000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k)
    },
  }
}

/** Turns whatever Circle (axios) threw into an EmailError. The API key and tokens are never copied into the message. */
export function circleError(err) {
  if (err instanceof EmailError) return err
  const code = errCode(err)
  const status = errStatus(err)
  if (code === 155150) return new EmailError(503, 'Email sign-in is not finished on this server (the email provider is not set up in Circle Console).', 155150)
  if (CIRCLE_MESSAGES[code]) return new EmailError(code === 155104 || code === 155105 ? 401 : 400, CIRCLE_MESSAGES[code], code)
  const raw = errText(err)
  if (/smtp|email.*(not|un)configured|authentication method/iu.test(raw)) {
    return new EmailError(503, 'Email sign-in is not finished on this server (the email provider is not set up in Circle Console).', code || 503)
  }
  if (status === 401 || status === 403) return new EmailError(503, 'Email sign-in is not configured on this server (Circle API key was refused).', status)
  if (status === 429) return new EmailError(429, 'Circle is busy. Try again in a moment.', 429)
  return new EmailError(502, 'Circle could not complete that step. Try again.', code || 502)
}

/**
 * @param {object} deps
 * @param {() => Promise<object>} deps.getClient  user-controlled wallets client (injectable for tests)
 * @param {() => Promise<string>} deps.getContract game contract address
 * @param {string} deps.usdc USDC ERC-20 address
 * @param {(data: object) => string} deps.newSession creates a normal game session for an address
 * @param {(body: object) => {address: string}} deps.sessionOf validates a game session
 * @param {(msg: string) => void} [deps.log]
 */
export function createEmailWallet(deps) {
  const limiter = createLimiter()
  const allowed = new Set(GAME_SIGNATURES.map((s) => toFunctionSelector(s)))
  const walletCache = new Map() // userToken -> { address, walletId, at }
  const log = deps.log || (() => {})

  async function arcWallet(userToken) {
    const hit = walletCache.get(userToken)
    if (hit && Date.now() - hit.at < WALLET_CACHE_MS) return hit
    const client = await deps.getClient()
    const res = await client.listWallets({ userToken, blockchain: BLOCKCHAIN })
    const wallets = (res && res.data && res.data.wallets) || []
    const w = wallets.find((x) => x.blockchain === BLOCKCHAIN && isAddress(String(x.address || '')) && (!x.state || x.state === 'LIVE')) || null
    if (!w) return null
    const out = { address: String(w.address).toLowerCase(), walletId: w.id, at: Date.now() }
    walletCache.set(userToken, out)
    if (walletCache.size > 2_000) walletCache.delete(walletCache.keys().next().value)
    return out
  }

  function tokenOf(body) {
    const t = String(body && body.userToken || '')
    if (t.length < 20 || t.length > 8_000) throw new EmailError(400, 'Sign in with email first.', 155104)
    return t
  }

  async function requestOtp(body, ip) {
    const email = normalizeEmail(body.email)
    const deviceId = String(body.deviceId || '')
    if (deviceId.length < 8 || deviceId.length > 200) throw new EmailError(400, 'Reload the page and try again.', 155137)
    limiter.hit('ip:' + ip, OTP_PER_IP, 'Too many email requests from this network.')
    limiter.hit('mail:' + hashEmail(email), OTP_PER_EMAIL, 'A code was already sent to this email.')
    try {
      const client = await deps.getClient()
      const res = await client.createDeviceTokenForEmailLogin({ deviceId, email })
      const d = res.data
      log(`otp requested for ${hashEmail(email)}`)
      return { deviceToken: d.deviceToken, deviceEncryptionKey: d.deviceEncryptionKey, otpToken: d.otpToken }
    } catch (err) {
      const e = circleError(err)
      log(`otp failed for ${hashEmail(email)}: ${e.code}`)
      throw e
    }
  }

  /** Existing wallet -> returns it. New player -> returns the challenge that sets the PIN and creates the wallet. */
  async function initialize(body, ip) {
    const userToken = tokenOf(body)
    limiter.hit('init:' + ip, INIT_PER_IP, 'Too many sign-in attempts from this network.')
    try {
      const existing = await arcWallet(userToken).catch(() => null)
      if (existing) return { wallet: { address: existing.address, id: existing.walletId } }
      const client = await deps.getClient()
      try {
        const res = await client.createUserPinWithWallets({ userToken, blockchains: [BLOCKCHAIN], accountType: 'SCA' })
        return { challengeId: res.data.challengeId }
      } catch (err) {
        const code = errCode(err)
        if (code === 155106) { // already initialized: the wallet exists or is still being created
          const w = await arcWallet(userToken).catch(() => null)
          if (w) return { wallet: { address: w.address, id: w.walletId } }
          return { pending: true }
        }
        throw err
      }
    } catch (err) {
      throw circleError(err)
    }
  }

  /** Proves the player owns the wallet (their userToken lists it) and opens a normal game session for its address. */
  async function session(body, ip) {
    const userToken = tokenOf(body)
    limiter.hit('init:' + ip, INIT_PER_IP, 'Too many sign-in attempts from this network.')
    let w
    try {
      w = await arcWallet(userToken)
    } catch (err) {
      const code = errCode(err)
      if (code !== 155102 && code !== 155110 && errStatus(err) !== 404) throw circleError(err) // not initialized yet: the wallet is still being created
    }
    if (!w) return { pending: true } // the PIN step finished but Circle is still creating the wallet
    return { session: deps.newSession({ address: w.address, kind: 'email' }), address: w.address, walletId: w.walletId }
  }

  /** Checks that `to`/`data` is a call the game allows, then asks Circle for the PIN challenge. */
  function checkCall(to, data, playerAddress, contract) {
    const target = String(to || '').toLowerCase()
    const hex = String(data || '')
    if (!/^0x[0-9a-fA-F]{8,20000}$/u.test(hex) || hex.length % 2 !== 0) throw new EmailError(400, 'Bad request', 400)
    const selector = hex.slice(0, 10).toLowerCase()
    if (target === contract.toLowerCase()) {
      if (!allowed.has(selector)) throw new EmailError(403, 'This action is not allowed.', 403)
      if (selector === toFunctionSelector(GAME_SIGNATURES[6])) { // a saved run must be for the signed-in player
        if (hex.slice(10 + 24, 10 + 64).toLowerCase() !== playerAddress.slice(2)) throw new EmailError(403, 'This run belongs to another wallet.', 403)
      }
      return
    }
    if (target === deps.usdc.toLowerCase() && selector === APPROVE_SELECTOR) {
      const spender = '0x' + hex.slice(10 + 24, 10 + 64).toLowerCase()
      if (hex.length !== 10 + 128 || spender !== contract.toLowerCase()) throw new EmailError(403, 'USDC can only be approved for the game.', 403)
      return
    }
    throw new EmailError(403, 'This action is not allowed.', 403)
  }

  async function challenge(body, ip) {
    const s = deps.sessionOf(body)
    const userToken = tokenOf(body)
    limiter.hit('init:' + ip, INIT_PER_IP, 'Too many requests from this network.')
    try {
      const w = await arcWallet(userToken)
      if (!w || w.address !== s.address) throw new EmailError(401, 'Your sign-in expired. Sign in with email again.', 155104)
      const contract = await deps.getContract()
      checkCall(body.to, body.data, w.address, contract)
      const client = await deps.getClient()
      const res = await client.createUserTransactionContractExecutionChallenge({
        userToken,
        walletId: w.walletId,
        contractAddress: String(body.to),
        callData: String(body.data),
        fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      })
      return { challengeId: res.data.challengeId }
    } catch (err) {
      throw circleError(err)
    }
  }

  async function lastTx(body) {
    const s = deps.sessionOf(body)
    const userToken = tokenOf(body)
    try {
      const w = await arcWallet(userToken)
      if (!w || w.address !== s.address) throw new EmailError(401, 'Your sign-in expired. Sign in with email again.', 155104)
      const client = await deps.getClient()
      const res = await client.listTransactions({ userToken, blockchain: BLOCKCHAIN, walletIds: [w.walletId], pageSize: 3, order: 'DESC' })
      const t = ((res && res.data && res.data.transactions) || [])[0]
      return t ? { id: t.id, state: t.state, txHash: t.txHash || '' } : { id: '', state: '', txHash: '' }
    } catch (err) {
      throw circleError(err)
    }
  }

  return { requestOtp, initialize, session, challenge, lastTx, checkCall }
}
