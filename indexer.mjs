/**
 * Onchain leaderboard indexer for ArcVoxelGameFi.
 *
 * Reads RunSubmitted events and keeps each player's best verified run together with its
 * transaction hash, so only results that exist as an onchain transaction appear on the board.
 *
 * Cold start: begins at the contract's deployment block (from the deploy transaction receipt),
 * never at block 0, scans forward in bounded ranges, and persists progress in .data/.
 *
 * RPC: uses the sandbox RPC proxy for Arc_Testnet when available (RPC_URL_Arc_Testnet overrides),
 * otherwise the public RPC from web3-config.json. A 401 means the proxy token rotated: the token is
 * re-read from .env on each request, and the endpoint is never swapped to get past an auth error.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { keccak256, toFunctionSelector, toHex } from 'viem'

const root = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = process.env.GAME_DATA_FILE || join(root, '.data', 'leaderboard.json')
const CHAIN_KEY = 'Arc_Testnet'
const TOPIC = keccak256(toHex('RunSubmitted(address,uint256,uint256,uint256,uint256,uint256,uint8,uint256,uint8,uint256)'))
const MAX_RANGE = 2000
const MIN_RANGE = 50
const POLL_MS = 5000
const BOARD_SIZE = 20
const KEEP_SEASONS = 30

/** persisted: { contract, scanned, players: { [address]: best run + runs count }, seasons: { [season]: { [address]: best run } } } */
let db = { contract: '', scanned: -1, players: {}, seasons: {}, history: {} }
let lastScanOkAt = 0
let head = 0
let running = false
let lastError = '' // internal detail only: never exposed over the API (it may contain the RPC URL)
let range = MAX_RANGE
let scanning = null

async function readConfig() {
  return JSON.parse(await readFile(join(root, 'web3-config.json'), 'utf8'))
}

