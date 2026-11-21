# Deploy `ArcVoxelGameFi.sol` to Arc Testnet (L1)

## Network Info (Arc Testnet)
- **Network Name:** `Arc Testnet`
- **Chain ID:** `5042002` (`0x4cef52`)
- **Native Gas Token:** `USDC` (18 decimals at the EVM native gas layer)
- **Public RPC:** `https://rpc.testnet.arc.network`
- **Explorer:** https://testnet.arcscan.app/
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
  --rpc-url https://rpc.testnet.arc.network \
  --private-key <YOUR_TESTNET_PRIVATE_KEY>
```

---

## Tiếng Việt — Hướng dẫn Deploy lên Arc Testnet
1. Nhận `USDC` testnet làm phí gas tại [faucet.circle.com](https://faucet.circle.com/).
2. Mở [remix.ethereum.org](https://remix.ethereum.org/), nạp file [ArcVoxelGameFi.sol](./ArcVoxelGameFi.sol) và biên dịch với Solidity `0.8.20+`.
3. Chọn **Injected Provider - MetaMask**, chuyển ví sang **Arc Testnet** (`5042002`), chọn contract `ArcVoxelGameFi` rồi bấm **Deploy**.
   - Contract sẽ tự khởi tạo token thưởng `ARCQ` (ERC-20), bảng xếp hạng on-chain, và contract huy hiệu `ARCB` (ERC-721) chỉ trong 1 giao dịch.
4. Dán địa chỉ contract vừa deploy vào ô **Địa chỉ Contract** ngay trong panel **Web3 / Arc L1** của game (hoặc cập nhật `web3/web3-config.json` rồi chạy `node build-dapp.mjs`).
