#!/usr/bin/env bun
/**
 * Arc Voxel Quest game server (Bun).
 *
 * Login:   the player connects a wallet in the browser (MetaMask, Rabby, ...) and signs a free message
 *          (no gas) to prove ownership. The server then issues a session for that wallet address.
 * Anti-cheat: the server times each run, signs a ticket only for plausible scores, and the
 *          contract only accepts runs with a valid, unused ticket from that player's wallet.
 *
 * API (all JSON):
 *   GET  /api/config                         public setup info
 *   GET  /api/leaderboard[?refresh=1]        best verified run per player (indexed from onchain events)
 *   GET  /api/auth/nonce?player=0x..         message a wallet signs (free)
 *   POST /api/auth/wallet   {player, signature} -> {session}
 *   POST /api/auth/logout   {session}
 *   POST /api/wallet/status {session}        -> {hasWallet, address}
 *   POST /api/run/start     {session}        -> {runId}
 *   POST /api/run/finish    {session, runId, score, gems, maxCombo, elapsed} -> signed ticket
 *
 * Secrets (never committed): GAME_SIGNER_PRIVATE_KEY lives in .env.local.
 * Optional: WALLETCONNECT_PROJECT_ID enables the WalletConnect option. Run: bun server.mjs [port]
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, createWalletClient, decodeFunctionResult, defineChain, encodeAbiParameters, encodeFunctionData, fallback, formatUnits, http, isAddress, keccak256, parseAbi, recoverMessageAddress, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { verifyTelemetry } from './anticheat.mjs'
import { chainCall, getBoard, getPlayer, indexerStatus, indexerRpcUrl, readConfigPublic, readStartTime, scanNow, startIndexer } from './indexer.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const port = Number(process.argv[2] || process.env.PORT || 5173)

const CHAIN_ID = BigInt(process.env.GAME_CHAIN_ID || 5042002) // Arc Testnet; override only for local tests
const MIN_RUN_SECONDS = 10
const MAX_SESSION_SECONDS = 60 * 60
const MIN_FINISH_GAP_MS = 15_000
// The game's in-run score gets large (about 400 points/second in a good run, much more in bursts).
// The contract stores "points" = game score / SCORE_DIVISOR, capped at MAX_SCORE per run.
const SCORE_DIVISOR = 20
const MAX_SCORE = 50_000 // contract MAX_SCORE_PER_RUN, in points
const SCORE_BASE = 1_000 // plausibility limit in game score: base + per second of play
const SCORE_PER_SECOND = 1_500
const GEMS_BASE = 10
const GEMS_PER_SECOND = 8
const SIG_TTL_SECONDS = 10 * 60
const MAX_SESSIONS = 5_000
const SEASON_LENGTH_S = 86_400 // matches ArcVoxelGameFi.SEASON_LENGTH
const REFRESH_MIN_GAP_MS = 2_000
const HEROES = 5 // number of playable heroes (contract hero id < 5)
const MAX_ROOM_ID = 1_000_000_000
const RELAY_PER_PLAYER_PER_DAY = 10
const RELAY_PER_DAY = 300
const RELAYER_MIN_BALANCE = 20_000n // 0.02 USDC in ERC-20 units: below this the relayer pauses itself
const LOGIN_TTL_MS = 24 * 60 * 60 * 1000

const pk = process.env.GAME_SIGNER_PRIVATE_KEY
if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  console.error('GAME_SIGNER_PRIVATE_KEY is missing. Add it to .env.local.')
  process.exit(1)
}
const signer = privateKeyToAccount(pk)
// Optional gasless relayer: a separate hot wallet that pays gas to save runs for players. Fund it with a little USDC.
const relayerPk = process.env.RELAYER_PRIVATE_KEY || ''
const relayer = /^0x[0-9a-fA-F]{64}$/.test(relayerPk) ? privateKeyToAccount(relayerPk) : null
const relayUsage = { day: 0, total: 0, perPlayer: new Map() }
const walletConnectProjectId = process.env.WALLETCONNECT_PROJECT_ID || '' // optional: enables the WalletConnect (phone wallet) option
const testAuth = process.env.GAME_TEST_AUTH === '1' // local anvil tests only: allows creating a session without a signature
if (testAuth) console.warn('WARNING: GAME_TEST_AUTH is on. Never enable it on a public server.')
let lastRefreshAt = 0
const clientErrWindow = { at: 0, n: 0 }
// Passkey wallets: Circle Modular Wallets (smart accounts signed with a device passkey; Circle's Gas Station pays the gas).
// The client key is meant for browsers and is limited to the allowed domain set in Circle Console.
const circleClientKey = (process.env.CIRCLE_CLIENT_KEY || '').trim()
const CIRCLE_CLIENT_URL = 'https://modular-sdk.circle.com/v1/rpc/w3s/buidl'
/** browser wallet sessions, proven by a signed message
 * @type {Map<string, {address: string, exp: number}>} */
