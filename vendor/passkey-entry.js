// Bundled for the browser by `bun run build:passkey`; loaded lazily when a player creates or opens a passkey wallet.
// The SDK expects a few Node globals that browsers do not have.
const w = window
w.global = w.global || w
w.process = w.process || {
  env: { NODE_ENV: 'production' }, browser: true, version: '', versions: {}, platform: 'browser', argv: [], cwd: () => '/',
  nextTick: (fn, ...args) => setTimeout(() => fn(...args), 0), emitWarning: () => {}, on: () => {},
}

// Imported dynamically so the shims above run first and a failure while initialising is reported, not silent.
Promise.all([
  import('@circle-fin/modular-wallets-core'),
  import('viem'),
  import('viem/account-abstraction'),
])
  .then(([core, viem, aa]) => {
    w.ARC_PASSKEY = {
      WebAuthnMode: core.WebAuthnMode,
      toPasskeyTransport: core.toPasskeyTransport,
      toModularTransport: core.toModularTransport,
      toWebAuthnCredential: core.toWebAuthnCredential,
      toCircleSmartAccount: core.toCircleSmartAccount,
      createPublicClient: viem.createPublicClient,
      encodeFunctionData: viem.encodeFunctionData,
      createBundlerClient: aa.createBundlerClient,
      toWebAuthnAccount: aa.toWebAuthnAccount,
    }
  })
  .catch((e) => { w.ARC_PASSKEY_ERROR = String((e && (e.stack || e.message)) || e).slice(0, 400) })
