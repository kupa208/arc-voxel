# Đăng nhập bằng Google: hướng dẫn cài đặt từng bước

Mục tiêu: người chơi bấm "Continue with Google", chọn tài khoản Gmail, không cần nhập mã gửi qua email. Họ vẫn đặt một mã PIN lần đầu để tạo ví và dùng PIN đó để xác nhận giao dịch (đây là cơ chế của ví Circle, không bỏ được).

Địa chỉ game dùng trong ví dụ: `https://arc-voxel.vercel.app`. Thay bằng địa chỉ của bạn nếu khác.

## Phần A. Google Cloud: tạo OAuth Client ID

1. Mở https://console.cloud.google.com và đăng nhập bằng Gmail của bạn.
2. Ở thanh trên cùng, bấm ô chọn dự án, rồi **New Project**. Đặt tên `Arc Voxel`, bấm **Create**. Chọn dự án vừa tạo.
3. Vào menu **APIs & Services**, rồi **OAuth consent screen** (hoặc **Google Auth Platform**, tùy giao diện).
4. Bấm **Get started** (nếu có). Điền:
   - App name: `Arc Voxel Quest`
   - User support email: Gmail của bạn
   - Audience: **External**
   - Contact information: Gmail của bạn
   Đồng ý điều khoản, bấm **Create**.
5. Trạng thái ứng dụng:
   - Khi đang **Testing**, chỉ các Gmail trong danh sách **Test users** đăng nhập được. Thêm Gmail của bạn (và bạn bè thử) ở mục **Audience**, **Test users**, **Add users**.
   - Muốn ai cũng đăng nhập được, bấm **Publish app** (đưa lên In production). Với phạm vi cơ bản (email, profile, openid) thường không cần Google duyệt thêm.
6. Vào **APIs & Services**, **Credentials** (hoặc **Clients**), bấm **Create Credentials**, **OAuth client ID**.
7. Application type: **Web application**. Name: `Arc Voxel web`.
8. **Authorized JavaScript origins**, bấm **Add URI** và nhập:
   `https://arc-voxel.vercel.app`
9. **Authorized redirect URIs**, bấm **Add URI** và thêm cả hai dòng:
   - `https://arc-voxel.vercel.app`
   - `https://arc-voxel.vercel.app/`
   (Không có dấu `/` ở cuối trong dòng đầu. Google so khớp từng ký tự, nên thêm cả hai cho chắc.)
10. Bấm **Create**. Sao chép **Client ID** (dạng `xxxx.apps.googleusercontent.com`). Client ID là giá trị công khai, không bí mật. **Không** cần Client Secret.

## Phần B. Circle Console: khai báo Google

1. Mở https://console.circle.com, đăng nhập đúng tài khoản Circle đã tạo API key cho game, chọn môi trường **Test**.
2. Vào **Wallets**, **User Controlled**, **Configurator**.
3. Mở mục **Authentication Methods**, phần **Social Logins**, chọn **Google**.
4. Dán **Client ID** ở bước A.10, bấm **Save**.

## Phần C. Đưa mã mới lên GitHub và Vercel

1. Trong Arc Studio, mở menu **+** ở thanh chat và đẩy dự án lên GitHub (repo `kupa208/arc-voxel`).
2. Mở dự án `arc-voxel` trên Vercel, vào **Settings**, **Environment Variables**.
3. Thêm biến:
   - Key: `GOOGLE_CLIENT_ID`
   - Value: Client ID ở bước A.10
   - Tích Production (hoặc cả ba môi trường)
   Bấm **Save**.
4. Vào **Deployments**, bấm `...` ở lần deploy mới nhất, chọn **Redeploy**.

## Phần D. Kiểm tra

1. Mở `https://arc-voxel.vercel.app/api/config`. Phải thấy `"google":{"enabled":true,...}`. Nếu là `false`, kiểm tra `GOOGLE_CLIENT_ID` và `CIRCLE_API_KEY` đã có trên Vercel và đã Redeploy.
2. Mở game, nhấn Ctrl+F5, bấm Connect. Phải thấy nút **Continue with Google** ở đầu hộp thoại.
3. Bấm nút, chọn tài khoản Google, đồng ý. Trang quay lại game, Circle mở cửa sổ đặt PIN (lần đầu), rồi ví được tạo.
4. Chơi một ván, lưu điểm và xác nhận bằng PIN.

## Lỗi thường gặp

- **Google báo `redirect_uri_mismatch`**: địa chỉ trong bước A.8 và A.9 không khớp với địa chỉ bạn đang mở game. Sửa đúng từng ký tự, chờ vài phút để Google cập nhật.
- **Google báo `Access blocked` hoặc `app not verified`**: ứng dụng đang ở Testing và Gmail đang dùng chưa nằm trong Test users. Thêm vào danh sách, hoặc Publish app.
- **Quay lại game nhưng không đăng nhập được**: Client ID ở Circle Console (phần B) và ở `GOOGLE_CLIENT_ID` (phần C) phải giống hệt nhau.
- **Chỉ chạy trên địa chỉ đã khai báo**: bản xem trước trong Arc Studio có địa chỉ khác nên Google sẽ từ chối. Hãy thử trên `arc-voxel.vercel.app`.

## Lưu ý

- Đăng nhập Google tạo một ví riêng. Nó không phải ví `0x72ec…36d9` bạn đã tạo bằng mã email, dù dùng cùng Gmail.
- Mất PIN thì không ai khôi phục được ví, kể cả Circle.
- Gas được Circle tài trợ trên Arc Testnet theo hạn mức chung của tài khoản Circle.