const sessions = new Map()
/** @type {Map<string, {player: string, startedAt: number, roomId: number, hero: number}>} */
const runs = new Map()
/** @type {Map<string, number>} */
const lastFinish = new Map()
/** tickets already issued, so a cancelled wallet approval can be retried without replaying the run */
const issued = new Map()

// Sessions, open runs and issued tickets survive a server restart (non-secret game state, git-ignored).
const STATE_FILE = process.env.GAME_STATE_FILE || join(root, '.data', 'server-state.json')
let saveTimer = null
function loadState() {
  try {
    const j = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    const now = Date.now()
    for (const [k, v] of j.sessions || []) if (v.exp > now) sessions.set(k, v)
    for (const [k, v] of j.runs || []) if (now - v.startedAt < MAX_SESSION_SECONDS * 1000) runs.set(k, v)
    for (const [k, v] of j.issued || []) if (Number(v.deadline) * 1000 > now) issued.set(k, { ...v, deadline: BigInt(v.deadline) })
    for (const [k, v] of j.lastFinish || []) lastFinish.set(k, v)
  } catch { /* first start */ }
}
function saveState() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      mkdirSync(dirname(STATE_FILE), { recursive: true })
      writeFileSync(STATE_FILE, JSON.stringify({
        sessions: [...sessions],
        runs: [...runs],
        issued: [...issued].map(([k, v]) => [k, { ...v, deadline: v.deadline.toString() }]),
        lastFinish: [...lastFinish],
      }))
    } catch (e) { console.warn('could not save state:', e.message) }
  }, 500)
}

const randomHex = (n) => toHex(crypto.getRandomValues(new Uint8Array(n)))
/** wallet sign-in challenges: address -> { message, exp } */
const challenges = new Map()
const CHALLENGE_TTL_MS = 5 * 60 * 1000

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function contractAddress() {
  if (process.env.GAME_CONTRACT) return process.env.GAME_CONTRACT // local tests only
  const cfg = JSON.parse(await readFile(join(root, 'web3-config.json'), 'utf8'))
  return cfg.defaultContract
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  })
}

function newSession(data) {
  const now = Date.now()
  for (const [id, s] of sessions) if (s.exp < now) sessions.delete(id)
  while (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value)
  const id = randomHex(32)
  sessions.set(id, { ...data, exp: now + LOGIN_TTL_MS })
  return id
}

function sessionOf(body) {
  const s = sessions.get(String(body?.session || ''))
  if (!s || s.exp < Date.now()) throw new HttpError(401, 'Please connect your wallet')
  return s
}

function handleWalletStatus(body) {
  const s = sessionOf(body)
  return json({ hasWallet: true, address: s.address })
}

/* ---------- browser wallet sign-in (personal_sign, free, no gas) ---------- */

function handleWalletNonce(url) {
  const raw = String(url.searchParams.get('player') || '')
  if (!isAddress(raw)) throw new HttpError(400, 'Invalid wallet address')
  const now = Date.now()
  const message = [
    'Sign in to Arc Voxel Quest',
    '',
    'This proves you own this wallet. It costs no gas and sends no transaction.',
    `Wallet: ${raw}`,
    `Network: Arc Testnet (${CHAIN_ID})`,
    `Nonce: ${randomHex(16)}`,
    `Issued: ${new Date(now).toISOString()}`,
  ].join('\n')
  for (const [a, c] of challenges) if (c.exp < now) challenges.delete(a)
  while (challenges.size >= MAX_SESSIONS) challenges.delete(challenges.keys().next().value)
  challenges.set(raw.toLowerCase(), { message, exp: now + CHALLENGE_TTL_MS })
  return json({ message })
}

