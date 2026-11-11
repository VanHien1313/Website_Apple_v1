# Nhật ký thay đổi

Ghi theo ngày, mới nhất trước. README giữ trạng thái hiện tại; lịch sử chi tiết ở đây và trong từng tài liệu B*.

## 11/11/2026 — Hoàn thiện frontend theo danh sách còn thiếu

- **Sắp xếp “Mới nhất” theo thời gian thật.** Thêm `Product.createdAt` (ISO UTC, tùy chọn). `compareNewest` dùng cùng quy tắc backend (`created_at DESC, id`); thiếu ngày xếp cuối. Dữ liệu mẫu có ngày ra mắt tương ứng; demo admin gắn `createdAt` khi tạo mới và **giữ nguyên ngày và vị trí khi sửa** (trước đây sản phẩm vừa sửa bị đẩy xuống cuối danh sách). Backend đã trả `createdAt` từ trước nên bản API không đổi hành vi.
- **Khôi phục biên nhận cho khách vãng lai, không cần email.** Trang xác nhận đơn có liên kết khôi phục `#receipt=<token>` và form dán liên kết/mã khi không tải được đơn. Không đổi backend hay hợp đồng API. Module: `services/api/receiptRecovery.ts`, `components/checkout/ReceiptRecovery.tsx`.
- Test frontend: 41 → 47 đạt. Typecheck, build demo, build API và kiểm tra ranh giới runtime đạt.

### Chưa làm trong đợt này

- Giao diện mới **chưa được kiểm thử trên trình duyệt thật**; chỉ có test logic và render server-side. Cần chạy lại các suite `*-smoke.mjs` trên Chrome/Safari/Firefox.
- Thanh toán online, trả hàng/hoàn tiền một phần, email biên nhận: cần quyết định nghiệp vụ và tài khoản dịch vụ ngoài.
- Thay ảnh/thông số mẫu bằng nguồn có quyền sử dụng; triển khai staging trên host thật.
