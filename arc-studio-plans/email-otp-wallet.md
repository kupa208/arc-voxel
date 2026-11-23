## Implementation Plan: Sign in with email (Circle Email OTP wallets)

### Summary
Players type their Gmail, Circle emails them a one-time code, they enter it in Circle's hosted window, set a PIN once, and get a smart-contract wallet on Arc Testnet whose gas is sponsored. The wallet is non-custodial: every transaction is approved with the player's PIN after a confirmation dialog in the game. It sits next to the existing passkey wallets and browser wallets.

### Architecture
- Blockchain: Arc Testnet (chain 5042002). Wallets are SCA (smart contract accounts) because Circle's Gas Station sponsors gas for SCA wallets on Arc Testnet through a testnet policy that Circle pre-configures (limit: 50 USDC per day for the whole Circle account). Newcomers never need USDC for gas. EOA wallets are not used.
- Contract: no change. The deployed game contract (0xed4b23...86ae) accepts any address; the relayer, indexer and anti-cheat keep working.
- Backend (server.mjs plus new email-wallet.mjs): server-side `@circle-fin/user-controlled-wallets` with `CIRCLE_API_KEY` from `.env` (never sent to the browser). Endpoints: POST /api/email/request-otp (createDeviceTokenForEmailLogin), /api/email/initialize (listWallets or createUserPinWithWallets SCA ARC-TESTNET -> PIN-setup challenge), /api/email/session (prove userToken by listing wallets, then create a normal game session for that address), /api/email/challenge (contract-execution challenge for PIN approval), /api/email/last-tx. Allowlist: only the game contract and USDC approve(game) with fixed selectors. Abuse protection: per-email and per-IP rate limits, email validation, hashed emails in logs, Circle error codes mapped to friendly messages (155130/155131, 155133/155134, 155146, 155104).
- Frontend: arc-web3.js gets a lazy Circle web SDK bundle (/vendor/circle-sdk.js with Node-globals shim and async init), the email OTP flow (getDeviceId, request code, updateConfigs, verifyOtp, initialize, execute PIN setup, create session) and a `pin` transaction path reusing buildAction + sdk.execute. game.js gets an "Sign in with email" section at the top of the Connect dialog, reuses the in-game confirmation dialog before the PIN window, shows masked email and "PIN wallet - gas sponsored". CSP gains frame-src https://*.circle.com. userToken/encryptionKey are kept in sessionStorage only; on expiry the game asks for a new code.
- Wallet: connection options stay passkey and browser wallets; email wallets are a third kind (ConnectKit is not used in this project).

### What the owner must configure
1. An SMTP email provider (Host, Port, Username, Password, verified From address). For real Gmail inboxes use SendGrid, Mailgun, Amazon SES or Resend SMTP. Mailtrap's Email Sandbox only captures mail and never reaches Gmail.
2. Circle Console -> Wallets -> User Controlled -> Configurator -> Authentication Methods -> Email OTP: enter the SMTP settings and save.
3. `CIRCLE_API_KEY` is already provisioned in `.env`; do not move it to a browser-facing file.
4. Add `CIRCLE_EMAIL_OTP=on` to `.env.local` and restart the server (the Email button stays hidden until then).
5. Gas Station: nothing on testnet (default policy active). Mainnet needs a policy and billing.
6. A test email address the owner controls for the first end-to-end test.

### Files to Create/Modify
1. package.json: add @circle-fin/user-controlled-wallets and @circle-fin/w3s-pw-web-sdk, plus a build:circle script.
2. vendor/circle-entry.js (new): browser bundle entry with Node-globals shim and async SDK import.
3. build.mjs: include the bundle, add frame-src https://*.circle.com to the CSP.
4. email-wallet.mjs (new): Circle client (injectable fake for tests), rate limiting, allowlist, the five handlers.
5. server.mjs: routes, serve /vendor/circle-sdk.js, emailOtp flag in /api/config, assetVersion.
6. arc-web3.js: email OTP flow, `pin` transaction path, session restore and expiry handling, logout cleanup.
7. game.js: Connect dialog email section, EN/VI strings, error mapping, wallet tab text, "sign in again" banner.
8. contracts/test-integration/gamefi-local.ts: tests for validation, rate limiting, allowlist, session creation with a fake Circle client.
9. README.md, DEPLOY_ARC.md: setup steps and the env flag.

### Build Sequence
1. Install both Circle packages, create the bundle entry and build:circle, confirm the bundle loads in a bare environment without Node globals.
2. Write email-wallet.mjs with an injectable Circle client; wire routes and config into server.mjs.
3. Add rate limiter, email validation, error-code mapping and the allowlist; cover with tests using the fake client.
4. Add the email flow and `pin` transaction path to arc-web3.js, including token expiry and "sign in again".
5. Add the Connect dialog section, strings and wallet-tab changes in game.js; reuse the confirmation dialog before the PIN window.
6. Update CSP, docs and the build; run the full local test suite and a simulated-browser check with a fake SDK.
7. Restart the server and run the live check with the owner: request a code to their Gmail, enter it, set a PIN, save a run for free.

### Done When
- [ ] With CIRCLE_EMAIL_OTP=on and SMTP configured, entering a Gmail sends a real code and the hosted window accepts it.
- [ ] First sign-in creates a wallet after the PIN is set and the HUD shows its address; signing in again with the same email opens the same wallet.
- [ ] A season entry or NFT purchase shows the in-game confirmation, then the PIN window, then confirms onchain with no USDC needed for gas.
- [ ] The free-gas save button still works for email wallets.
- [ ] Wrong, expired and locked-out codes show clear messages and request spam is blocked by rate limits.
- [ ] The Circle API key never appears in the browser, logs or built index.html.
- [ ] Passkey and browser wallets still work and the local test suite passes.

### Risks and trade-offs
- A PIN is required for every transaction (inherent to non-custodial Circle email wallets); passkey wallets remain the lower-friction option.
- A lost PIN or lost security answers means a lost wallet; Circle cannot recover it.
- SMTP quality decides success (spam folders, sender verification, provider limits); the OTP endpoint can be abused to email strangers through the owner's provider, so rate limits are mandatory (CAPTCHA can come later).
- Circle's hosted windows inside the preview frame are untested for this app; if blocked, report the exact error and fall back to opening the game in its own tab.
- Sponsored gas is capped at 50 USDC per day on Arc Testnet for the whole Circle account.

## Ready to build?