/** True when `signature` proves control of `address`: a plain wallet signature, or a smart-contract wallet signature (ERC-1271, or ERC-6492 for a passkey wallet that is not deployed yet). */
async function verifyWalletSignature(address, message, signature) {
  try {
    if ((await recoverMessageAddress({ message, signature })).toLowerCase() === address) return true
  } catch { /* not a plain signature: try the smart-contract wallet checks below */ }
  try {
    const cfg = await readConfigPublic()
    const client = createPublicClient({ transport: http(await indexerRpcUrl(cfg)) })
    return await client.verifyMessage({ address, message, signature })
  } catch (err) {
    console.warn('[auth] smart wallet signature check failed:', redact(err).split('\n')[0].slice(0, 200))
    return false
  }
}

async function handleWalletLogin(body) {
  const player = String(body.player || '').toLowerCase()
  if (!isAddress(player) || typeof body.signature !== 'string' || body.signature.length > 20_000) throw new HttpError(400, 'Bad request')
  const ch = challenges.get(player)
  if (!ch || ch.exp < Date.now()) throw new HttpError(400, 'Sign-in expired. Try again.')
  if (!(await verifyWalletSignature(player, ch.message, body.signature))) throw new HttpError(401, 'Signature does not match this wallet')
  challenges.delete(player)
  return json({ session: newSession({ address: player }), address: player })
}

/* ---------- anti-cheat runs ---------- */

function prune(now) {
  for (const [id, r] of runs) if (now - r.startedAt > MAX_SESSION_SECONDS * 1000) runs.delete(id)
  while (runs.size > MAX_SESSIONS) runs.delete(runs.keys().next().value)
}

function int(v, max) {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null
}

async function handleRunStart(body) {
  const s = sessionOf(body)
  if (!s.address) throw new HttpError(409, 'Create your wallet first')
  const roomId = int(body.roomId ?? 0, MAX_ROOM_ID)
  const hero = int(body.hero ?? 0, HEROES - 1)
  if (roomId === null || hero === null) throw new HttpError(400, 'Invalid room or hero')
  const now = Date.now()
  prune(now)
  for (const [id, r] of runs) if (r.player === s.address) runs.delete(id)
  const runId = keccak256(toHex(crypto.getRandomValues(new Uint8Array(32))))
  runs.set(runId, { player: s.address, startedAt: now, roomId, hero })
  return json({ runId })
}

/** Validates a finished run and returns a ticket signed for the contract. Throws HttpError when rejected. */
async function issueTicket(s, body) {
  const runId = String(body.runId || '')
  const prior = issued.get(runId)
  if (prior && prior.player === s.address && Number(prior.deadline) * 1000 > Date.now()) return prior
  const run = runs.get(runId)
  if (!run) throw new HttpError(400, 'No active run. Press Play, then finish your run.')
  if (run.player !== s.address) throw new HttpError(400, 'Wallet mismatch')

  const now = Date.now()
  const serverElapsed = (now - run.startedAt) / 1000
  const reported = Number(body.elapsed)
  if (!Number.isFinite(reported) || reported < 0) throw new HttpError(400, 'Invalid run data')
  const elapsed = Math.min(serverElapsed, Number.isFinite(reported) ? reported + 2 : serverElapsed)
  const gameScore = int(body.score, MAX_SCORE * SCORE_DIVISOR)
  const gems = int(body.gems, 100_000)
  const maxCombo = int(body.maxCombo, 10)
  const wave = int(body.wave, 100_000)
  if (gameScore === null || gems === null || maxCombo === null || wave === null || wave < 1 || gameScore < 1 || maxCombo < 1) {
    throw new HttpError(400, 'Invalid run data')
  }
  if (elapsed < MIN_RUN_SECONDS) throw new HttpError(400, 'Run too short to submit')
  if (gameScore > SCORE_BASE + SCORE_PER_SECOND * elapsed || gems > GEMS_BASE + GEMS_PER_SECOND * elapsed) {
    runs.delete(runId)
    throw new HttpError(422, 'Score rejected by anti-cheat')
  }
  const check = verifyTelemetry(body.telemetry, { elapsed: Math.floor(reported), score: gameScore, gems, wave, serverElapsed })
  if (!check.ok) {
    runs.delete(runId)
    rejectLog(s.address, check.reason, { gameScore, gems, wave, elapsed: reported, serverElapsed })
    throw new HttpError(422, 'Run rejected by anti-cheat: ' + check.reason)
  }
  const score = Math.min(MAX_SCORE, Math.floor(gameScore / SCORE_DIVISOR))
  if (score < 1) throw new HttpError(400, `Score too low to save (need at least ${SCORE_DIVISOR})`)
  if (now - (lastFinish.get(s.address) || 0) < MIN_FINISH_GAP_MS) throw new HttpError(429, 'Too many submissions, wait a moment')

  runs.delete(runId)
  lastFinish.set(s.address, now)
  while (lastFinish.size > MAX_SESSIONS) lastFinish.delete(lastFinish.keys().next().value)
  return finalizeTicket({ runId, gameScore, gems, maxCombo, wave, hero: run.hero, roomId: run.roomId, score, now, player: s.address })
}

