#!/usr/bin/env bun
/**
 * Copies the server's non-secret state (.data: indexer progress, sessions, rejected runs) to backups/<timestamp>/.
 * Secrets (.env, .env.local) are never copied: store those in your own secret manager.
 *   bun scripts/backup.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, '.data')
if (!existsSync(src)) { console.log('Nothing to back up yet (.data does not exist).'); process.exit(0) }
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const dest = join(root, 'backups', stamp)
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
const all = readdirSync(join(root, 'backups')).sort()
for (const old of all.slice(0, Math.max(0, all.length - 14))) rmSync(join(root, 'backups', old), { recursive: true, force: true }) // keep the newest 14
console.log('Backed up to', dest)
