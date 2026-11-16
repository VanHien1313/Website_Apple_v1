# Đăng nhập khách hàng bằng Google và Zalo

Áp dụng migration `012_social_login.sql` bằng `npm run db:migrate` trước khi khởi động bản mới. Bảng `customer_social_identities` lưu ID theo nhà cung cấp. Khi đăng nhập lại, khách hàng dùng cùng hồ sơ và lịch sử đơn hàng. Email Google phải được xác minh. Nếu email trùng với tài khoản hiện có, khách cần quay lại phương thức đăng nhập ban đầu. Zalo cung cấp ID và tên, nên backend dùng địa chỉ nội bộ có đuôi `@zalo.aura.invalid` làm khóa email cho hồ sơ Zalo. Địa chỉ này không nhận thư. Khách điền số điện thoại và địa chỉ giao hàng khi checkout.

## Cấu hình thử nghiệm

1. Chọn `APP_ORIGIN` trỏ đúng địa chỉ frontend và API mà trình duyệt truy cập. Dùng HTTPS cho staging. Nếu dùng Vite proxy, callback phải trỏ vào origin của Vite để trình duyệt nhận cookie trên cùng origin.
2. Tạo ứng dụng OAuth Web của Google và ứng dụng Zalo có quyền dùng Social API. Đăng ký đúng callback:
   - Google: `APP_ORIGIN/api/v1/auth/social/google/callback`
   - Zalo: `APP_ORIGIN/api/v1/auth/social/zalo/callback`
3. Đặt `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`, hoặc dùng `GOOGLE_CLIENT_SECRET_FILE`. Với Zalo, đặt `ZALO_APP_ID` và `ZALO_APP_SECRET`, hoặc `ZALO_APP_SECRET_FILE`. Giữ khóa trong cấu hình riêng của backend. Nếu chạy Docker, cấp các biến cho service `app` bằng file cấu hình riêng; đường dẫn secret dạng `_FILE` phải tồn tại trong container.
4. Mở `/login`, thử đăng nhập, đăng xuất rồi dùng lại cùng tài khoản. Mở đăng nhập từ checkout để kiểm tra quay về checkout và giữ giỏ. Thử hủy cấp quyền và thử email Google đã dùng để đăng ký bằng mật khẩu. Nếu thiếu cấu hình, nút tương ứng sẽ bị khóa.

Tài liệu cấu hình từ [Google](https://developers.google.com/identity/openid-connect/openid-connect) và [Zalo](https://docs.zaloplatforms.com/docs/Social/social-api/tham-khao/user-access-token-v4). Cấu hình thanh toán thử theo [MoMo/ZaloPay sandbox](WALLET_PAYMENTS.md).
