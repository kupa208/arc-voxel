// Headless smoke test for the game page. It loads index.html in happy-dom with a fake WebGL renderer, so the whole game logic runs
// without a GPU: it plays a few seconds with every hero, both extra modes and the settings toggles, and fails on any script error.
// It checks logic only, not what the picture looks like. Setup: `npm i --no-save happy-dom`, start the server, then `node scripts/game-smoke.mjs`.
import { Window } from 'happy-dom'
import { readFileSync } from 'node:fs'
let html = readFileSync('/home/user/app/index.html', 'utf8')
const marker = html.indexOf('/* three.js 0.187.0'); const scriptEnd = html.indexOf('</script>', marker)
const fake = `<script>
const Fake = class FakeRenderer { constructor(o){this.domElement=o&&o.canvas;this.shadowMap={};this.extensions={has(){return false}};this.debug={};this.capabilities={};this.info={render:{}}}
 setPixelRatio(){} setSize(){} setClearColor(){} render(){window.__renders=(window.__renders||0)+1} getDrawingBufferSize(v){v.set(800,600);return v} setRenderTarget(){} getContext(){return {}} dispose(){} compile(){} }
window.THREE = Object.assign({}, window.THREE, { WebGLRenderer: Fake })
</script>`
html = html.slice(0, scriptEnd + 9) + fake + html.slice(scriptEnd + 9)

async function scenario(label, setup) {
  const window = new Window({ url: 'http://localhost:5173/', width: 1280, height: 760, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } })
  const ctxStub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : ctxStub()), apply: () => ctxStub(), set: () => true })
  window.HTMLCanvasElement.prototype.getContext = function () { return ctxStub() }
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,'
  const errors = []
  window.addEventListener('error', (e) => errors.push('window.error: ' + (e.message || e.error)))
  window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + (e.reason && e.reason.message || e.reason)))
  window.console.error = (...a) => errors.push('console.error: ' + a.map(String).join(' ').slice(0, 300))
  window.fetch = async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' })
  window.localStorage.setItem('arc-voxel-quest:tutorial', '1')
  window.document.write(html)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  await sleep(800)
  const key = (type, code, k) => window.dispatchEvent(new window.KeyboardEvent(type, { code, key: k || code, bubbles: true }))
  const buttons = () => [...window.document.querySelectorAll('button')]
  const clickText = (re) => { const b = buttons().find((x) => re.test(x.textContent || '')); if (b) { b.click(); return true } return false }
  async function play(ms) { for (let t = 0; t < ms; t += 700) { key('keydown', 'KeyD', 'd'); await sleep(250); key('keyup', 'KeyD', 'd'); key('keydown', 'KeyW', 'w'); await sleep(250); key('keyup', 'KeyW', 'w'); key('keydown', 'Space', ' '); key('keyup', 'Space', ' '); await sleep(200) } }
  const info = await setup({ window, key, clickText, play, sleep })
  const st = window.__gameState && window.__gameState()
  const out = label + ': phase=' + (st && st.phase) + ' score=' + (st && st.score) + ' enemies=' + ((st && st.enemies) || []).length + ' ' + (info || '') + ' errors=' + JSON.stringify([...new Set(errors)].slice(0, 4))
  window.close && window.close()
  if (!/errors=\[\]/.test(out)) process.exitCode = 1
  return out
}
const heroNames = ['Toàn Nhữ', 'Xuân Hải', 'Elias J', 'Lily Hoang', 'Kien Trinh', 'Hieu Nguyen', 'Quoc Vuong', 'Miley Nguyen', 'Lecter', 'Teddyz']
for (const name of heroNames) {
  console.log(await scenario(name, async (c) => { const picked = c.clickText(new RegExp(name.replace(/ /g, '\\s*'))); await c.sleep(150); c.key('keydown', 'Enter', 'Enter'); c.key('keyup', 'Enter', 'Enter'); await c.sleep(300); await c.play(3500); return 'picked=' + picked }))
}
for (const mode of ['Endless|Vô tận', 'Boss Rush']) {
  console.log(await scenario('mode ' + mode, async (c) => { const picked = c.clickText(new RegExp(mode)); await c.sleep(150); c.key('keydown', 'Enter', 'Enter'); c.key('keyup', 'Enter', 'Enter'); await c.sleep(300); await c.play(5000); return 'picked=' + picked }))
}
console.log(await scenario('settings', async (c) => { const gear = [...c.window.document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '⚙'); gear.click(); await c.sleep(100); c.window.document.querySelectorAll('input[type=checkbox]').forEach((x) => { x.checked = !x.checked; x.dispatchEvent(new c.window.Event('change', { bubbles: true })) }); await c.sleep(300); c.key('keydown', 'Enter', 'Enter'); c.key('keyup', 'Enter', 'Enter'); await c.play(3000); return 'toggled' }))
process.exit(process.exitCode || 0)
