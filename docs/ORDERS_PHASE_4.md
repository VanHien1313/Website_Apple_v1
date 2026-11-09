# Bàn giao giai đoạn 4 — Đơn hàng và doanh thu

Ngày 17/10/2026. Phạm vi A04, A05, A07 theo kế hoạch, ở mức frontend demo. Dùng chung đơn do checkout tạo; không chèn doanh thu hoặc đơn giả vào dữ liệu người dùng.

## Màn hình và luồng

- `/admin/orders`: tìm mã đơn/người nhận/điện thoại, lọc trạng thái và ngày tạo theo giờ Việt Nam, sắp xếp mới/cũ/tổng tiền, phân trang 8 dòng, query URL, rỗng/lỗi/retry.
- `/admin/orders/:id`: snapshot sản phẩm, cấu hình, màu, số lượng, đơn giá, tổng tiền, người nhận/địa chỉ/ghi chú, phương thức giao và thanh toán. Có xác nhận thao tác, ghi chú bắt buộc, lịch sử và tải lại dữ liệu.
- `/admin/reports`: khoảng ngày hoàn thành, nhóm ngày/tuần/tháng; tổng tiền, số đơn, trung bình; biểu đồ và bảng cùng kết quả service. Bảng phân trang 12 dòng; tổng bảng là tổng toàn khoảng, không chỉ trang hiện tại. Khoảng chọn tối đa 367 ngày.
- `/admin`: tổng số đơn và doanh thu demo tháng hiện tại liên kết sang màn hình nghiệp vụ.
- `/order-confirmation/:id`: tải lại sẽ hiển thị trạng thái giao hàng/thanh toán đã cập nhật từ admin.

Chủ cửa hàng và biên tập viên demo đều có thể xử lý đơn, xem báo cáo. Session phải còn hiệu lực và hồ sơ còn hoạt động. Đây không phải phân quyền bảo mật server.

## Trạng thái và lịch sử

Luồng chính: PENDING → PROCESSING → SHIPPED → DELIVERED → COMPLETED. CONFIRMED được giữ để đọc dữ liệu cũ và chuyển sang PROCESSING. Hủy chỉ từ PENDING/CONFIRMED/PROCESSING. Không quay ngược trạng thái và không hủy khi đã giao cho vận chuyển trong quy trình demo này.

PaymentStatus độc lập: sau khi đã giao, có thể ghi nhận PAID từ PENDING/FAILED. Chỉ hoàn thành khi PAID. Có thể ghi nhận REFUNDED từ PAID; không có luồng thu lại, hoàn một phần hoặc trả hàng trong giai đoạn này. Các thao tác không thực hiện giao dịch tiền thật.

Mỗi cập nhật thêm OrderEvent: ID, thời gian ISO, người thao tác demo, loại status/payment, trạng thái cũ/mới và ghi chú. `revision` tăng để chặn form dùng dữ liệu đã cũ; giao diện hướng dẫn tải lại. `completedAt` được gán khi chuyển sang COMPLETED. Không đổi snapshot hàng/giá/người nhận hay idempotency metadata.

Đơn cũ không có revision/history được coi là revision 0/lịch sử rỗng. Trạng thái fulfillment PAID cũ được đọc thành CONFIRMED + payment PAID, không tự suy diễn hoàn thành hoặc doanh thu. Storage vẫn version 1 với trường bổ sung tương thích; lỗi dữ liệu không bị âm thầm xóa.

## Công thức báo cáo demo

Chỉ tính đơn `status === COMPLETED && paymentStatus === PAID`, theo `completedAt` tại `Asia/Ho_Chi_Minh`. Số tiền ghi nhận là `order.total`, **bao gồm phí giao hàng**. Giá sản phẩm trong total đã là giá bán; không trừ `discount` thêm lần nữa. Trung bình = tổng / số đơn, làm tròn VND khi hiển thị.

Ngày đầu/cuối được tính bao gồm. Tuần bắt đầu thứ Hai; tháng theo lịch Việt Nam. Kỳ đầu/cuối chỉ cộng ngày nằm trong khoảng chọn, nhãn tuần có thể đứng trước ngày đầu chọn. Các kỳ không có đơn vẫn có dòng bằng 0. Biểu đồ và bảng lấy cùng mảng kết quả.

Đơn hủy, chưa thanh toán hoặc REFUNDED không được tính. Ghi nhận hoàn tiền sẽ loại đơn khỏi kỳ hoàn thành ban đầu khi xem lại; đây là báo cáo snapshot demo, không phải sổ kế toán theo ngày hoàn tiền. Công thức là đề xuất cho frontend, cần chốt nghiệp vụ với backend trước vận hành; chưa tính thuế, giá vốn, hoàn một phần hoặc doanh thu thuần.

## Kiến trúc và kiểm chứng

- `domain/orders.ts`: chuyển trạng thái, nhãn, lọc/sort/phân trang, ngày Việt Nam, nhóm và tổng hợp doanh thu.
- `AdminOrderService` trong contracts: list/get/update/report; mock adapter kiểm tra phiên rồi dùng orderRepository chung với storefront.
- Repository list/update giữ metadata request; revision kiểm tra trước khi ghi, lỗi storage không báo thành công. localStorage chưa có transaction/khóa đa tab; revision không thay thế optimistic locking tại database.
- 28 test Node, gồm 5 test mới cho trạng thái, ghi chú, payment, ngày Việt Nam, nhóm tuần/tháng, loại trừ đơn, pagination, revision, lỗi lưu và migration PAID cũ.
- `scripts/orders-smoke.mjs`: checkout → admin → chuẩn bị/giao/thu tiền/hoàn thành → báo cáo; hủy, hoàn tiền, stale revision, lỗi storage, khoảng ngày sai và màn hình rỗng; kiểm tra 3 màn hình × 3 chiều rộng × 2 theme. Kết quả và ảnh tại `qa/phase-4/`.
- Kết quả giai đoạn 4: 25 kiểm tra trình duyệt đạt, không có lỗi JavaScript runtime trong luồng kiểm tra. Hồi quy storefront 45 và admin catalog 39 kiểm tra đạt. Typecheck và build thành công. Đây là smoke test Chrome, chưa phải nghiệm thu đa trình duyệt/accessibility toàn bộ.

Backend cần xác thực/quyền, cập nhật order + event + revision nguyên tử, timestamp server, truy vấn báo cáo theo múi giờ cố định, migration trạng thái và quy trình hoàn/hủy được duyệt. Giai đoạn tiếp theo của kế hoạch là tài khoản khách (phần nâng cao), sau đó nghiệm thu toàn bộ.
