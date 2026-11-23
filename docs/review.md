# Arc Voxel Quest: full review

Scope: smart contract (`ArcVoxelGameFi.sol`, deployed on Arc Testnet), game server (`server.mjs`), onchain leaderboard indexer (`indexer.mjs`), wallet client (`arc-web3.js`), game UI (`game.js`), build and dependencies, secrets handling.

## How it was checked
- Contract: security review at the deepest level (rule-based review plus a separate review of intent, abuse and economics), Slither static analysis, and 21 end-to-end checks on a local chain (signed runs, replay, season entry, prize split, hero upgrade burn, badge metadata, indexed leaderboard).
- Server and client: line-by-line read of the login, anti-cheat, ticket, indexer and transaction flows, plus a simulated browser wallet (list wallets, add Arc Testnet, sign in, start a run, restore after reload, disconnect).
- Dependencies: `bun audit`. Secrets: search of tracked files, built `index.html` and git ignore rules.

## Fixed in this review

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Medium | The leaderboard API returned the indexer's internal error text, which can contain the RPC URL and its access token | The API now returns only a healthy / not healthy flag. Details stay in server logs with URLs removed |
| 2 | Medium | Login challenges and per-wallet submission timers grew without limit, so an attacker could exhaust server memory | Expired challenges are pruned and every map is capped |
| 3 | Medium | `.env` was not in the project's `.gitignore` (it was only excluded locally), so pushing the repo could publish the Circle API key | `.env` added to `.gitignore` |
| 4 | High (contract) | A signed run could be saved and submitted in a later season, ranking in a competition it was not played in | Tickets now expire before the end of the current season. The contract itself should also bind the season (see below) |
| 5 | Low | No request body size limit | 16 KB limit |
| 6 | Low | Anyone could force a chain scan on every request through `?refresh=1` | Throttled to one forced scan per 2 seconds |
| 7 | Low | Claim status text (which can contain wallet or server error text) was written with `innerHTML` | Built with DOM nodes, so it cannot inject markup |
| 8 | High (dependency) | `zod` (inside WalletConnect, loaded only when WalletConnect is configured) can exhaust memory | Pinned to a fixed version. `bun audit` is clean. The WalletConnect bundle rebuilds, but it has not been run against a phone wallet |
| 9 | Low | Page allowed frames from any HTTPS site although the game uses none | Frames are no longer allowed by the page policy |
| 10 | Low | Local-test login shortcut had no warning if left on | The server logs a loud warning when it is enabled |

## Open findings (need a new contract version to fix)
The deployed contract cannot be edited. These apply to the current address and are fixed by deploying a new version (the leaderboard and season state start empty again).

| Severity | Finding | Recommended change |
|---|---|---|
| Critical (design) | One signer key decides every score. If it leaks, an attacker can enter several wallets and fabricate winning runs to collect other players' USDC entry fees. They cannot take funds beyond prizes for entrants | Keep the key offline-grade secret. In a new version add a pause switch, a separate recovery role, and threshold approval before prizes depend on scores. Do not rely on real-value prize pools with a single signer |
| High | The signed message does not include the season | Add the season number to the signed data and require it to equal the current season |
| Medium | ARCQ is far too plentiful: 1 ARCQ per point while all five upgrades cost 15,500 ARCQ in total, so one good run buys everything | Mint 0.1 ARCQ per point (or multiply upgrade costs by 10) and add a recurring sink (cosmetics, entry discounts) |
| Medium | If the USDC issuer blocklisted the contract, prizes for every season would freeze | Operational risk: document an incident plan; consider holding each season's pool separately |
| Medium | Revert messages are strings, not custom errors | Cosmetic gas and size saving |
| Low | `MetadataUpdate` event marks the token id as indexed, which differs from the NFT metadata-update standard | Remove `indexed` |

Slither found nothing real (its high-severity note about the leaderboard mapping is a known false positive).

