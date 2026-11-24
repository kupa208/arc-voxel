#!/usr/bin/env node
/**
 * Vercel build step: copies the prebuilt game page and its lazily loaded bundles into public/.
 * Run `bun run build` first whenever game.js, arc-web3.js or web3-config.json changed.
 */
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public')
await rm(out, { recursive: true, force: true })
await mkdir(join(out, 'vendor'), { recursive: true })
await copyFile(join(root, 'index.html'), join(out, 'index.html'))
for (const f of ['passkey.js', 'walletconnect.js', 'circle-sdk.js']) await copyFile(join(root, 'vendor', f), join(out, 'vendor', f))
console.log('public/ ready')
