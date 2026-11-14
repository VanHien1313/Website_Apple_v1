# Giao diện quản trị Aura

Cập nhật 2026-11-13.

- `/admin`: tổng quan với liên kết nghiệp vụ, thẻ tài khoản và nút thêm sản phẩm.
- `/admin/media`: tải ảnh sản phẩm; dùng đường dẫn trả về khi chỉnh sửa sản phẩm.
- `/admin/security`: đổi mật khẩu quản trị; thành công sẽ đăng xuất các phiên và yêu cầu đăng nhập lại.
- Menu bên trái dùng chung cho quản trị; trên điện thoại mở bằng nút menu. Đội ngũ quản trị chỉ hiển thị cho owner.
- Đồng bộ biến màu trắng–coban và đen–coban với cửa hàng.

Kiểm tra: typecheck và Docker build thành công. Chrome trên database SQL Server tạm đã kiểm tra các tuyến quản trị, tách biểu mẫu khỏi tổng quan, menu mobile, không tràn ngang, đổi mật khẩu quản trị và đăng nhập lại. Ảnh kiểm tra trong `docs/qa/admin-workspace/`.

Test tay: đăng nhập quản trị, mở Tổng quan; lần lượt mở các thẻ nghiệp vụ; mở Ảnh sản phẩm và Bảo mật; chuyển sáng/tối; thu nhỏ màn hình và mở menu. Chỉ thử đổi mật khẩu nếu muốn thực sự thay đổi mật khẩu tài khoản đang dùng.