/** Signs the ticket. Its deadline never passes the end of the current season, so a saved run cannot be carried into a later season. */
const ROOM_ABI = parseAbi([
  'function getRoom(uint256) view returns (address creator, uint64 start, uint64 end, uint256 entryFee, uint256 pool, uint32 entrants, bool ended)',
  'function roomEntered(uint256, address) view returns (bool)',
])

/** A room ticket only works while the room is open and the player joined: otherwise the run is saved as a normal run. */
async function roomUsable(roomId, player, nowS) {
  try {
    const contract = await contractAddress()
    const room = decodeFunctionResult({ abi: ROOM_ABI, functionName: 'getRoom', data: await chainCall(contract, encodeFunctionData({ abi: ROOM_ABI, functionName: 'getRoom', args: [BigInt(roomId)] })) })
    const entered = decodeFunctionResult({ abi: ROOM_ABI, functionName: 'roomEntered', data: await chainCall(contract, encodeFunctionData({ abi: ROOM_ABI, functionName: 'roomEntered', args: [BigInt(roomId), player] })) })
    return entered && Number(room[2]) - nowS >= 60
  } catch {
    return false
  }
}

async function finalizeTicket(partial) {
  const { runId, gameScore, gems, maxCombo, score, now, wave, hero } = partial
  let roomId = partial.roomId
  const startTime = await readStartTime()
  if (!startTime) throw new HttpError(503, 'Chain data unavailable, try again shortly')
  const nowS = Math.floor(now / 1000)
  if (roomId > 0 && !(await roomUsable(roomId, partial.player, nowS))) roomId = 0
  const season = Math.floor((nowS - startTime) / SEASON_LENGTH_S)
  const seasonEnd = startTime + (season + 1) * SEASON_LENGTH_S
  const deadline = BigInt(Math.min(nowS + SIG_TTL_SECONDS, seasonEnd - 1)) // never past the season the ticket is signed for
  const ticket = { runId, season, score, gameScore, gems, maxCombo, wave, hero, roomId, deadline, player: partial.player }
  issued.set(runId, ticket)
  while (issued.size > MAX_SESSIONS) issued.delete(issued.keys().next().value)
  return ticket
}

