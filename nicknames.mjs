/**
 * Player nicknames for the leaderboard.
 * Kept on the game server (not onchain), keyed by wallet address. Only a signed-in wallet can set its own nickname.
 * Storage: a shared Redis (Upstash, see kv.mjs) when configured, otherwise .data/nicknames.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kv, kvEnabled } from './kv.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const FILE = process.env.GAME_NICKNAME_FILE || (process.env.VERCEL ? '/tmp/nicknames.json' : join(root, '.data', 'nicknames.json'))
export const NICK_MIN = 3
export const NICK_MAX = 16
const CHANGE_GAP_S = 20
const RESERVED = ['admin', 'administrator', 'moderator', 'arc', 'arcstudio', 'circle', 'official', 'support', 'system', 'null', 'undefined']
const K_NAMES = 'arcvoxel:nick:names' // hash: address -> nickname
const K_KEYS = 'arcvoxel:nick:keys' // hash: comparison key -> address

export class NicknameError extends Error {
  constructor(message) {
    super(message)
    this.status = 400
  }
}

/** Case, accent and spacing insensitive key, so "Kiên  Trinh" and "kien trinh" count as the same name. */
function keyOf(name) {
  return String(name)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/giu, 'd')
    .toLowerCase()
    .replace(/[\s._-]+/gu, '')
}

/** Returns the cleaned nickname or throws a NicknameError with a message the player can read. */
export function cleanNickname(raw) {
  const name = String(raw ?? '').normalize('NFC').replace(/\s+/gu, ' ').trim()
  if (name.length < NICK_MIN || name.length > NICK_MAX) throw new NicknameError(`Nickname must be ${NICK_MIN}-${NICK_MAX} characters.`)
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) throw new NicknameError('Use letters, numbers, spaces, dot, dash or underscore only.')
  if (/^0x/iu.test(name)) throw new NicknameError('A nickname cannot start with 0x.')
  const key = keyOf(name)
  if (key.length < 2 || RESERVED.includes(key)) throw new NicknameError('That nickname is reserved. Pick another one.')
  return name
}

const addrOf = (a) => String(a || '').toLowerCase()
const WAIT = 'Please wait a few seconds before changing your nickname again.'
const TAKEN = 'That nickname is already taken.'

/* ---------- local file store ---------- */

/** @type {Map<string, string>} */
const byAddress = new Map()
/** @type {Map<string, string>} */
const byKey = new Map()
/** @type {Map<string, number>} */
const lastChange = new Map()

if (!kvEnabled) {
  try {
    const j = JSON.parse(readFileSync(FILE, 'utf8'))
    for (const [addr, name] of Object.entries(j)) {
      if (typeof name !== 'string') continue
      byAddress.set(addr.toLowerCase(), name)
      byKey.set(keyOf(name), addr.toLowerCase())
    }
  } catch { /* first start */ }
}

function saveFile() {
  try {
    mkdirSync(dirname(FILE), { recursive: true })
    writeFileSync(FILE, JSON.stringify(Object.fromEntries(byAddress)))
  } catch (err) {
    console.error('[nicknames] could not save:', err && err.message)
  }
}

function setLocal(addr, raw) {
  const now = Date.now()
  if (now - (lastChange.get(addr) || 0) < CHANGE_GAP_S * 1000) throw new NicknameError(WAIT)
  const current = byAddress.get(addr)
  if (String(raw ?? '').trim() === '') {
    if (current) {
      byAddress.delete(addr)
      byKey.delete(keyOf(current))
      lastChange.set(addr, now)
      saveFile()
    }
    return ''
  }
  const name = cleanNickname(raw)
  const key = keyOf(name)
  const owner = byKey.get(key)
  if (owner && owner !== addr) throw new NicknameError(TAKEN)
  if (current) byKey.delete(keyOf(current))
  byAddress.set(addr, name)
  byKey.set(key, addr)
  lastChange.set(addr, now)
  saveFile()
  return name
}

/* ---------- public API ---------- */

export async function getNickname(address) {
  const addr = addrOf(address)
  if (!kvEnabled) return byAddress.get(addr) || ''
  try { return (await kv('HGET', K_NAMES, addr)) || '' } catch { return '' }
}

/** Nicknames for a list of addresses: { [lowercase address]: nickname } (only players who have one). */
export async function nicknamesFor(addresses) {
  const list = [...new Set(addresses.map(addrOf))]
  const out = {}
  if (!list.length) return out
  if (!kvEnabled) {
    for (const a of list) if (byAddress.has(a)) out[a] = byAddress.get(a)
    return out
  }
  try {
    const values = await kv('HMGET', K_NAMES, ...list)
    list.forEach((a, i) => { if (values && values[i]) out[a] = values[i] })
  } catch { /* the board still works without names */ }
  return out
}

/** Sets (or, with an empty value, clears) the nickname of one wallet. Returns the saved nickname. */
export async function setNickname(address, raw) {
  const addr = addrOf(address)
  if (!kvEnabled) return setLocal(addr, raw)

  const clearing = String(raw ?? '').trim() === ''
  const name = clearing ? '' : cleanNickname(raw)
  const gate = await kv('SET', `arcvoxel:nick:rl:${addr}`, '1', 'NX', 'EX', String(CHANGE_GAP_S))
  if (!gate) throw new NicknameError(WAIT)
  const current = (await kv('HGET', K_NAMES, addr)) || ''
  if (clearing) {
    if (current) {
      await kv('HDEL', K_NAMES, addr)
      await kv('HDEL', K_KEYS, keyOf(current))
    }
    return ''
  }
  const key = keyOf(name)
  const claimed = await kv('HSETNX', K_KEYS, key, addr)
  if (!claimed && (await kv('HGET', K_KEYS, key)) !== addr) throw new NicknameError(TAKEN)
  await kv('HSET', K_NAMES, addr, name)
  if (current && keyOf(current) !== key) await kv('HDEL', K_KEYS, keyOf(current))
  return name
}
