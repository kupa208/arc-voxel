# USDC payments on Arc: evaluation

Status: **evaluation only.** Nothing in this document is implemented as a new payment flow. Any new USDC transaction needs a separate security review and your explicit approval before it is built.

## What already moves USDC today (Arc Testnet only)

| Flow | Amount | Where the money goes |
| --- | --- | --- |
| Daily season entry | 1 USDC | The season prize pool. Top places are paid by the contract. |
| Battle Pass Premium | 3 USDC | The current season's prize pool (paid back to players). |
| Private rooms | 0.1 to 100 USDC | The room's own prize pool. |

All three are testnet USDC with no real value. The contract never keeps a fee for itself: every USDC unit is paid out to players or refunded. The local test suite checks that the contract holds 0 USDC after all payouts.

## Options to evaluate

1. **Keep ARCQ for the shop, USDC only for entries and the pass (current).** Lowest risk. No new payment code.
2. **Sell cosmetics directly for USDC.** Needs a new contract function, a price table and a place for the revenue to go (a treasury address owned by you). A treasury is new trust and new risk: it is the first time the contract would hold money that is not owed to players.
3. **Tips or sponsorship of a prize pool.** A function that adds USDC to the pool. Simple, and the money still goes to players. Risk is mostly spam and accounting.
4. **Cross-chain payments (CCTP / Gateway).** Lets players pay from another chain. Adds bridge and attestation steps and a lot of UI. Only worth it once real demand exists.
5. **Gasless or sponsored transactions.** Already done through Circle for email and Google wallets. Not a payment feature.

## Arc-specific points

- On Arc the native gas token is USDC. The ERC-20 view has 6 decimals and the native view has 18. Never add the two or show both as separate balances: they are one pool. The game always uses the ERC-20 view for amounts.
- Gas is paid in USDC too, so a player needs a small USDC balance even for a free-to-play action, unless the wallet type is sponsored.

## Risks that need a review before real money

- **Custody:** any treasury or admin withdrawal path must be a multisig or a separate guardian wallet, never the game signer key.
- **Pricing and refunds:** decide a refund policy. The contract cannot refund a sold cosmetic.
- **Fraud and farming:** quest rewards, pass XP and prizes can be farmed with many wallets. The save rule (60 seconds or 200 points) helps but is not proof of honest play. Do not put real value behind the anti-cheat alone.
- **Signature replays and approvals:** use exact approvals, per-purchase nonces and deadlines. Never ask for unlimited allowance.
- **Reentrancy and rounding:** the existing contract uses a reentrancy guard and pays rounding dust to the last winner. Any new function must keep both.
- **Emergency stop:** every new payable function must respect the pause switch held by the guardian.
- **Legal and tax:** selling digital items or running prize pools can be regulated depending on where players live. Get advice before mainnet.
- **Mainnet:** Arc Studio does not deploy to or transact on mainnet. Mainnet use needs an independent professional audit and your own deployment outside Arc Studio.

## Recommended next steps (none started)

1. Decide whether you want revenue at all. If not, option 1 or 3 is enough.
2. If you do, write a short design doc first (goals, who holds the money, refund rules, pause behaviour).
3. Add tests for every new money path, including a check that the contract balance equals what it owes.
4. Run an independent audit before any mainnet deployment.