async function signTicket(t) {
  const contract = await contractAddress()
  if (!isAddress(contract)) throw new HttpError(503, 'Game contract not configured')
  const digest = keccak256(
    encodeAbiParameters(
      [
        { type: 'uint256' }, { type: 'address' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' },
        { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      ],
      [CHAIN_ID, contract, t.player, BigInt(t.season), BigInt(t.roomId), t.runId, BigInt(t.score), BigInt(t.gems), BigInt(t.maxCombo), BigInt(t.wave), BigInt(t.hero), t.deadline],
    ),
  )
  return signer.signMessage({ message: { raw: digest } })
}

/** The ticket as the client and the contract see it. */
async function ticketResponse(t) {
  const signature = await signTicket(t)
  return {
    runId: t.runId, score: t.score, gameScore: t.gameScore, gems: t.gems, maxCombo: t.maxCombo,
    wave: t.wave, hero: t.hero, roomId: t.roomId, deadline: t.deadline.toString(), signature, player: t.player,
  }
}

/** Rejected runs are kept for review (never exposed over the API). */
function rejectLog(player, reason, detail) {
  console.warn('[anti-cheat] rejected', player, reason, JSON.stringify(detail))
  try {
    mkdirSync(join(root, '.data'), { recursive: true })
    writeFileSync(join(root, '.data', 'rejected-runs.jsonl'), JSON.stringify({ at: new Date().toISOString(), player, reason, detail }) + '\n', { flag: 'a' })
  } catch { /* logging must never break the request */ }
}

/** Changes whenever a lazily loaded vendor bundle changes, so browsers never keep serving an old copy. */
function assetVersion() {
  try { return ['passkey.js', 'walletconnect.js'].map((f) => Math.floor(statSync(join(root, 'vendor', f)).mtimeMs / 1000)).join('-') } catch { return '0' }
}

/** Removes URLs (which can carry the RPC proxy token) from anything that gets logged. */
function redact(v) {
  return String(v && (v.shortMessage || v.stack || v.message) || v).replace(/https?:\/\/\S+/g, '[url]').replace(/_rpc_token=\S+/g, '')
}

const SUBMIT_ABI = parseAbi([
  'function submitRun((address player,uint256 score,uint256 gems,uint256 maxCombo,uint256 wave,uint8 hero,uint256 roomId,bytes32 runId,uint256 deadline) r, bytes signature)',
])

// The RPC proxy is read-only (it refuses eth_sendRawTransaction), so the relayer talks to the public Arc RPC endpoints.
async function relayClients() {
  const cfg = await readConfigPublic()
  const net = cfg.networks['arc-testnet']
  const urls = process.env.GAME_RPC_URL ? [process.env.GAME_RPC_URL] : [process.env.RPC_URL_Arc_Testnet, ...net.rpcUrls].filter(Boolean)
  const transport = () => fallback(urls.map((u) => http(u, { retryCount: 1, timeout: 15_000 })))
  const chain = defineChain({ id: Number(CHAIN_ID), name: net.chainName, nativeCurrency: net.nativeCurrency, rpcUrls: { default: { http: urls } } })
  return {
    pub: createPublicClient({ chain, transport: transport() }),
    wallet: createWalletClient({ account: relayer, chain, transport: transport() }),
  }
}

let balanceCache = { at: 0, value: 0n }
async function relayerBalanceUsdc() {
  if (!relayer) return 0n
  if (Date.now() - balanceCache.at < 20_000) return balanceCache.value
  const value = await readRelayerBalance()
  balanceCache = { at: Date.now(), value }
  return value
}

async function readRelayerBalance() {
  const { pub } = await relayClients()
  const usdc = process.env.GAME_USDC || '0x3600000000000000000000000000000000000000'
  const abi = parseAbi(['function balanceOf(address) view returns (uint256)'])
  try {
    return await pub.readContract({ address: usdc, abi, functionName: 'balanceOf', args: [relayer.address] })
  } catch {
    // Test chains use a mock USDC; native balance is the same pool on Arc.
    return (await pub.getBalance({ address: relayer.address })) / 10n ** 12n
  }
}

/** Saves a validated run onchain, paying the gas from the relayer wallet. */
async function relayRun(s, t) {
  if (!relayer) throw new HttpError(503, 'Gasless saving is not enabled')
  const today = Math.floor(Date.now() / 86_400_000)
  if (relayUsage.day !== today) { relayUsage.day = today; relayUsage.total = 0; relayUsage.perPlayer.clear() }
  const mine = relayUsage.perPlayer.get(s.address) || 0
  if (mine >= RELAY_PER_PLAYER_PER_DAY || relayUsage.total >= RELAY_PER_DAY) throw new HttpError(429, 'Free saves used up for today. Save with your own wallet instead.')
  if ((await relayerBalanceUsdc()) < RELAYER_MIN_BALANCE) throw new HttpError(503, 'Free saving is temporarily out of gas. Save with your own wallet instead.')
  const contract = await contractAddress()
  const signature = await signTicket(t)
  const { pub, wallet } = await relayClients()
  const ticket = { player: t.player, score: BigInt(t.score), gems: BigInt(t.gems), maxCombo: BigInt(t.maxCombo), wave: BigInt(t.wave), hero: t.hero, roomId: BigInt(t.roomId), runId: t.runId, deadline: t.deadline }
  let hash
  try {
    await pub.simulateContract({ address: contract, abi: SUBMIT_ABI, functionName: 'submitRun', args: [ticket, signature], account: relayer }) // never pay gas for a doomed tx
    hash = await wallet.writeContract({ address: contract, abi: SUBMIT_ABI, functionName: 'submitRun', args: [ticket, signature] })
  } catch (err) {
    console.warn('[relay] failed:', redact(err).split('\n')[0].slice(0, 220))
    throw new HttpError(502, 'Free saving could not send the transaction. Your run is kept for a few minutes: try again or save with your own wallet.')
  }
  relayUsage.total += 1
  relayUsage.perPlayer.set(s.address, mine + 1)
  balanceCache.at = 0
  const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 30_000 }).catch(() => null)
  if (receipt && receipt.status !== 'success') throw new HttpError(502, 'The transaction reverted')
  return { txHash: hash, confirmed: Boolean(receipt) }
}

