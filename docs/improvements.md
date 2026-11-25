# Rà soát game: cần cải thiện, tối ưu, nâng cấp

Ngày: 25/11/2026. Đây là rà soát đọc mã và kiểm tra cấu hình, chưa chơi thử trong trình duyệt. Mục nào ghi "đã thấy" là tôi đọc được trong mã hoặc cấu hình. Mục ghi "đề xuất" là ý kiến, chưa kiểm chứng.

## 1. Cần làm trước khi cho người thật chơi (ưu tiên cao)

| # | Việc | Vì sao | Ai làm |
|---|------|--------|--------|
| 1 | Thêm Upstash Redis trên Vercel | Đã thấy: không có Redis thì biệt danh mất mỗi khi hàm Vercel khởi động lại, và bảng xếp hạng phải quét lại từ chuỗi mỗi lần khởi động nguội (mỗi ngày chậm hơn). | Bạn (trên Vercel) |
| 2 | Hoàn tất thử đăng nhập Google | Đã thấy: lần thử trước báo lỗi, đã sửa nhưng chưa xác nhận trong trình duyệt. Phải chạy được từ đầu đến cuối (đăng nhập, đặt PIN, lưu điểm). | Bạn thử, tôi đọc log |
| 3 | Bấm Publish app trên Google Cloud | Đã thấy: khi còn Testing, chỉ Gmail trong Test users đăng nhập được. | Bạn |
| 4 | Chốt hợp đồng cuối rồi mới mở cho người chơi | Đã thấy: mỗi lần đổi hợp đồng là triển khai lại và bảng xếp hạng về trống. Hiện hợp đồng `0x50b8…c30b` được tạo cùng khóa tạm. | Bạn quyết, tôi triển khai |
| 5 | Tách khóa guardian khỏi khóa signer | Đã thấy: hai vai trò dùng chung một khóa. Ai giữ guardian có thể thay signer, tức là toàn quyền về điểm. Nên chuyển guardian sang ví riêng (ví cứng hoặc multisig). | Bạn tạo ví, tôi hướng dẫn lệnh |
| 6 | Sao lưu khóa signer ngoài sandbox | Đã thấy: khóa chỉ nằm ở `.env.local` và biến môi trường Vercel. Mất khóa thì không ký được vé mới. | Bạn |
| 7 | Quyết định về nút "Ghi điểm miễn phí gas" | Đã thấy: relayer đang tắt. Ví Google/email đã được Circle tài trợ gas, nhưng ví trình duyệt (MetaMask...) phải tự trả gas. Muốn bật cần `RELAYER_PRIVATE_KEY` và nạp USDC testnet. | Bạn quyết |

## 2. Trải nghiệm chơi (nâng cấp nhanh, ít rủi ro)

1. **Tự tạm dừng khi rời tab.** Đã thấy: `visibilitychange` chỉ dùng cho nhạc, game không tự dừng khi người chơi chuyển tab. Người chơi có thể chết khi không nhìn. Đề xuất: tự pause khi tab bị ẩn.
2. **Nút tạm dừng cho điện thoại.** Đã thấy: tạm dừng chỉ gán với phím P. Chưa kiểm tra có nút cảm ứng không. Đề xuất: thêm nút Pause trên màn hình.
3. **Tự chọn ngôn ngữ.** Đã thấy: không có dò ngôn ngữ trình duyệt. Đề xuất: mặc định tiếng Việt nếu trình duyệt là `vi`, ngược lại tiếng Anh.
4. **Giới hạn độ phân giải trên điện thoại.** Đã thấy: `setPixelRatio` giới hạn ở 2. Đề xuất: giới hạn 1,5 trên màn hình nhỏ để giảm giật.
5. **Hướng dẫn chơi lần đầu.** Đã thấy: có văn bản hướng dẫn trong mã. Đề xuất: hiện một lần cho người mới, kèm gợi ý về nhân vật và vũ khí.
6. **Cân bằng 3 nhân vật mới.** Đã thấy: Hieu, Quoc, Miley dùng lại vũ khí có sẵn (sét, cầu lửa, tên bám đích). Chưa ai chơi thử về độ khó. Đề xuất: thêm vũ khí riêng cho từng người, và chơi thử vài ván để chỉnh máu, tốc độ.
7. **Bảng xếp hạng.** Đề xuất: tab "hôm nay", "7 ngày", "toàn thời gian". Hiện chỉ có tất cả và theo mùa. Highlight dòng của chính người chơi.
8. **Chia sẻ điểm.** Đề xuất: ảnh chia sẻ có biệt danh, nhân vật và liên kết tới game.

## 3. Giao diện, SEO, chia sẻ liên kết

1. Đã thấy: trang không có biểu tượng tab (favicon), không có thẻ xem trước khi chia sẻ (Open Graph) và không có `manifest`. Dán link game lên Facebook/Zalo/Telegram sẽ không có ảnh đẹp. Đề xuất: thêm ảnh xem trước, mô tả ngắn, favicon.
2. Đã thấy: không có thuộc tính hỗ trợ truy cập (`aria-`), không xử lý `prefers-reduced-motion`. Đề xuất: nhãn cho nút chính, chế độ giảm chuyển động.
3. Đề xuất: màn hình tải có tiến trình. Trang nặng khoảng 1,1 MB (đã gồm Three.js); Vercel tự nén khi gửi.

## 4. Kỹ thuật và vận hành

1. **Giới hạn tần suất chỉ đếm theo từng phiên bản hàm Vercel** (đã thấy). Với lượng người lớn, giới hạn gửi mã/đăng nhập sẽ lỏng. Đề xuất: chuyển bộ đếm sang Redis khi đã có Upstash.
2. **Chống gian lận chỉ kiểm tra tính hợp lý của điểm** (đã thấy trong README). Trên Vercel, một ván có thể được gửi kết thúc nhiều lần để thử lại, nhưng chỉ một vé dùng được. Đừng gắn giá trị tiền thật vào giải thưởng khi chưa nâng cấp.
3. **Nhật ký ván bị từ chối**: ghi vào tệp không có trên Vercel (chỉ còn log hàm). Đề xuất: ghi vào Redis hoặc dịch vụ log để xem lại.
4. **Giám sát lỗi**: lỗi trình duyệt chỉ được gửi lên log hàm. Đề xuất: xem log Vercel đều đặn sau khi mở, hoặc thêm dịch vụ theo dõi lỗi.
5. **Kiểm thử**: có 63 bài kiểm tra hợp đồng + máy chủ, 35 bài email, 20 bài cho hàm Vercel. Chưa có kiểm thử giao diện hay đăng nhập Google thật. Đề xuất: thêm một danh sách kiểm tra thủ công trước mỗi lần phát hành.
6. **Xác minh mã nguồn hợp đồng trên explorer** để người chơi đọc được. Tôi chưa làm việc này.
7. **Bundle `passkey.js` (1,7 MB)** đã tăng sau khi cập nhật `viem`; passkey đang tắt. Đề xuất: bỏ khỏi bản phát hành nếu không dùng.

## 5. Thứ tự đề xuất

1. Làm các mục 1.1 đến 1.3 (Upstash, thử Google, Publish app). Mất khoảng nửa giờ.
2. Làm nhanh các mục 2.1 đến 2.4 và mục 3.1 (tự pause, nút pause, ngôn ngữ, ảnh chia sẻ). Tôi làm được.
3. Chơi thử 3 nhân vật mới, gửi phản hồi để tôi cân bằng.
4. Khi sẵn sàng mở: chốt hợp đồng, tách guardian, sao lưu khóa (mục 1.4 đến 1.6).
