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
  'frame-src https://*.circle.com', // Circle hosted windows (email code, PIN)
].join('; ')

// Link previews (Facebook, Zalo, Telegram...) and the browser tab icon.
const siteUrl = (process.env.SITE_URL || 'https://arc-voxel.vercel.app').replace(/\/+$/u, '')
let hasOgImage = false
try { await readFile(join(root, 'vendor/og.png')); hasOgImage = true } catch { /* drop a 1200x630 image at vendor/og.png to add a preview picture */ }
const description = 'Arc Voxel Quest: a 3D voxel survival game on Arc Testnet. Save your best runs onchain, climb the leaderboard and win daily USDC seasons.'
const favicon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38f2ff"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="#09132b"/><path d="M14 94 L36 94 L38 66 C39 50 44 40 52 40 C60 40 64 50 65 66 L67 94 L90 94 L84 56 C80 26 66 8 50 8 C34 8 20 26 16 56 Z" fill="url(#g)"/></svg>')
const metaTags = [
  `<meta name="description" content="${description}">`,
  '<meta name="theme-color" content="#09132b">',
  `<link rel="icon" href="${favicon}">`,
  '<meta property="og:type" content="website">',
  `<meta property="og:title" content="${boot.title} · Arc Testnet GameFi">`,
  `<meta property="og:description" content="${description}">`,
  `<meta property="og:url" content="${siteUrl}/">`,
  hasOgImage ? `<meta property="og:image" content="${siteUrl}/og.png">` : '',
  `<meta name="twitter:card" content="${hasOgImage ? 'summary_large_image' : 'summary'}">`,
  `<meta name="twitter:title" content="${boot.title} · Arc Testnet GameFi">`,
  `<meta name="twitter:description" content="${description}">`,
  hasOgImage ? `<meta name="twitter:image" content="${siteUrl}/og.png">` : '',
].filter(Boolean).join('')

const style = 'html,body{margin:0;width:100%;height:100%;height:100dvh;overflow:hidden;background:#09132b;user-select:none;-webkit-user-select:none;overscroll-behavior:none}'
  + 'canvas{display:block;width:100vw;height:100vh;height:100dvh;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}'

const html = [
  '<!doctype html>',
  '<html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
  `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
  `<title>${boot.title} · Arc L1 GameFi</title>`,
  metaTags,
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