/* ---------- routing ---------- */

async function route(req, url) {
  const m = req.method
  const p = url.pathname
  const body = m === 'POST' ? await req.json().catch(() => ({})) : {}

  if (m === 'GET' && p === '/api/health') {
    const idx = indexerStatus()
    const relayerOk = relayer ? (await relayerBalanceUsdc().catch(() => 0n)) >= RELAYER_MIN_BALANCE : false
    return json({ ok: !idx.stalled, signer: signer.address, indexer: idx, relayer: { enabled: Boolean(relayer), funded: relayerOk }, uptimeS: Math.floor(process.uptime()) })
  }
  if (m === 'GET' && p === '/api/config') {
    return json({ assetVersion: assetVersion(), walletConnectProjectId, passkey: { enabled: Boolean(circleClientKey), clientKey: circleClientKey, clientUrl: CIRCLE_CLIENT_URL }, blockchain: 'ARC-TESTNET', relay: { enabled: Boolean(relayer), address: relayer ? relayer.address : '' } })
  }
  if (m === 'GET' && p === '/api/leaderboard') {
    if (url.searchParams.get('refresh') === '1' && Date.now() - lastRefreshAt > REFRESH_MIN_GAP_MS) {
      lastRefreshAt = Date.now()
      await scanNow() // right after a player records a score
    }
    const scope = url.searchParams.get('scope') === 'season' ? 'season' : 'all'
    const season = Number(url.searchParams.get('season') ?? -1)
    return json(getBoard(scope, Number.isFinite(season) ? season : -1))
  }
  if (m === 'GET' && p === '/api/player') {
    const addr = String(url.searchParams.get('address') || '')
    if (!isAddress(addr)) throw new HttpError(400, 'Invalid address')
    return json(getPlayer(addr))
  }
  if (m === 'GET' && p === '/vendor/walletconnect.js') {
    return new Response(Bun.file(join(root, 'vendor', 'walletconnect.js')), {
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' },
    })
  }
  if (m === 'GET' && p === '/vendor/passkey.js') {
    return new Response(Bun.file(join(root, 'vendor', 'passkey.js')), {
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' },
    })
  }
  if (m === 'GET' && (p === '/' || p === '/index.html')) {
    return new Response(Bun.file(join(root, 'index.html')), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  }

  if (testAuth && m === 'POST' && p === '/api/test/session') {
    if (!isAddress(String(body.player || ''))) throw new HttpError(400, 'Invalid player')
    return json({ session: newSession({ address: String(body.player).toLowerCase() }) })
  }

  if (m === 'POST' && p === '/api/client-error') {
    const now = Date.now()
    if (now - clientErrWindow.at > 60_000) { clientErrWindow.at = now; clientErrWindow.n = 0 }
    if (++clientErrWindow.n <= 20) console.warn('[client]', String(body.message || '').replace(/[\r\n]+/g, ' ').slice(0, 300))
    return json({ ok: true })
  }

  if (m === 'GET' && p === '/api/auth/nonce') return handleWalletNonce(url)
  if (m === 'POST' && p === '/api/auth/wallet') return handleWalletLogin(body)
  if (m === 'POST' && p === '/api/auth/logout') {
    sessions.delete(String(body.session || ''))
    return json({ ok: true })
  }
  if (m === 'POST' && p === '/api/wallet/status') return handleWalletStatus(body)
  if (m === 'POST' && p === '/api/run/start') return handleRunStart(body)
  if (m === 'POST' && p === '/api/run/finish') {
    const s = sessionOf(body)
    const t = await issueTicket(s, body)
    return json(await ticketResponse(t))
  }
  if (m === 'POST' && p === '/api/run/relay') {
    const s = sessionOf(body)
    const t = await issueTicket(s, body)
    return json(await relayRun(s, t))
  }
  return new Response('Not found', { status: 404 })
}

Bun.serve({
  port,
  hostname: '0.0.0.0',
  maxRequestBodySize: 64 * 1024,
  async fetch(req) {
    try {
      const res = await route(req, new URL(req.url))
      if (req.method === 'POST') saveState()
      return res
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error('[server]', redact(err).slice(0, 400))
      return json({ error: 'Server error' }, 500)
    }
  },
})

loadState()
startIndexer()
console.log(`Arc Voxel Quest running on http://0.0.0.0:${port} (signer ${signer.address})`)