/** Reads one KEY from .env at call time so a rotated proxy token is picked up without a restart. */
let envCache = { at: 0, map: {} }
async function envValue(key) {
  if (Date.now() - envCache.at > 30_000) {
    const map = {}
    try {
      for (const line of (await readFile(join(root, '.env'), 'utf8')).split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch { /* no .env */ }
    envCache = { at: Date.now(), map }
  }
  return envCache.map[key] ?? process.env[key]
}

async function rpcUrl(cfg) {
  if (process.env.GAME_RPC_URL) return process.env.GAME_RPC_URL // local tests only
  const direct = await envValue('RPC_URL_' + CHAIN_KEY)
  if (direct) return direct
  const base = await envValue('RPC_PROXY_BASE_URL')
  const token = await envValue('RPC_PROXY_TOKEN')
  const chains = String((await envValue('RPC_PROXY_CHAINS')) || '').split(',')
  if (base && token && chains.includes(CHAIN_KEY)) return `${base}/api/rpc/${CHAIN_KEY}?_rpc_token=${token}`
  return cfg.networks['arc-testnet'].rpcUrls[0] // public RPC: may rate-limit under load
}

async function rpc(cfg, method, params) {
  const url = await rpcUrl(cfg)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (res.status === 429) {
    const wait = Number(res.headers.get('retry-after') || 2)
    await new Promise((r) => setTimeout(r, Math.min(30, Math.max(1, wait)) * 1000))
    throw new Error('rate limited')
  }
  if (res.status === 401) {
    envCache.at = 0 // re-read .env on the next call: the sandbox refreshes the proxy token there
    throw new Error('RPC proxy token expired: refreshing')
  }
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'rpc error')
  return json.result
}

async function deployBlock(cfg) {
  if (process.env.GAME_DEPLOY_BLOCK) return Number(process.env.GAME_DEPLOY_BLOCK) // local tests only
  if (cfg.deployTxHash) {
    const receipt = await rpc(cfg, 'eth_getTransactionReceipt', [cfg.deployTxHash])
    if (receipt?.blockNumber) return parseInt(receipt.blockNumber, 16)
  }
  // Deployment block unknown: only scan recent history instead of guessing genesis.
  console.warn('[indexer] deploy block unresolved, scanning only the last 5000 blocks')
  return Math.max(0, head - 5000)
}

async function load(contract) {
  try {
    const saved = JSON.parse(await readFile(DATA_FILE, 'utf8'))
    if (saved.contract?.toLowerCase() === contract.toLowerCase()) db = { seasons: {}, history: {}, ...saved }
  } catch { /* first run */ }
}

async function save() {
  await mkdir(dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(db))
}

function better(entry, run) {
  return !entry || run.score > entry.score
}

function apply(log) {
  const player = '0x' + log.topics[1].slice(26).toLowerCase()
  const season = Number(BigInt(log.topics[2]))
  const word = (i) => BigInt('0x' + log.data.slice(2 + i * 64, 2 + (i + 1) * 64))
  const run = {
    score: Number(word(0)),
    gems: Number(word(1)),
    maxCombo: Number(word(2)),
    wave: Number(word(3)),
    hero: Number(word(4)),
    roomId: Number(word(7)),
    season,
    txHash: log.transactionHash,
    block: parseInt(log.blockNumber, 16),
  }
  const prior = db.players[player]
  const runs = (prior?.runs || 0) + 1
  db.players[player] = better(prior, run) ? { ...run, runs } : { ...prior, runs }
  db.history[player] = [run, ...(db.history[player] || [])].slice(0, 10)
  const bySeason = (db.seasons[season] ||= {})
  if (better(bySeason[player], run)) bySeason[player] = run
  const keys = Object.keys(db.seasons).map(Number).sort((x, y) => y - x)
  for (const k of keys.slice(KEEP_SEASONS)) delete db.seasons[k]
}

async function scanOnce() {
  const cfg = await readConfig()
  const contract = process.env.GAME_CONTRACT || cfg.defaultContract // env override: local tests only
  if (!/^0x[0-9a-fA-F]{40}$/.test(contract || '')) return
  if (db.contract.toLowerCase() !== contract.toLowerCase()) {
    db = { contract, scanned: -1, players: {}, seasons: {}, history: {} }
    await load(contract)
  }
  head = parseInt(await rpc(cfg, 'eth_blockNumber', []), 16)
  if (db.scanned < 0) db.scanned = (await deployBlock(cfg)) - 1
  while (db.scanned < head) {
    const from = db.scanned + 1
    const to = Math.min(head, from + range - 1)
    try {
      const logs = await rpc(cfg, 'eth_getLogs', [{ address: contract, topics: [TOPIC], fromBlock: '0x' + from.toString(16), toBlock: '0x' + to.toString(16) }])
      logs.forEach(apply)
      db.scanned = to
      range = Math.min(MAX_RANGE, range * 2)
      lastError = ''
    } catch (err) {
      lastError = String(err.message || err)
      console.warn('[indexer] scan error:', lastError.replace(/https?:\/\/\S+/g, '<url>'))
      if (range > MIN_RANGE && !/rate limited|expired|refreshing/.test(lastError)) range = Math.max(MIN_RANGE, Math.floor(range / 2))
      else throw err
    }
  }
  lastScanOkAt = Date.now()
  await save()
}

/** Scans up to the chain head. Concurrent callers share one scan. */
export function scanNow() {
  if (!scanning) scanning = scanOnce().catch((e) => { lastError = String(e.message || e); console.warn('[indexer] scan failed:', lastError.replace(/https?:\/\/\S+/g, '<url>')) }).finally(() => { scanning = null })
  return scanning
}

export function startIndexer() {
  if (running) return
  running = true
  const loop = async () => {
    await scanNow()
    if (lastScanOkAt && Date.now() - lastScanOkAt > 120_000) console.warn('[indexer] STALLED: no successful scan for over 2 minutes. Check the RPC and restart if needed.')
    setTimeout(loop, POLL_MS)
  }
  loop()
}

let startTimeCache = 0
/** Reads the contract's immutable startTime so the server can keep signed tickets inside one season. Returns 0 if unavailable. */
export async function readStartTime() {
  if (startTimeCache) return startTimeCache
  try {
    const cfg = await readConfig()
    const contract = process.env.GAME_CONTRACT || cfg.defaultContract
    const data = toFunctionSelector('startTime()')
    const out = await rpc(cfg, 'eth_call', [{ to: contract, data }, 'latest'])
    startTimeCache = Number(BigInt(out))
  } catch {
    startTimeCache = 0
  }
  return startTimeCache
}

export { rpcUrl as indexerRpcUrl }

/** Read-only eth_call through the same (proxy-aware) endpoint. */
export async function chainCall(to, data) {
  return rpc(await readConfig(), 'eth_call', [{ to, data }, 'latest'])
}

export async function readConfigPublic() {
  return readConfig()
}

export function getBoard(scope = 'all', season = -1) {
  const source = scope === 'season' ? db.seasons[season] || {} : db.players
  const entries = Object.entries(source)
    .map(([player, e]) => ({
      player, score: e.score, gems: e.gems, maxCombo: e.maxCombo, wave: e.wave ?? 0, hero: e.hero ?? 0,
      season: e.season ?? 0, txHash: e.txHash, block: e.block, runs: e.runs ?? 1,
    }))
    .sort((a, b) => b.score - a.score || a.block - b.block)
    .slice(0, BOARD_SIZE)
  return {
    scope,
    season: scope === 'season' ? season : null,
    entries,
    players: Object.keys(source).length,
    indexing: indexerStatus(),
  }
}

/** A player's best run and their ten most recent runs, each with its transaction hash. */
export function getPlayer(address) {
  const a = String(address || '').toLowerCase()
  return { player: a, best: db.players[a] || null, history: db.history[a] || [] }
}

/** Health for /api/health and the player-facing "syncing" note. No URLs or error text are exposed. */
export function indexerStatus() {
  const behind = Math.max(0, head - db.scanned)
  return {
    scanned: db.scanned,
    head,
    behind,
    healthy: !lastError,
    stalled: lastScanOkAt > 0 && Date.now() - lastScanOkAt > 120_000,
    lastScanAt: lastScanOkAt,
  }
}
