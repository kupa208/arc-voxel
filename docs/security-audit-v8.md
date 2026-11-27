# Security review of ArcVoxelGameFi v8 (testnet)

Two read-only reviews of `contracts/ArcVoxelGameFi.sol` (rule-based audit and a behaviour and adversary review), target chain Arc Testnet.

## Result
- **Rule-based audit:** no material findings.
- **Behaviour review:** one finding, rated Critical by the reviewer, which we treat as an accepted risk for testnet.

## Finding: a blocklisted winner's prize cannot be claimed
- **Where:** `claimPrize` and `claimRoomPrize` pay only the recorded winner in USDC.
- **Impact:** if a winner's address is on the USDC issuer's blocklist, the transfer reverts and that winner's share stays in the contract. Other winners are not affected, and nothing else is locked.
- **Why accepted for now:** testnet USDC has no value. A fix needs a design choice (let a winner redirect a prize to another address, or define a recovery rule), and both have compliance implications.
- **Before mainnet:** decide the policy with legal advice, add the chosen fix, redeploy and re-audit.

## Assumptions the reviewers noted
- The signer is trusted to sign real runs with unique run ids. The contract cannot tell a fabricated score from a real one; the server's plausibility checks reduce this but are not proof.
- The guardian can pause and replace the signer. Pausing does not block prize claims or room refunds.
- The deployer must pass Arc Testnet USDC (`0x3600...0000`) to the constructor.

## Not covered
- Any real-money use. USDC purchases in the shop were deliberately not built: see `docs/usdc-payments-evaluation.md`. They need your explicit approval, a fixed contract and a full external audit first.
