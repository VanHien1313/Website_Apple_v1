# Đặt hàng bằng tài khoản khách hàng

Áp dụng từ 11/11/2026 trên cả main (127.0.0.1:4000) và demo (localhost:4001).

## Quy tắc hiện hành

- Khách vẫn xem sản phẩm, tìm kiếm và thêm giỏ; trước khi mở checkout phải đăng nhập tài khoản khách hàng. Phiên quản trị không thay thế phiên khách hàng.
- Đăng ký bắt buộc họ tên, số điện thoại Việt Nam, email, mật khẩu 8–128 ký tự có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt, tỉnh/thành phố, phường/xã và địa chỉ chi tiết. Không thu thập CCCD, giới tính hoặc ngày sinh khi chưa có nghiệp vụ cần dùng.
- Đăng nhập/đăng ký từ checkout giữ đường dẫn quay lại và giỏ hàng. URL quay lại chỉ chấp nhận đường dẫn checkout nội bộ.
- Checkout điền sẵn thông tin tài khoản và địa chỉ đăng ký; người nhận/địa chỉ giao hàng được sửa cho từng đơn. Email hóa đơn lấy từ tài khoản ở server, không tin email tự sửa trong request.
- API tạo đơn trả 401 nếu không có phiên khách hàng hợp lệ. Đơn mới luôn gắn customer_id. Thiếu email hoặc thông tin giao hàng bị từ chối; báo giá/giữ tồn/idempotency vẫn kiểm tra như trước.
- Tài khoản cũ chưa có địa chỉ vẫn đăng nhập được nhưng phải nhập đầy đủ địa chỉ khi checkout. Đơn vãng lai cũ giữ nguyên, không tự gán cho tài khoản trùng email.
- Phiên hết hạn lúc gửi đơn chuyển về đăng nhập và giữ request đang chờ. Request thuộc email khác bị khóa cho đến khi đăng nhập đúng tài khoản.

## Tự kiểm tra

1. Dùng cửa sổ ẩn danh, thêm sản phẩm rồi chọn Mua ngay/đặt hàng: phải chuyển sang đăng nhập.
2. Chọn Đăng ký: bỏ trống lần lượt họ tên, điện thoại, email và địa chỉ phải bị chặn. Điền thông tin hợp lệ và tạo tài khoản.
3. Đăng nhập: quay lại checkout, giỏ còn nguyên, email tài khoản hiển thị chỉ đọc.
4. Kiểm tra/sửa người nhận và địa chỉ; xác nhận COD. Đơn phải xuất hiện trong Đơn hàng của tôi và trong quản trị.
5. Dùng tài khoản khác: không xem được đơn của tài khoản trước. Đăng nhập chỉ bằng quản trị cũng chưa được mua hàng.
6. Đăng xuất khách ở tab khác trước khi gửi đơn: checkout phải yêu cầu đăng nhập lại; không tạo đơn vãng lai.

## Kỹ thuật và kiểm chứng

Migration `008_customer_address.sql` thêm JSON địa chỉ nullable cho hồ sơ cũ. Đã backup COPY_ONLY/CHECKSUM và VERIFYONLY trước migration. Main giữ 36 sản phẩm / 0 khách / 1 đơn; demo giữ 8 sản phẩm / 1 khách / 6 đơn tại thời điểm triển khai.

78 kiểm thử backend SQL và 41 kiểm thử frontend đạt. Bộ kiểm thử trình duyệt: `deploy/member-checkout-verify.mjs`; minh chứng: `docs/qa/member-checkout/`. Kiểm thử đặt đơn thực sự chạy trong database tạm, không tạo đơn thử ở main/demo.

**Chưa tích hợp gửi email hóa đơn hoặc xác minh email/OTP điện thoại.** Hiện hệ thống kiểm tra định dạng, lưu email cùng snapshot đơn và chuẩn bị dữ liệu cho bước gửi email sau này; không hiển thị thông báo đã gửi email.
