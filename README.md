# Arc Voxel · Sinh Tồn Vô Tận (Arc L1 Endless 3D GameFi)

Game hành động **3D Voxel Roguelite vòng lặp vô tận (`∞`)** song ngữ **Tiếng Anh / Tiếng Việt**, nhân vật **Arc Việt Nam Contributors**, **12 bản đồ cộng đồng Arc toàn cầu** cùng **Bảng Xếp Hạng trực tiếp** và tích hợp Web3 **Arc Testnet (`5042002` / `0x4cef52`)**.

## Điểm nổi bật

- **5 Nhân vật mặc định (Arc Việt Nam Contributors)**:
  - **Toàn Nhữ** (*Technical Speaker*) — Cầu lửa Arc Core nổ lan (`4 HP`)
  - **Xuân Hải** (*Technical Speaker*) — Song Điện Côn sét chuyền & Lướt cực nhanh (`3 HP`)
  - **Elias J** (*Technical Speaker*) — Hút ngọc cực xa & Tên năng lượng bám đích (`4 HP`)
  - **Lily Hoang** (*Event Organizer*) — Phi tiêu sóng âm 3D xuyên thấu đa hướng (`3 HP`)
  - **Kien Trinh** (*Event Organizer*) — Mũi khoan Hộ Thành xuyên phá & giáp dày (`6 HP`)
- **12 Bản đồ Cộng đồng Arc Toàn cầu** (mỗi map có địa hình, kiến trúc, hình khối quái 3D & Boss riêng biệt):
  - `🇻🇳 Vietnam` (Thủy Quái · Trâu Vàng · Đèn Lồng · Boss **Kim Quy Thần Vương**)
  - `🇸🇬 Singapore`, `🇰🇷 Korea`, `🇦🇪 UAE`, `🇮🇳 India`, `🇫🇷 France`, `🇧🇷 Brasil`, `🇦🇷 Argentina`, `🇹🇷 Türkiye`, `🇧🇩 Bangladesh`, `🇳🇬 Nigeria`, `🇰🇪 Kenya`
- **Lộ trình độ khó Vô Tận 5 tầng**: `W1-2 Khởi Động` -> `W3-4 Áp Lực` -> `W5-7 Quái Tinh Anh` -> `W8-10 Quá Tải` -> `W11+ Vô Cực Omega`.
- **Hiệu ứng kỹ năng 3D & điều khiển mượt**: Phóng cầu lửa, sét zíc-zắc, phi tiêu xoay, tên bám, cột sáng Thiên Lôi, lưỡi kiếm Plasma, cùng kỹ năng chủ động `Space` / `LƯỚT` bất tử thoáng chốc & xóa đạn địch.
- **Tích hợp Web3 Arc L1**: Smart Contract [ArcVoxelGameFi.sol](./contracts/ArcVoxelGameFi.sol) (ERC-20 `ARCQ` + ERC-721 `ArcExplorerBadge` `ARCB` + Top 10 On-Chain) & client không phụ thuộc [arc-web3.js](./web3/arc-web3.js).

## Cấu trúc thư mục

- `dapp/index.html`: Bản Web3 dApp hoàn chỉnh (đã nhúng sẵn Three.js & Arc Web3, sẵn sàng deploy lên Vercel / Cloudflare Pages / GitHub Pages).
- `dist/index.html`: Bản offline tự chạy (chỉ 1 file HTML, có thể mở trực tiếp).
- `contracts/`: Smart contract `ArcVoxelGameFi.sol` và hướng dẫn deploy [DEPLOY_ARC.md](./contracts/DEPLOY_ARC.md).
- `web3/`: Cấu hình mạng `web3-config.json` (Arc Testnet) và thư viện `arc-web3.js`.
- `game.js`, `game.json`, `serve-dapp.mjs`, `build-dapp.mjs`, `tests/verify-all.mjs`.

## Chạy thử Local & Deploy Contract

```bash
# Chạy máy chủ Web3 dApp tại http://127.0.0.1:4173/
node serve-dapp.mjs 4173
```

Hướng dẫn deploy Smart Contract lên Arc Testnet xem chi tiết tại [contracts/DEPLOY_ARC.md](./contracts/DEPLOY_ARC.md).
Khi host lên **Vercel / Cloudflare Pages / GitHub Pages**, đặt thư mục gốc phục vụ web là `dapp` (lưu ý: MetaMask/Rabby chỉ hoạt động trên `http://` hoặc `https://`, không chạy qua `file://`).
