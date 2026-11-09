# B4.3.2 — Giao diện quản trị sản phẩm

Ngày 29/10/2026. Nối frontend API với [hợp đồng sản phẩm SQL Server](BACKEND_B4_PRODUCTS_API.md).

## Phạm vi

- `/admin/products`: tìm tên/slug, lọc đang bán/đã ẩn và phân trang trên server (20 sản phẩm/trang).
- `/admin/products/new`: tạo sản phẩm với UUID ổn định trong phiên form, mặc định ẩn.
- `/admin/products/:id`: sửa thông tin, danh mục, ảnh, mô tả, thông số nổi bật/nhóm thông số, cấu hình, màu và SKU.
- Tải PNG/JPEG/WebP bằng dịch vụ media hiện có; sao chép đường dẫn vào ảnh đại diện/bộ ảnh/ảnh màu. Xem trước ảnh đại diện.
- Mỗi SKU hiển thị giá bán, giá gốc, tổng tồn, lượng đang giữ và lượng khả dụng. Mã/cặp cấu hình-màu đã lưu không sửa. Có thể thêm SKU và bỏ SKU chưa lưu.
- Bật/tắt hiển thị cửa hàng bằng active; không xóa lịch sử hoặc giữ tồn của đơn cũ.

Route được lazy-load và chỉ gọi API, không nhập repository demo. Tải danh mục và sản phẩm song song. Lỗi tải hiển thị thử lại; 401 chuyển đến đăng nhập. UI dùng cùng tokens, form controls và trạng thái với phần quản trị hiện có.

## Lưu và xung đột

Một lần lưu gửi toàn aggregate, kèm revision sản phẩm và SKU từ lần đọc gần nhất. Khóa gửi lặp trong khi đang lưu; timeout 30 giây. Lỗi validation giữ nội dung để sửa. Lỗi 409/404, mạng hoặc 5xx khóa lưu và giữ bản nháp, yêu cầu kiểm tra server.

Kiểm tra server hiển thị tên, trạng thái và tồn/giá từng SKU. Chỉ thao tác rõ ràng “Bỏ thay đổi, dùng bản máy chủ” thay form bằng dữ liệu mới, không tự trộn hoặc gửi lại form cũ. Khi lần tạo không tìm thấy ID đã gửi, có thể tiếp tục với cùng UUID; server chặn trùng ID/slug/SKU nếu yêu cầu trước hoàn tất muộn.

Cảnh báo khi tải lại/đóng trang có thay đổi chưa lưu hoặc kết quả lưu chưa rõ. Bản nháp nằm trong bộ nhớ, chưa có khôi phục qua localStorage. Chưa hỗ trợ xóa cấu hình/màu trong form; API cũng không cho xóa các định danh đã lưu. SKU mới có thể bỏ trước khi lưu. Upload chưa có kéo-thả/gắn ảnh tự động.

## Kiểm chứng

Đã đạt build API (gồm TypeScript), 41/41 test frontend, kiểm tra ranh giới API/demo và 18/18 nhóm browser smoke. Browser chạy trên database AuraTest riêng: tạo sản phẩm và gắn ảnh media, thêm cấu hình/SKU, stale inventory, mất phản hồi sau POST/PUT đã commit, khôi phục bản máy chủ và đường dẫn chỉnh sửa, ẩn khỏi public catalog, tìm/lọc danh sách, kiểm tra tràn ngang 390px. Kết quả chạy cuối tại `docs/qa/api-frontend/results.json`; ảnh `product-editor-mobile.png`, `product-editor-desktop.png`, `products-desktop.png` đã được kiểm tra trực quan.

Không thay schema/backend nghiệp vụ trong giai đoạn này. Tiếp theo: quản trị tài khoản/người dùng và hoàn thiện đối chiếu yêu cầu triển khai còn lại.
