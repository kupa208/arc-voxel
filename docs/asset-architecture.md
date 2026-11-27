# Asset architecture (visual items, ready for future customization)

Everything a player can own, equip or collect is described as data, so new items do not need new rendering code. Nothing here connects to a wallet, a token or the blockchain; the contract stays the only source of truth for ownership.

## Where it lives
- `ASSET_CATALOG` in `game.js`: items, hero unlocks and environment props.
- `window.ARC_VOXEL_ASSETS` in the browser: a read and extend API built from the catalog.

## What is described
| Group | Fields | Notes |
|---|---|---|
| Items (`items`) | `id`, `type` (`upgrade`, `skin`, `effect`), `slot`, `color`, `costArcq`, `rarity`, `source`, `chainId` | Prices mirror the contract. `chainId` is reserved for a future onchain item and is `null` today. |
| Heroes | `id`, `weaponId`, `parts` | Parts are `head`, `hair`, `body`, `clothing`, `accessory`, `weapon`. |
| Weapons | `id`, `startsWith` | Weapons heroes start with plus the ones found while levelling. |
| Collectibles | `id`, `kind`, `color` | Coin, gem and heart. |
| Props | `id`, `solid`, `parts` | Environment pieces such as tree, rock, bush, lamp, foam. |

## Helpers
- `getItem(id)`, `list(type)`: read items.
- `register(item)`: add an item at runtime. It rejects duplicate ids, a colour that is not `#rrggbb` and an unknown rarity, and returns `{ ok, problems }`.
- `validate()`: lists problems in the catalog, for tests and tooling.
- `getHeroParts(id)`, `buildHero(id, lookOverrides)`, `swapPart(hero, slot, part)`, `composeLook(base, overrides)`: build or change a hero from parts while keeping its animations.

## How to add things
- **A skin or effect:** add an entry to `items` with the next free id. The contract must accept the same id and price, so changing the catalog alone changes only what the game shows.
- **A hero:** add a look to `HERO_LOOKS` and a hero spec to `HEROES`; the registry picks it up.
- **An environment piece:** describe it in `props` and add a scatter step next to the existing ones in `buildArena`.

## Not included on purpose
No wallet, NFT or token logic. When it is time to connect items to onchain ownership, `chainId` is where a contract item id would be stored.