## Known limitations (not fixed)
1. **Anti-cheat is plausibility checking, not proof.** The game runs in the browser, so the server cannot replay it. It limits how many points a run can claim per second of play and caps each run at 50,000 on-chain points. A determined cheater who waits long enough can still reach the cap. Treat prize pools as testnet-only until runs can be verified (server-side replay or independent attestation).
2. **Free wallets can farm ARCQ.** Each wallet is limited to 100,000 points of rewards per day, but anyone can create many wallets. ARCQ has no market value.
3. **Login message is not tied to this website's domain.** A phishing site could pass a victim a login message from this server. Impact is small: a login session cannot move funds, since every transaction is signed in the wallet.
4. **Not verified in a real browser.** The connect dialog layout, the Gmail-free wallet flow with real MetaMask or Rabby, and WalletConnect with a phone were not exercised. Wallet behaviour was simulated.
5. **Stateful server:** sessions live in memory (restarting asks players to connect again). The leaderboard index is stored in `.data/` and rebuilds from the chain if deleted. The game needs `server.mjs`, so it cannot be hosted as a static site.
6. **Leaderboard shows wallet addresses only.** The chain does not store names or heroes.
7. **Only integration tests exist.** There are no unit or fuzz tests for the contract.
8. **Old files in your repository no longer match the project:** `README.md`, `build-dapp.mjs`, `serve-dapp.mjs` and `verify-all.mjs` describe the previous layout. They were left untouched.
9. **Unused leftovers:** `CIRCLE_API_KEY` in `.env` is no longer used and can be deleted.

## Suggested next steps
1. Decide whether you want a new contract version with the fixes above (season-bound signatures, reduced ARCQ issuance, pause switch). Redeploying empties the board.
2. Try the game once end to end with a real wallet: connect, play 10+ seconds, record the score, enter a season.
3. Keep `GAME_SIGNER_PRIVATE_KEY` out of chat, screenshots and the repository.


## Follow-up: contract v3 (deployed 2026-11-22)

A new contract was deployed to address the contract findings above. The board and season state start empty; v1 and v2 are retired.

| Finding | Result in v3 |
| --- | --- |
| Signed runs not bound to a season (High) | Fixed. The signed digest includes the season; the server also ends each ticket before the season does. Tested on a local chain: a ticket signed for season 0 is rejected in season 1. |
| Single signer controls scoring (Critical, design) | Reduced, not eliminated. Added a guardian role that can pause and rotate the signer, and the signer can no longer rotate itself. The guardian is trusted over scoring (it can appoint a signer), so it should be a separate wallet you control. Until you run `set-guardian`, the guardian is the same key as the signer. |
| ARCQ issuance far above sink costs (Medium) | Fixed. 0.2 ARCQ per point; full progression now takes about 77,500 rewarded points. |
| Revert strings (Medium) | Fixed. Custom errors everywhere. |
| EIP-4906 `MetadataUpdate` indexed (Low) | Fixed. |
| Transferred badge is never re-issued (Medium, new) | Fixed. A player who transferred their badge gets it again on their next qualifying run. |
| USDC issuer blocklist could freeze prizes (Medium) | Accepted, operational risk. |

Verification: 28 integration checks pass on a local chain (including pause behaviour, season binding and guardian-only admin); the contract review at maximum depth found no further issues beyond the guardian trust point above; Slither shows only the known false positives; a ticket issued by the live server was accepted by the deployed contract in a read-only simulation on Arc Testnet.

Still open: the anti-cheat is plausibility-based, so do not put real value in the prize pool; WalletConnect is untested with a phone wallet.


## Follow-up: contract v4 (deployed 2026-11-22)

v4 adds relayer-friendly tickets (free-gas saves), wave and hero in each run, daily quests and streaks, soulbound skins and USDC rooms. It was written, then reviewed at maximum depth and tested before deployment.

- **Review:** two low findings. One (badge NFT allowed self-approval, against ERC-721) is fixed. The other (custom errors without parameters) is accepted: the game translates the error codes for players. The functional review found no material issues, including room USDC accounting, refunds, ticket replay across rooms and seasons, quest caps, and skin transfers.
- **Slither:** only known false positives (equality checks on day counters, base64 arithmetic, ignored return values from the badge mint).
- **Tests:** 57 local integration checks (chain, server, relayer, indexer): rooms and refunds, quests, skins, pause, season binding, gasless saving, telemetry rejection.
- **Live check:** a ticket built by the real client and server was accepted by the deployed v4 contract in a read-only simulation on Arc Testnet.

New operational notes: the relayer is a hot wallet (keep its balance small); the anti-cheat now also checks telemetry but remains a deterrent, not proof; the guardian role should still be moved to a separate wallet.
