# Deploy `ArcVoxelGameFi.sol` to Arc Testnet (L1)

## Network Info (Arc Testnet)
- **Network Name:** `Arc Testnet`
- **Chain ID:** `5042002` (`0x4cef52`)
- **Native Gas Token:** `USDC` (18 decimals at the EVM native gas layer)
- **Public RPC:** `https://rpc.testnet.arc.io`
- **Explorer:** https://explorer.testnet.arc.io/
- **Faucet (Test USDC):** https://faucet.circle.com/

---

## Option 1 — Quick Deploy via Remix IDE + MetaMask (No CLI needed)
1. Get testnet `USDC` gas from [faucet.circle.com](https://faucet.circle.com/).
2. Open [remix.ethereum.org](https://remix.ethereum.org/), create `ArcVoxelGameFi.sol`, and paste [ArcVoxelGameFi.sol](./ArcVoxelGameFi.sol).
3. In **Solidity Compiler**, choose `0.8.20` (or newer `0.8.x`) and compile.
4. In **Deploy & Run Transactions**, choose **Injected Provider - MetaMask**, switch MetaMask to **Arc Testnet** (Chain ID `5042002`), select contract `ArcVoxelGameFi`, and click **Deploy**.
   - `ArcVoxelGameFi` automatically deploys `ArcExplorerBadge` (ERC-721) in the same transaction!
5. Copy the deployed `ArcVoxelGameFi` contract address:
   - Paste it directly into the **Web3 / Arc L1 -> Contract Address** input in the game UI, **or**
   - Put it in `web3/web3-config.json` (`defaultContract`) and re-run `node build-dapp.mjs`.

## Option 2 — Deploy via Foundry (`forge`)
```bash
forge create contracts/ArcVoxelGameFi.sol:ArcVoxelGameFi \
  --rpc-url https://rpc.testnet.arc.io \
  --private-key <YOUR_TESTNET_PRIVATE_KEY>
```

---

## Tiếng Việt — Hướng dẫn Deploy lên Arc Testnet
1. Nhận `USDC` testnet làm phí gas tại [faucet.circle.com](https://faucet.circle.com/).
2. Mở [remix.ethereum.org](https://remix.ethereum.org/), nạp file [ArcVoxelGameFi.sol](./ArcVoxelGameFi.sol) và biên dịch với Solidity `0.8.20+`.
3. Chọn **Injected Provider - MetaMask**, chuyển ví sang **Arc Testnet** (`5042002`), chọn contract `ArcVoxelGameFi` rồi bấm **Deploy**.
   - Contract sẽ tự khởi tạo token thưởng `ARCQ` (ERC-20), bảng xếp hạng on-chain, và contract huy hiệu `ARCB` (ERC-721) chỉ trong 1 giao dịch.
4. Dán địa chỉ contract vừa deploy vào ô **Địa chỉ Contract** ngay trong panel **Web3 / Arc L1** của game (hoặc cập nhật `web3/web3-config.json` rồi chạy `node build-dapp.mjs`).

---

---

## GameFi v5 (current) on Arc Testnet

- `ArcVoxelGameFi`: `0xed4b23b962ce958d5f68cc779fe68eaa935986ae` ([explorer](https://explorer.testnet.arc.io/address/0xed4b23b962ce958d5f68cc779fe68eaa935986ae)). Replaces v4 (`0xb70f...9490`), v3 (`0x21ad...7acc`), v2 and v1, which are no longer used. State starts empty.
- Constructor: `(signer, guardian, usdc)`. `usdc` is `0x3600000000000000000000000000000000000000` (6-decimal ERC-20 view of Arc's native USDC).
- Signer (server key, public address): `0xf738F60756290E1601b901f4d35af5731f58f8B2`. The private key lives only in `.env.local` as `GAME_SIGNER_PRIVATE_KEY` (git-ignored). The signer can only sign run tickets.
- Guardian: also `0xf738...f8B2` for now. The guardian alone can pause, unpause, rotate the signer and rotate itself. Pause blocks new runs, season entries and room create/join only: prize claims, refunds, upgrades, skin purchases and transfers keep working. **Hand the guardian role to a separate wallet you control** (a hardware wallet or multisig is best) with `bun scripts/guardian.mjs set-guardian 0xYourWallet`. The signer wallet needs a little USDC for gas. Whoever holds the guardian role is trusted over scoring, because it can appoint a new signer.
- Free-gas relayer: `0xC440c1B2a71560098803f9511830dc14beCc97c0` (key in `.env.local` as `RELAYER_PRIVATE_KEY`). It pays gas to save validated runs for players, limited to 10 free saves per player and 300 in total per day, and pauses itself when its USDC runs low. Top it up with testnet USDC when `/api/health` reports `relayer.funded: false`.

### What v5 changes
- **Slower ARCQ:** 0.05 ARCQ per point (was 0.2). Daily quests pay 5 ARCQ x streak (max 7) for the first run, 15 ARCQ for the third run and 30 ARCQ once per day for a run of 1,000+ points: at most 80 ARCQ a day.
- **Eight score badges plus Champion:** Scout 300, Vanguard 700, Striker 1,500, Sentinel 3,000, Warlord 6,000, Titan 12,000, Overlord 25,000 and Arc Legend 40,000 onchain points (best single run; onchain points = game score / 20). The season winner earns Champion (tier 9). A badge a player transferred away is re-issued at their earned tier on their next saved run.
- **Upgrade NFT bonus grows per level:** +4%, +6%, +8%, +10%, +12%, +15% pickup range (total +55% at level 6).

### What v4 added
- **Runs carry wave and hero**, shown on the leaderboard and in the profile.
- **Daily quests and streaks** are paid automatically when a run is saved (first run: 20 ARCQ x streak up to 7; 3 runs: 50 ARCQ; one run of 1,000+ points: 100 ARCQ).
- **Upgrade NFTs (the shop):** six soulbound NFTs (1,000 to 12,000 ARCQ, burned), bought in order. Every NFT owned is one level and each level widens the item pickup range by 20% (up to +120%). An owned NFT can also tint your hero. The contract's older `upgradeHero` function is no longer used by the game.
- **Rooms (not shown in the game any more):** the contract still supports USDC tournaments, but the game no longer offers them. Anyone could open a USDC tournament (0.1 to 100 USDC fee, 1 hour to 7 days). The best run inside the window wins (60/40 or 50/30/20); a room nobody scored in refunds every entrant.
- **Anyone may submit a signed ticket for its player**, which is what lets the relayer save runs for free. Rewards always go to the ticket's player.

### How the game economy works
- **Signed runs (anti-cheat):** `bun server.mjs` times each run, checks the game's telemetry checkpoints (score, kills, gems and wave over time must be consistent and plausible), and signs a ticket only for plausible runs. Rejected runs are logged in `.data/rejected-runs.jsonl`. The contract accepts a run only with a valid, unused ticket for that player and that season (tickets also expire before the season ends). This is plausibility checking, not a replay of the game.
- **Daily season:** entry fee 1 USDC goes to the prize pool. After the season ends, the top 3 split it 50/30/20 (60/40 with two players, all to one). Anyone can trigger `claimPrize`. An empty season's pool can be rolled into the current season.
- **ARCQ rewards:** 0.2 ARCQ per onchain point, capped at 100,000 points per player per day. Runs and season scores still count after the cap.
- **ARCQ sink:** hero upgrades burn ARCQ (500, 1000, 2000, 4000, 8000). Levels 2 and 4 add a heart, every level adds pickup range.
- **Badges:** Bronze/Silver/Gold by best score, Champion for season winners, with on-chain SVG art.

### Run locally
```bash
bun server.mjs 5173            # game + anti-cheat API
node build.mjs                 # rebuild index.html after editing game.js / arc-web3.js / web3-config.json
bun contracts/test-integration/gamefi-local.ts   # end-to-end test on a local anvil chain
```
The game page needs the API from `server.mjs`, so host it where a Bun server can run, not on static-only hosting.

### Login and wallets
- Players connect a browser wallet (MetaMask, OKX, Rabby, Coinbase, Trust, Bitget, Phantom, Rainbow, Zerion, Brave). The game adds Arc Testnet to the wallet and asks for one free signature (no gas) to log in. Every game action is a transaction the player's own wallet signs.
- Gas is paid in USDC from the player's wallet. Players fund it from https://faucet.circle.com using their wallet address.
- Required in `.env.local` (git-ignored): `GAME_SIGNER_PRIVATE_KEY` (anti-cheat ticket signer).
- **Passkey wallets (Circle Modular Wallets):** needs `CIRCLE_CLIENT_KEY` in `.env.local`. In Circle Console (Testnet): Keys > Client Keys > create a key and set **Allowed Domain** to the game's exact hostname (no `https://`, no path); Wallets > Modular Wallets > Passkey > set **Domain Name** to the same hostname. Players create a smart account on Arc Testnet with a fingerprint, face or Windows Hello, confirm every transaction in the game's confirmation dialog and then with the passkey, and Circle's Gas Station sponsors the gas. The game server verifies the sign-in with ERC-1271 / ERC-6492, so it works before the account is deployed. A passkey is bound to the hostname: a new hostname needs the two Console fields updated, and wallets created under the old hostname cannot be opened from the new one.
- Optional in `.env.local`: `WALLETCONNECT_PROJECT_ID` (free Project ID from https://cloud.reown.com) shows the WalletConnect row for phone wallets.
- Rebuild after editing the game: `bun run build`. Start the server with `bun start`. The game needs `server.mjs` for login and anti-cheat tickets, so host it where Bun can run.

### Connect wallet dialog
- One "Connect Wallet" button in the game's top bar opens the dialog. Installed wallets connect directly, others link to their download page.

### Arc onchain leaderboard (verified onchain only)
- The game's Arc onchain leaderboard lists each wallet's best run that exists as a transaction on Arc Testnet, with a link to that transaction. There is no on-device ranking and no placeholder players.
- `indexer.mjs` (started by `server.mjs`) reads the contract's `RunSubmitted` events from the deployment block (`deployTxHash` in `web3-config.json`) and stores progress in `.data/` (git-ignored). If you redeploy the contract, update `defaultContract` and `deployTxHash` in `web3-config.json`, run `bun run build`, and restart the server: the board starts empty for the new contract.

### Guardian tools
`bun scripts/guardian.mjs status | pause | unpause | set-guardian 0x... | set-signer 0x...`

### Hosting
`bun server.mjs` serves the game, the API and the indexer. A `Dockerfile` is included (port 7860 by default); pass `GAME_SIGNER_PRIVATE_KEY` and optionally `RELAYER_PRIVATE_KEY` as environment variables. Keep `.data/` on a persistent volume or run `bun scripts/backup.mjs` regularly. If you redeploy the contract, update `defaultContract` and `deployTxHash` in `web3-config.json`, run `bun run build`, and restart.
