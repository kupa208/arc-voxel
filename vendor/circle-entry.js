// Bundled for the browser by `bun run build:circle`; loaded lazily when a player signs in with email.
// The SDK expects a few Node globals that browsers do not have.
const w = window
w.global = w.global || w
w.process = w.process || {
  env: { NODE_ENV: 'production' }, browser: true, version: '', versions: {}, platform: 'browser', argv: [], cwd: () => '/',
  nextTick: (fn, ...args) => setTimeout(() => fn(...args), 0), emitWarning: () => {}, on: () => {},
}

// Imported dynamically so the shims above run first and a failure while initialising is reported, not silent.
import('@circle-fin/w3s-pw-web-sdk')
  .then((m) => { w.ARC_CIRCLE = { W3SSdk: m.W3SSdk || (m.default && m.default.W3SSdk) || m.default } })
  .catch((e) => { w.ARC_CIRCLE_ERROR = String((e && (e.stack || e.message)) || e).slice(0, 400) })
