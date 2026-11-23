# Arc Voxel Quest

A 3D voxel survival game (Arc Voxel Quest) on **Arc Testnet** where your best runs live onchain: connect a wallet, play, save your score as a transaction, climb the leaderboard, win daily USDC seasons, and buy soulbound upgrade NFTs with ARCQ (each level widens your item pickup range).

Built with [Arc Studio](https://studio.arc.io)

## What you can do

- **Play** an endless run with 5 heroes and 12 maps (English and Vietnamese). Each map has its own background music, generated in the browser (the sound button or the M key turns it off).
- **Connect** MetaMask, OKX, Rabby, Coinbase, Trust, Bitget, Phantom, Rainbow, Zerion or Brave. Arc Testnet is added for you.
- **Save a run onchain** for free (the game pays the gas) or with your own wallet. Only runs with a transaction appear on the leaderboard, each with a link to its transaction.
- **Daily seasons:** enter for 1 USDC, the top 3 split the pool.
- **Daily quests and streaks** pay ARCQ automatically when you save a run.
- **Hero upgrades** and **skins** (soulbound NFTs) burn ARCQ. Badge NFTs show your best tier.
- **Share** your score as an image with a link to your transaction.

## Tech stack

Three.js game in plain JavaScript, a Bun server (anti-cheat tickets, free-gas relayer, onchain leaderboard indexer), and a Solidity contract (`contracts/ArcVoxelGameFi.sol`) on Arc Testnet.

## Development

Prerequisites: [Bun](https://bun.sh), and [Foundry](https://getfoundry.sh) if you change the contract.

```bash
bun install
bun run build     # bundles the WalletConnect helper and rebuilds index.html
bun start         # http://localhost:5173
```

The game page needs the server (login, anti-cheat tickets, leaderboard), so host it where Bun runs. A `Dockerfile` is included.

### Environment variables

Put these in `.env.local` (git-ignored). Never commit them.

| Name | Purpose |
| --- | --- |
| `GAME_SIGNER_PRIVATE_KEY` | Required. Signs run tickets the contract accepts. |
| `RELAYER_PRIVATE_KEY` | Optional. Hot wallet that pays gas for free saves. Fund it with a little testnet USDC. |
| `CIRCLE_CLIENT_KEY` | Optional. A Circle Modular Wallets Client Key (starts with `TEST_CLIENT_KEY:`). Enables passkey wallets: players create a wallet with a fingerprint, face or Windows Hello and confirm each transaction with it, with gas sponsored. In Circle Console set the key's Allowed Domain and the Passkey Domain Name to your game's hostname. |
| `WALLETCONNECT_PROJECT_ID` | Optional. Shows the WalletConnect row for phone wallets. |
| `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS` | Optional outside Arc Studio. Provided by Arc Studio for RPC access. |
| `RPC_URL_Arc_Testnet` | Optional. Your own RPC endpoint for the leaderboard indexer. |
| `PORT` | Optional. Server port (default 5173). |

### Tests

```bash
bun run test:local    # starts a local chain and the server, runs the full game flow (needs Foundry's anvil)
forge build           # compile the contract
```

### Operations

- `GET /api/health` reports indexer status and whether the relayer wallet is funded.
- `bun scripts/backup.mjs` copies the server's non-secret state to `backups/`.
- `bun scripts/guardian.mjs status | pause | unpause | set-guardian | set-signer` manage the contract's admin role. See `DEPLOY_ARC.md`.

## Notes

- The anti-cheat checks that a run is plausible; it cannot prove honest play. Do not put real value in prize pools.
- Older files in the repository root (`build-dapp.mjs`, `serve-dapp.mjs`, `verify-all.mjs`) belong to the first version of the project and are not used any more.
