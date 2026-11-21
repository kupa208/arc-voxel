#!/usr/bin/env node
/**
 * Build the Web3 dApp bundle (`dapp/index.html`) for Arc Voxel Quest.
 * Unlike `dist/index.html` (which locks `connect-src 'none'` for sandboxed offline playtests),
 * `dapp/index.html` injects `ARC_WEB3_CONFIG` + `ARC_WEB3` and permits RPC/wallet connections to Arc L1.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const threePath = join(root, '..', '..', '.agents', 'plugins', 'game-studio', 'vendor', 'three.js')

function inlineSafe(text) {
  return text.replace(/<\/(script)/giu, '<\\/$1').replace(/<!--/gu, '<\\!--')
}
function escapeHtml(text) {
  return text.replace(/[&<>"]/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}
function mimeOf(file) {
  const lower = file.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

const manifest = JSON.parse(await readFile(join(root, 'game.json'), 'utf8'))
const ledger = JSON.parse(await readFile(join(root, 'assets', 'ASSETS.json'), 'utf8').catch(() => '{"assets":{}}'))
const web3Config = JSON.parse(await readFile(join(root, 'web3', 'web3-config.json'), 'utf8'))
const web3Code = await readFile(join(root, 'web3', 'arc-web3.js'), 'utf8')
const threeCode = await readFile(threePath, 'utf8')
const gameCode = await readFile(join(root, 'game.js'), 'utf8')

const assets = {}
for (const [slot, spec] of Object.entries(manifest.slots || {})) {
  const buf = await readFile(join(root, spec.file))
  assets[slot] = `data:${mimeOf(spec.file)};base64,${buf.toString('base64')}`
}

const gameBoot = {
  title: manifest.title,
  rules: manifest.rules,
  slots: Object.fromEntries(
    Object.entries(manifest.slots || {}).map(([slot, spec]) => [
      slot,
      { tile: spec.tile === true, custom: Boolean(ledger?.assets?.[slot] && ledger.assets[slot].source !== 'template') },
    ]),
  ),
  assets,
}

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:*",
].join('; ')

const style = 'html,body{margin:0;width:100%;height:100%;height:100dvh;overflow:hidden;background:#09132b;user-select:none;-webkit-user-select:none;overscroll-behavior:none}'
  + 'canvas{display:block;width:100vw;height:100vh;height:100dvh;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}'

const html = [
  '<!doctype html>',
  '<html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
  `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
  `<title>${escapeHtml(manifest.title)} · Arc L1 GameFi</title>`,
  `<style>${style}</style></head><body><canvas id="game" tabindex="0"></canvas>`,
  `<script>${inlineSafe(threeCode)}</script>`,
  `<script>window.ARC_WEB3_CONFIG=${inlineSafe(JSON.stringify(web3Config))};window.GAME=${inlineSafe(JSON.stringify(gameBoot))};</script>`,
  `<script>${inlineSafe(web3Code)}</script>`,
  `<script>${inlineSafe(gameCode)}</script>`,
  '</body></html>',
  '',
].join('\n')

await mkdir(join(root, 'dapp'), { recursive: true })
const outFile = join(root, 'dapp', 'index.html')
await writeFile(outFile, html, 'utf8')
console.log(JSON.stringify({ ok: true, file: outFile, bytes: Buffer.byteLength(html) }))
