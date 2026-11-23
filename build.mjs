#!/usr/bin/env node
/**
 * Build the single-file game page: index.html
 * Inputs: vendor/three.js, vendor/game-boot.json, web3-config.json, arc-web3.js, music.js, game.js
 * vendor/walletconnect.js is lazy-loaded (served by server.mjs) when a player picks WalletConnect: `bun run build:wc`.
 * Run: bun run build (WalletConnect bundle + this script)
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const read = (f) => readFile(join(root, f), 'utf8')

const inlineSafe = (text) => text.replace(/<\/(script)/giu, '<\\/$1').replace(/<!--/gu, '<\\!--')

const three = await read('vendor/three.js')
const boot = JSON.parse(await read('vendor/game-boot.json'))
const web3Config = JSON.parse(await read('web3-config.json'))
// The project logo: drop the exact file at vendor/logo.svg (or .png/.webp/.jpg) and rebuild to use it on the upgrade NFTs.
let logoUri = ''
for (const [ext, mime] of [['svg', 'image/svg+xml'], ['png', 'image/png'], ['webp', 'image/webp'], ['jpg', 'image/jpeg']]) {
  try { logoUri = `data:${mime};base64,` + (await readFile(join(root, `vendor/logo.${ext}`))).toString('base64'); break } catch { /* not provided */ }
}
const web3Code = await read('arc-web3.js')
const musicCode = await read('music.js')
const gameCode = await read('game.js')

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:*",
].join('; ')

const style = 'html,body{margin:0;width:100%;height:100%;height:100dvh;overflow:hidden;background:#09132b;user-select:none;-webkit-user-select:none;overscroll-behavior:none}'
  + 'canvas{display:block;width:100vw;height:100vh;height:100dvh;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}'

const html = [
  '<!doctype html>',
  '<html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
  `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
  `<title>${boot.title} · Arc L1 GameFi</title>`,
  `<style>${style}</style></head><body><canvas id="game" tabindex="0"></canvas>`,
  `<script>${inlineSafe(three)}</script>`,
  `<script>window.ARC_WEB3_CONFIG=${inlineSafe(JSON.stringify(web3Config))};window.GAME=${inlineSafe(JSON.stringify(boot))};window.GAME_LOGO=${inlineSafe(JSON.stringify(logoUri))};</script>`,
  `<script>${inlineSafe(web3Code)}</script>`,
  `<script>${inlineSafe(musicCode)}</script>`,
  `<script>${inlineSafe(gameCode)}</script>`,
  '</body></html>',
  '',
].join('\n')

await writeFile(join(root, 'index.html'), html, 'utf8')
console.log(JSON.stringify({ ok: true, file: 'index.html', bytes: Buffer.byteLength(html) }))
