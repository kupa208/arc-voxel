/**
 * Boards for the extra game modes (Endless and Boss Rush). They are not onchain: the server verifies the run
 * the same way it does for a saved run, then keeps each player's best result.
 * Storage: the shared Redis (Upstash) when configured, otherwise this process's memory and a local file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kv, kvEnabled } from './kv.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const FILE = process.env.GAME_MODES_FILE || (process.env.VERCEL ? '/tmp/modes.json' : join(root, '.data', 'modes.json'))
export const MODES = ['endless', 'bossrush']
const BOARD_SIZE = 20
const hkey = (mode) => `arcvoxel:mode:${mode}`

let mem = { endless: {}, bossrush: {} }
let loaded = false
function loadFile() {
  if (loaded) return
  loaded = true
  try {
    const j = JSON.parse(readFileSync(FILE, 'utf8'))
    for (const m of MODES) mem[m] = j[m] && typeof j[m] === 'object' ? j[m] : {}
  } catch { /* first run */ }
}
function saveFile() {
  try {
    mkdirSync(dirname(FILE), { recursive: true })
    writeFileSync(FILE, JSON.stringify(mem))
  } catch { /* read-only disk: keep it in memory */ }
}

/** Higher is better for Endless (wave, then score). Boss Rush: more bosses, then a faster time. */
export function isBetter(mode, a, b) {
  if (!b) return true
  if (mode === 'endless') return a.wave > b.wave || (a.wave === b.wave && a.score > b.score)
  return a.bosses > b.bosses || (a.bosses === b.bosses && a.timeMs < b.timeMs)
}
function order(mode) {
  return (x, y) => (isBetter(mode, x.result, y.result) ? -1 : isBetter(mode, y.result, x.result) ? 1 : x.result.at - y.result.at)
}

async function readAll(mode) {
  if (kvEnabled) {
    const flat = await kv('HGETALL', hkey(mode))
    const out = {}
    for (let i = 0; i + 1 < (flat || []).length; i += 2) {
      try { out[flat[i]] = JSON.parse(flat[i + 1]) } catch { /* skip */ }
    }
    return out
  }
  loadFile()
  return mem[mode]
}

/** Keeps the player's best result for the mode. Returns { improved, result }. */
export async function submitResult(mode, address, result) {
  if (!MODES.includes(mode)) throw new Error('bad mode')
  const a = String(address).toLowerCase()
  const row = { ...result, at: Date.now() }
  if (kvEnabled) {
    const prev = await kv('HGET', hkey(mode), a)
    let prior = null
    try { prior = prev ? JSON.parse(prev) : null } catch { /* ignore */ }
    if (!isBetter(mode, row, prior)) return { improved: false, result: prior }
    await kv('HSET', hkey(mode), a, JSON.stringify(row))
    return { improved: true, result: row }
  }
  loadFile()
  const prior = mem[mode][a] || null
  if (!isBetter(mode, row, prior)) return { improved: false, result: prior }
  mem[mode][a] = row
  saveFile()
  return { improved: true, result: row }
}

export async function getModeBoard(mode) {
  if (!MODES.includes(mode)) throw new Error('bad mode')
  const all = await readAll(mode)
  const rows = Object.entries(all).map(([player, result]) => ({ player, result }))
  rows.sort(order(mode))
  return { mode, players: rows.length, entries: rows.slice(0, BOARD_SIZE).map(({ player, result }) => ({ player, ...result })) }
}
