# B3.2 — API tạo đơn COD và giữ tồn SQL Server

Cập nhật28/10/2026: frontend đã nối form COD và xác nhận đơn tại [B3.3](BACKEND_B3_CHECKOUT.md). Backend hiện chặn retry cùng requestId khác scope khách và có index migration004 hỗ trợ tra cứu. Các ghi chú frontend chưa nối phía dưới mô tả thời điểm hoàn thành B3.2.

## Tạo đơn

`POST /api/v1/orders`: JSON, Origin đúng APP_ORIGIN, X-Aura-Request:1. Giới hạn20 lần/phút/IP/process. Nhận `items` và `shippingMethod` giống quote, thêm:

```json
{
  "requestId": "UUID cố định cho một lần đặt hàng",
  "receiptToken": "64 ký tự hex ngẫu nhiên từ 32 byte ngẫu nhiên bảo mật",
  "items": [{"skuId": "UUID SKU", "quantity": 1}],
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "expectedTotal": 10050000,
  "expectedPrices": [{"skuId": "UUID SKU", "price": 10000000}],
  "customer": {"fullName": "Tên khách", "phone": "0901234567", "email": ""},
  "shippingAddress": {"address": "Địa chỉ", "province": "Tỉnh/thành", "ward": "Phường/xã", "district": "", "notes": ""}
}
```

Ví dụ trên mô tả shape; các chuỗi mô tả UUID/token phải được thay bằng giá trị hợp lệ. Email, district và notes không bắt buộc. Không nhận customerId từ client để xác định chủ đơn. Nếu cookie khách có  lực; không tự hạ thành guest khi cookie hết hạn. Khách không có cookie đặt guest.

Server chuẩn hóa input, tính fingerprint, khóa idempotency theo khách hoặc hash receiptToken + requestId. Cùng nội dung và cùng scope/key trả lại cùng đơn với HTTP200/replayed=true. Lần đầu trả201/replayed=false. Đổi nội dung với cùng key trả409 IDEMPOTENCY_CONFLICT. Khi lỗi mạng, giữ nguyên requestId, receiptToken và payload để retry; không tạo key mới cho đến khi biết kết quả yêu cầu cũ. Không ghi token vào URL hoặc log.

Trong một transaction SERIALIZABLE: kiểm tra phiên, khóa SKU theo thứ tự ổn định, đọc lại quote, đối chiếu từng giá và tổng tiền, giữ tồn bằng UPDATE có điều kiện, lưu order + order_items snapshot + payment COD PENDING + reservation HELD + sự kiện + idempotency. Bất kỳ lỗi nào rollback toàn bộ. Giá thay đổi trả409 PRICE_CHANGED; tồn thay đổi trả409 STOCK_CHANGED. Tiền trong response được chuẩn hóa số nguyên an toàn dù SQL driver trả bigint dưới dạng chuỗi.

Response `{replayed, order}` chứa snapshot người nhận/địa chỉ/items và trạng thái, không chứa token/hash. Item có skuId và configurationId riêng. Tổng tiền lấy từ server; expectedTotal/expectedPrices chỉ là điều kiện đồng ý giá, không phải nguồn giá.

## Đọc đơn và bảo vệ thông tin

`GET /api/v1/orders/:id`: đơn khách đăng nhập chỉ đọc bằng phiên của chính khách đó. Đơn guest cần header `X-Aura-Receipt` bằng receiptToken đã gửi lúc tạo. Server chỉ lưu SHA256 của token và so sánh constant-time. Biết ID/mã đơn hoặc email không đủ để đọc đơn; sai quyền/secret trả404. Guest token không mở được đơn thuộc tài khoản. Guest receipt là quyền đọc một đơn; chỉ chia sẻ với người được phép xem địa chỉ/người nhận.

Idempotency có expires_at30 ngày nhưng chưa có job xóa; khi bản ghi còn tồn tại, replay vẫn trả đơn cũ kể cả đã hủy. Không tự tạo lại đơn đã hết hạn bằng requestId cũ.

## Hết hạn giữ hàng

Mặc định hiện tại: giữ24 giờ cho đơn PENDING chưa thu tiền. Worker trong `server.ts` chạy khi khởi động và mỗi60 giây, tối đa100 đơn mỗi lượt, không chạy chồng trong cùng process. Nó khóa đơn/SKU, hoàn trả reserved, chuyển reservation thành EXPIRED, hủy đơn, tăng revision và thêm sự kiện trong một transaction. Nhiều worker không hoàn trả hai lần. Đơn CONFIRMED hoặc đã đánh dấu PAID không bị worker này tự hủy.

Worker chỉ hoạt động khi server đang chạy; sau downtime xử lý lại các đơn quá hạn. Nhiều hơn100 đơn hết hạn cần nhiều lượt. Đây chưa phải worker queue hoặc vận hành đa-instance đã nghiệm thu. Hủy thủ công, xác nhận/giao/hoàn tất đơn, tiêu thụ reservation và báo cáo tiếp tục ở bước vận hành sau.

## Kiểm chứng

31/31 test backend đạt trên SQL Server thật. Test mới bao phủ: input/giá đồng ý, retry đồng thời chỉ một order/payment/reservation, sai nội dung key, tranh sản phẩm cuối cùng (request thua trả STOCK_CHANGED), trigger lỗi sau khi giữ tồn gây rollback toàn bộ, snapshot không đổi theo catalog, quyền chủ đơn/guest, cookie thu hồi, HTTP201/200/404, expiry đồng thời chỉ trả tồn một lần và không hủy đơn đã xác nhận/đã thu tiền. Tests dùng AuraTest riêng và dọn sau khi chạy. Không tạo đơn thử trong AuraStore.

Typecheck và build backend đều đạt. Migration `003_order_receipts.sql` đã áp dụng thành công vào AuraStore cục bộ ngày 28/10/2026; chỉ thêm guest_receipt_hash và CHECK, không sửa001/002. Với môi trường khác, chạy `npm run db:migrate` rồi khởi động lại backend. Backend đang chạy từ bản cũ cũng cần khởi động lại để nhận API và worker mới.

Giao diện chưa gọi endpoint tạo đơn; không coi các test API này là nghiệm thu checkout browser. Nút đặt hàng vẫn khóa cho đến mốc B3.3 tích hợp form, receipt và retry an toàn.
