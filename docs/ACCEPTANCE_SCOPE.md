# Phạm vi và quyền nghiệm thu hiện hành

Ngày 10/11/2026. Bảng này mô tả code đang có, không tự thay thế yêu cầu giảng viên. Đối chiếu nguồn tại [LECTURER_REQUIREMENTS_MAPPING.md](LECTURER_REQUIREMENTS_MAPPING.md).

## Ma trận quyền

| Thao tác | Vãng lai | Khách đăng nhập | Editor | Owner |
| --- | --- | --- | --- | --- |
| Xem catalog/tìm kiếm/giỏ | Có | Có | Qua cửa hàng | Qua cửa hàng |
| Đặt COD | Có, receipt trong tab | Có, gắn customer_id | Chỉ là khách nếu chưa có phiên customer | Như editor |
| Xem đơn khách | Có receipt của đơn | Đơn của mình | Tất cả trong quản trị | Tất cả trong quản trị |
| Khách hủy đơn | Không có UI hủy guest | PENDING chưa thanh toán | Qua quản trị | Qua quản trị |
| Đổi mật khẩu của mình | Không | Có | Có | Có |
| CRUD sản phẩm/danh mục, upload ảnh | Không | Không | Có | Có |
| Xử lý đơn/ghi nhận COD/báo cáo | Không | Không | Có | Có |
| Tra cứu hồ sơ khách | Không | Chỉ hồ sơ bản thân | Có, chỉ đọc | Có, chỉ đọc |
| Tạo admin, đổi quyền, khóa, reset mật khẩu người khác | Không | Không | Không | Có, với điều kiện bảo vệ tài khoản |

Customer và admin là hai loại tài khoản/cookie riêng. Chọn tab Quản trị viên không cấp quyền; backend kiểm tra phiên và vai trò. Owner không được tự khóa/hạ quyền/reset mật khẩu mình qua chức năng quản lý người khác.

## Kiểm kê danh sách

| Danh sách | Tìm | Lọc/sort | Phân trang |
| --- | --- | --- | --- |
| Catalog khách | Tên/từ khóa | Danh mục, dòng máy, giá, sort | 6 trên UI |
| Sản phẩm admin | Tên/slug | Đang bán/ẩn; tên/ngày | 20 |
| Danh mục | Tên/mã | Có/chưa có sản phẩm; tên | 20 |
| Khách hàng admin | Tên/email/SĐT | Có/chưa có đơn; tên/ngày | 20 |
| Tài khoản admin | Tên/email | Role/active; tên/ngày | 20 |
| Đơn admin/khách | Mã/người nhận/SĐT | Trạng thái; ngày/tổng tiền | 20, khách chỉ đơn của mình |
| Đơn trong hồ sơ khách | Không có tìm riêng | Mặc định mới nhất | Có |
| Báo cáo | Khoảng ngày/kỳ | Ngày/tuần/tháng | 12 dòng/kỳ trên UI |
| Preview trang chủ | Không phải danh sách quản trị | Giới hạn 8 sản phẩm | Liên kết Xem tất cả |

## Các điểm phải chốt, không tự đánh dấu đạt

1. DOCX yêu cầu sửa/khóa người dùng trong khi phạm vi khách của PDF có tra cứu chỉ đọc: hiện **chưa có sửa/khóa customer**.
2. “Quản lý role”: hiện phân owner/editor, **chưa CRUD role động**.
3. “Xóa”: sản phẩm dùng ẩn, admin dùng khóa để giữ lịch sử; cần giảng viên chấp nhận nếu rubric yêu cầu xóa cứng.
4. Khách hủy hiện chỉ PENDING, chưa mở đến PROCESSING. Giữ nguyên để không thay quy tắc giao hàng sát hạn khi chưa chốt.
5. Yêu cầu mọi danh sách tìm/lọc/sort cần xác nhận ngoại lệ đối với bảng đơn lồng và báo cáo.
6. Hosting vẫn chưa thực hiện vì chưa có VPS/domain; Docker local/GHCR không thay thế URL hosting.
7. Email tự động/OAuth/thanh toán online chưa triển khai; mailto ở trang liên hệ không phải chức năng gửi mail tự động để tính điểm cộng.

## Nghiệm thu tối thiểu trước nộp

- Luồng mua → xử lý COD → doanh thu đi được trên cùng bản Docker.
- Không có lỗi P0: xem chéo đơn, nâng quyền, bán quá tồn, nhân đôi đơn/giữ hàng.
- Không có lỗi P1 chặn đăng nhập/tạo sản phẩm/checkout/xử lý đơn.
- Có dữ liệu trình diễn và kết quả test tay, không chỉ output kiểm thử tự động.
- Báo cáo/slide/video/source khớp phiên bản; từng thành viên giải thích được code.
- Mục chưa đạt được ghi rõ, không gọi toàn bộ đồ án hoàn tất chỉ vì build thành công.
