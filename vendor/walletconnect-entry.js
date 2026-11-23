// Bundled for the browser by `bun run build:wc`; loaded lazily when a player picks WalletConnect.
const w = window
w.global = w.global || w
w.process = w.process || {
  env: { NODE_ENV: 'production' }, browser: true, version: '', versions: {}, platform: 'browser', argv: [], cwd: () => '/',
  nextTick: (fn, ...args) => setTimeout(() => fn(...args), 0), emitWarning: () => {}, on: () => {},
}

import('@walletconnect/ethereum-provider')
  .then((m) => { w.ARC_WC = { EthereumProvider: m.EthereumProvider } })
  .catch((e) => { w.ARC_WC_ERROR = String((e && (e.stack || e.message)) || e).slice(0, 400) })
