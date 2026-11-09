# B3.4 — Lịch sử và vận hành đơn trên SQL Server

Ngày 29/10/2026. Tiếp nối checkout B3.3; chỉ chế độ API gọi các endpoint này. Frontend demo giữ luồng riêng.

## Giao diện và quyền

- `/account/orders`: danh sách đơn thuộc tài khoản đang đăng nhập; tìm mã/người nhận/điện thoại, lọc trạng thái, phân trang 20 đơn. Không suy ra quyền sở hữu bằng email người nhận và không gộp đơn guest.
- `/account/orders/:id`: snapshot đơn, lịch sử xử lý và hủy khi còn PENDING chưa thanh toán; bắt buộc lý do, xác nhận thao tác.
- `/admin/orders` và `/admin/orders/:id`: owner/editor đang hoạt động được xem và xử lý đơn. Có liên kết từ trang tài khoản quản trị.
- Mọi truy vấn và mutation kiểm tra cookie server trong transaction. ID sai hoặc đơn không thuộc khách trả404; thiếu/thu hồi/hết hạn phiên trả401. Dữ liệu trả với Cache-Control:no-store. Frontend tải lại khi cửa sổ lấy focus và chuyển về đăng nhập nếu401.

## Hợp đồng API

Hai base URL: `/api/v1/account/orders` và `/api/v1/admin/orders`.

| Endpoint | Nội dung |
| --- | --- |
| GET base | `q` tối đa120 ký tự, `status` enum, `page`1..10000; trả `{items,total,page,pageSize:20}`; page quá số trang được kẹp về trang cuối |
| GET base/:id | snapshot + `revision`, `history`, `actions` được phép bởi server |
| POST base/:id/actions | `{revision,kind:'status' hoặc 'payment',target,note}`; note sau trim1..2000 ký tự; Origin đúng, X-Aura-Request:1, JSON |

Không tải toàn bộ đơn về trình duyệt để lọc. SQL dùng tham số, CHARINDEX tìm literal và OFFSET/FETCH; giới hạn trang/kích thước truy vấn. Hiện chưa có bộ lọc ngày hoặc sắp xếp tùy chọn; mặc định mới nhất.

## Quy tắc xử lý

Quản trị: PENDING → PROCESSING → SHIPPED → DELIVERED → COMPLETED. CONFIRMED cũ chuyển PROCESSING. Chỉ chuyển COMPLETED khi PAID; ghi nhận PAID cho COD sau DELIVERED, đồng bộ payments.paid_at và orders.payment_status trong cùng transaction. Thao tác ghi nhận không chuyển tiền.

Quản trị được hủy PENDING/CONFIRMED/PROCESSING chưa thanh toán. Khách chỉ được hủy PENDING chưa thanh toán. Không hủy sau khi giao vận chuyển; không quay ngược trạng thái. Chưa triển khai hoàn tiền/trả hàng ở API này.

Mỗi mutation kiểm tra revision trong transaction SERIALIZABLE, khóa `order:<id chữ thường>` chung với worker hết hạn, khóa hàng trước khi cập nhật, rồi khóa SKU theo thứ tự ổn định. Hai người dùng cùng revision chỉ một thao tác được ghi; thao tác còn lại trả409 STALE_ORDER. Sai chuyển trạng thái trả409 INVALID_TRANSITION. PENDING đã quá hạn giữ không được xác nhận, trả HOLD_EXPIRED; cho phép hủy để giải phóng tồn.

- Hủy trước giao: reserved giảm, on_hand giữ nguyên, reservation HELD → RELEASED.
- Giao vận chuyển: reserved và on_hand cùng giảm, HELD → CONSUMED. Đã giao không bị worker expiry hoàn tồn.
- Đối chiếu reservation với snapshot order_items trước khi giải phóng/xuất kho; thiếu/lệch số lượng trả RESERVATION_MISMATCH.
- Cập nhật trạng thái/thanh toán, revision, completed_at và append event nguyên tử. Lỗi bất kỳ bước nào rollback. Lịch sử lưu tên tác nhân, thời gian server, trạng thái cũ/mới và ghi chú; không sửa snapshot người nhận hoặc giá.

Sau lỗi mạng/409, giao diện khóa form cũ và yêu cầu tải lại xem lịch sử. Không tự phát lại thao tác. Revision ngăn ghi trùng khi response bị mất và người dùng kiểm tra lại kết quả.

## Kiểm chứng và chạy

Kết quả 29/10/2026: 38/38 test backend SQL Server, 41/41 test frontend, 14/14 nhóm smoke Chrome trên bản build API đạt; typecheck, build backend/API và kiểm tra ranh giới bundle đều đạt. Đã xem trực quan ảnh chi tiết đơn mobile và đơn khách đã hủy desktop.

Các test SQL Server dùng database AuraTest cô lập, dọn sau chạy: quyền chủ đơn/guest/admin, chuyển trạng thái COD, thanh toán trước giao bị chặn, hai mutation cùng revision, hủy cạnh tranh expiry, rollback khi trigger ghi event lỗi, phân trang/tìm kiếm literal, phiên thu hồi và CSRF.

Browser smoke bổ sung lịch sử đơn khách, hủy và lọc đơn, quản trị xử lý đến COMPLETED/PAID, form cũ ở tab khác bị từ chối, kiểm tra tồn SQL và mobile không tràn ngang. Kết quả hiện hành: [results.json](qa/api-frontend/results.json). Ảnh: [đơn khách đã hủy](qa/api-frontend/customer-order-cancelled.png), [đơn quản trị hoàn thành](qa/api-frontend/admin-order-completed.png), [mobile](qa/api-frontend/admin-order-mobile.png).

Không thêm migration; dùng schema001..004 hiện có. Build backend mới rồi khởi động lại server; frontend dùng dev:api hoặc build:api. Không tạo hoặc sửa đơn thật trong AuraStore khi kiểm thử.

## Phần tiếp theo

B4: báo cáo doanh thu query tại server theo giờ Việt Nam; CRUD sản phẩm/danh mục/tài khoản quản trị. Sau đó B5: nghiệm thu tích hợp, Docker/triển khai, HTTPS và backup/restore. Chưa coi bản hiện tại là sẵn sàng bán hàng production.
