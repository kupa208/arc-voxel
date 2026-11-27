# Arc Voxel Quest

A 3D voxel survival game (Arc Voxel Quest) on **Arc Testnet** where your best runs live onchain: connect a wallet, play, save your score as a transaction, climb the leaderboard, win daily USDC seasons, and buy soulbound upgrade NFTs with ARCQ (each level widens your item pickup range).

Built with [Arc Studio](https://studio.arc.io)

## What you can do

- **Play** an endless run with 10 heroes and 12 maps (English and Vietnamese). Each map has its own background music, generated in the browser (the sound button or the M key turns it off).
- **Practice for free:** play without a wallet or an account. A short how-to-play screen appears before the first run (and from the ❔ button). Practice runs are never saved; sign in to save a run onchain.
- **Connect** MetaMask, OKX, Rabby, Coinbase, Trust, Bitget, Phantom, Rainbow, Zerion or Brave. Arc Testnet is added for you.
- **Sign in with email:** enter your Gmail (or any email), type the one-time code Circle sends you, set a PIN once and your Arc wallet is created. Gas is sponsored, and you approve each transaction with your PIN. If you lose the PIN nobody can recover the wallet.
- **Save a run onchain** for free (the game pays the gas) or with your own wallet. Only runs with a transaction appear on the leaderboard, each with a link to its transaction.
- **Sign in with Google (optional):** one tap on "Continue with Google", no code to type. You still set a PIN once. It needs a Google OAuth client ID (see `GOOGLE_CLIENT_ID`). A Google sign-in creates its own wallet, separate from an email-code wallet of the same address.
- **Daily seasons:** enter for 1 USDC, the top 3 split the pool.
- **Daily quests and streaks** pay ARCQ automatically when you save a run. **Badges** start at 10 points (13 tiers), so your first badge comes in your first runs.
- **Battle Pass:** 30 levels over 30 days with a free and a premium track (3 USDC, paid into the prize pool), plus weekly quests. XP comes from saved runs and quests.
- **Shop:** pickup-range upgrades, cosmetic skins and trail effects (no gameplay bonus), and two heroes (Lecter, Teddyz) you unlock once with ARCQ. Rewards and unlocks are not pay-to-win.
- **Seasons:** the prize rules are readable on the contract, and an empty season's pool rolls into the next one on its own.
- **Hero upgrades** and **skins** (soulbound NFTs) burn ARCQ. Badge NFTs show your best tier.
- **Nickname:** set a 3-16 character nickname (Wallet & Stats tab, or the box above the hero list) so the leaderboard shows your name instead of your wallet address. It is tied to your wallet and unique per player.
- **Combat:** a larger map, enemies that arrive in packs, pincers and rings, new enemy types (swarmers, bruisers, splitters), bosses that get angry at half health, red spiky enemy bullets (nothing you collect looks like them), damage numbers, and a fixed status card (health, coins, level, upgrades). Upgrades sit in a corner panel and are tagged Attack, Defense or Growth.
- **Game modes:** Ranked (saved onchain), Endless (no end, a heal every 5 waves) and Boss Rush (5 bosses in a row, fastest time wins). Endless and Boss Rush have their own boards kept by the game server, not onchain.
- **Leaderboards:** all time, today, this week and a friends board (add friends by wallet address or nickname).
- **Save rule:** a run is saved onchain only if it lasted 60 seconds or reached 200 points.
- **Settings (⚙):** low graphics for phones and a colour-blind mode for enemy bullets. Terms and privacy pages are at `/terms` and `/privacy`.
- **Guardian admin page** at `/admin`: pause or resume the game and change the ticket signer with the guardian wallet.
- **Share** your score as an image with a link to your transaction, or post it on X.

## Tech stack

Three.js game in plain JavaScript, a Bun server (anti-cheat tickets, free-gas relayer, onchain leaderboard indexer), and a Solidity contract (`contracts/ArcVoxelGameFi.sol`) on Arc Testnet.

## Development

Prerequisites: [Bun](https://bun.sh), and [Foundry](https://getfoundry.sh) if you change the contract.

```bash
bun install
bun run build     # bundles the WalletConnect helper and rebuilds index.html
bun start         # http://localhost:5173
```

The game page needs the server (login, anti-cheat tickets, leaderboard). Host it where Bun runs (a `Dockerfile` is included) or deploy it to Vercel (see below).

### Deploy to Vercel

The whole game runs on Vercel: the page is static (`public/`) and one serverless function (`api/index.mjs`) serves the API. Sign-in sessions and runs are signed tokens, so the function keeps nothing in memory, and the leaderboard is refreshed from the chain on demand.

1. Run `bun run build` after any change to the game or `web3-config.json` (Vercel only copies the prebuilt page).
2. Import the repository in Vercel (no framework preset; `vercel.json` sets the build and routes).
3. Add the environment variables below in the Vercel project settings: `GAME_SIGNER_PRIVATE_KEY` (required), plus `CIRCLE_API_KEY` and `CIRCLE_EMAIL_OTP=on` for email sign-in.
4. Recommended: add the **Upstash Redis** integration from the Vercel Marketplace (free plan available). It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which keep nicknames and the leaderboard cache across restarts. Without it, nicknames are lost whenever the function restarts.

### Environment variables

Put these in `.env.local` (git-ignored). Never commit them.

| Name | Purpose |
| --- | --- |
| `GAME_SIGNER_PRIVATE_KEY` | Required. Signs run tickets the contract accepts. |
| `RELAYER_PRIVATE_KEY` | Optional. Hot wallet that pays gas for free saves. Fund it with a little testnet USDC. |
| `CIRCLE_API_KEY` | Optional. A Circle Standard Developer API Key. Needed for email sign-in. It stays on the server. |
| `CIRCLE_EMAIL_OTP` | Optional. Set to `on` to show "Sign in with email". Before turning it on, add an SMTP email provider (SendGrid, Mailgun, Amazon SES or Resend; Mailtrap only captures mail) in Circle Console under Wallets, User Controlled, Configurator, Authentication Methods, Email OTP. |
| `GOOGLE_CLIENT_ID` | Optional. Google OAuth client ID (Web application) that enables "Continue with Google". Needs `CIRCLE_API_KEY`. In Google Cloud add your game address to Authorized JavaScript origins and Authorized redirect URIs, and add the same client ID in Circle Console under Wallets, User Controlled, Configurator, Authentication Methods, Social Logins. |
| `WALLETCONNECT_PROJECT_ID` | Optional. Shows the WalletConnect row for phone wallets. |
| `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS` | Optional outside Arc Studio. Provided by Arc Studio for RPC access. |
| `RPC_URL_Arc_Testnet` | Optional. Your own RPC endpoint for the leaderboard indexer. |
| `PORT` | Optional. Server port (default 5173). |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Optional. Upstash Redis for nicknames and the leaderboard cache on hosts without a disk (set by Vercel's Upstash integration). `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work. |
| `TOKEN_SECRET` | Optional. Secret for signed sign-in sessions on Vercel. Defaults to a value derived from `GAME_SIGNER_PRIVATE_KEY`. |
| `GAME_STATELESS` | Optional. Set to `1` to run the Bun server in the same stateless mode as Vercel. |
| `GAME_MIN_SAVE_SECONDS` / `GAME_MIN_SAVE_POINTS` | Optional. A run is saved onchain only if it lasted this many seconds (default 60) or reached this many points (default 200). |
| `GAME_MODES_FILE` | Optional. Where Endless and Boss Rush results are stored when no shared Redis is set (default `.data/modes.json`). |
| `GAME_NICKNAME_FILE` | Optional. Where leaderboard nicknames are stored (default `.data/nicknames.json`). |

### Tests

```bash
bun run test:local    # starts a local chain and the server, runs the full game flow (needs Foundry's anvil)
bun run test:email    # email sign-in backend checks (no network or keys needed)
bun run test:vercel   # Vercel entry point checks under Node (no network or keys needed)
forge build           # compile the contract
```

### Operations

- `GET /api/health` reports indexer status and whether the relayer wallet is funded.
- `bun scripts/backup.mjs` copies the server's non-secret state to `backups/`.
- `bun scripts/guardian.mjs status | pause | unpause | set-guardian | set-signer` manage the contract's admin role. See `DEPLOY_ARC.md`.

## Notes

- The anti-cheat checks that a run is plausible; it cannot prove honest play. Do not put real value in prize pools.
- Older files in the repository root (`build-dapp.mjs`, `serve-dapp.mjs`, `verify-all.mjs`) belong to the first version of the project and are not used any more.
