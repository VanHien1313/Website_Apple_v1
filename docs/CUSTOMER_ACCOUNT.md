# Khu vực tài khoản khách hàng

Cập nhật 13/11/2026. Áp dụng cho bản API/Docker trên 4000 và 4001.

- `/account`: hồ sơ, ảnh đại diện, thông tin liên hệ và địa chỉ mặc định.
- `/account/orders`: danh sách đơn và bộ lọc; `/account/orders/:id`: chi tiết đơn.
- `/account/security`: đổi mật khẩu riêng. URL cũ `/account#security` chuyển sang trang này.
- Biểu tượng tài khoản ở header dẫn đến hồ sơ. Các trang yêu cầu phiên khách hàng.
- Giao diện hai cột trên desktop, menu ba mục trên mobile; hỗ trợ sáng/tối.

Ảnh đại diện nhận JPG/PNG/WebP tĩnh tối đa 5 MB, tối đa 16 megapixel. Server kiểm tra định dạng thực, xoay theo metadata, cắt vuông và mã hóa lại thành WebP tối đa 512px. SQL Server lưu một ảnh mỗi khách hàng trong `customer_avatars` (migration 009). GET/PUT/DELETE `/api/v1/auth/avatar` dùng phiên khách hàng, không nhận ID người dùng từ client; GET private/no-store, mutation kiểm tra Origin và X-Aura-Request. Thay ảnh giới hạn một lần mỗi 3 giây. Chưa có ảnh thì hiển thị chữ viết tắt tên.

Test tay:
1. Đăng nhập khách hàng, nhấn biểu tượng tài khoản: mở Hồ sơ, không có form mật khẩu.
2. Chọn Thay ảnh đại diện, tải JPG/PNG/WebP; ảnh đổi ở hồ sơ và sidebar. Reload/đăng nhập lại vẫn giữ ảnh. Xóa ảnh trở lại chữ viết tắt.
3. Thử file sai định dạng hoặc trên 5 MB: có thông báo, không ghi đè ảnh cũ.
4. Chuyển Đơn hàng: chỉ thấy danh sách/bộ lọc; mở đơn để xem chi tiết.
5. Chuyển Đổi mật khẩu: chỉ thấy form và hướng dẫn. Mật khẩu mới 8–128 ký tự, ít nhất một chữ hoa và một ký tự đặc biệt; đổi xong về login với thông báo thành công.
6. Kiểm tra mobile 390px và tablet 768px; không tràn ngang.

Xác minh: 82/82 kiểm thử backend đạt; QA trình duyệt trên database tạm kiểm tra tách trang, upload/reload ảnh, legacy URL, đổi mật khẩu, kết thúc phiên và 3 kích thước màn hình. Ảnh chụp tại docs/qa/customer-account.
