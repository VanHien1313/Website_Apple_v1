# MoMo / ZaloPay và QR theo đơn — sandbox

## Trạng thái

Đã triển khai luồng kỹ thuật, lựa chọn checkout, trang phiên thanh toán, QR do cổng trả về, callback có kiểm tra chữ ký và truy vấn đối soát. Chưa có tài khoản merchant của nhóm nên chưa kiểm thử giao dịch trên hệ thống sandbox thật của nhà cung cấp. Mặc định PAYMENT_MODE=off; COD vẫn hoạt động, hai ví hiển thị chưa kích hoạt.

Không sử dụng tài khoản ví cá nhân hoặc khóa mẫu công khai làm thông tin merchant. Không hỗ trợ production trong phiên bản này; chỉ chấp nhận off/sandbox. Không có nút giả lập đã thanh toán trên website. Kiểm thử nội bộ sử dụng gateway giả trong database tạm, không gọi ví thật.

## Chuẩn bị tài khoản

1. MoMo: đọc [hồ sơ merchant](https://developers.momo.vn/v3/vi/docs/payment/onboarding/merchant-profile/) và [quy trình tích hợp](https://developers.momo.vn/v3/vi/docs/payment/onboarding/integration-process/). Đăng ký/cấp quyền theo yêu cầu MoMo; lấy Partner Code, Access Key, Secret Key của môi trường TEST. Nếu đồ án chưa đủ điều kiện hồ sơ, liên hệ hỗ trợ MoMo về tài khoản học tập/thử nghiệm; không khai hồ sơ doanh nghiệp giả.
2. ZaloPay: làm theo [hướng dẫn bắt đầu sandbox](https://developer.zalopay.vn/en/v1/start/), lấy App ID, Key1 và Key2 từ merchant sandbox do ZaloPay cấp.
3. Cần một địa chỉ HTTPS công khai cho callback. 127.0.0.1/localhost không nhận được callback từ nhà cung cấp. Chưa tự mở tunnel hay công khai website trong phiên này. Khi có tunnel/host cần cấu hình APP_ORIGIN tương ứng và truy cập website qua đúng origin đó; cookie đăng nhập local không tự chuyển sang tên miền khác.
4. Không gửi khóa trong chat, Git hay screenshot. File deploy/secrets/ đã được ignore. Backend cũng hỗ trợ biến *_FILE để đọc secret riêng.

## Cấu hình trên máy (khi đã có sandbox)

Copy deploy/payment-sandbox.env.example thành deploy/secrets/payment-sandbox.env bằng trình soạn thảo. Nhập PAYMENT_PUBLIC_ORIGIN, và bộ khóa của ít nhất một ví; bỏ trống tất cả trường của ví chưa có. PAYMENT_MODE=sandbox. Chỉ dùng khóa TEST.

compose.payment-sandbox.yaml là override cho service app (cổng 4000). Có thể bổ sung APP_ORIGIN=https://ten-mien-thu-nghiem vào environment trong override nếu dùng trình duyệt qua tên miền; cấu hình proxy HTTPS và cookie cần được kiểm tra cùng lúc. Không ghi khóa vào YAML.

Chạy từ D:\Apple_Web sau khi cấu hình:

```powershell
docker compose -f compose.yaml -f compose.demo.yaml -f compose.payment-sandbox.yaml up -d --no-deps app
```

Khởi động bằng compose.yaml thông thường lần sau sẽ bỏ cấu hình override. Để giữ sandbox cần tiếp tục dùng đúng tập file override. Cổng 4001 không được bật sandbox tự động.

Callback:
- POST /api/v1/payments/momo/callback
- POST /api/v1/payments/zalopay/callback

## Test tay sau cấu hình

1. Đăng nhập khách, chọn sản phẩm và vào checkout. Chọn ví đã bật; thấy nhãn Sandbox.
2. Tạo đơn, bấm Tạo phiên thanh toán / QR. QR chỉ xuất hiện khi cổng thực sự trả payload QR. Nếu merchant chưa được cấp quyền QR, dùng nút mở cổng; không tạo QR thay thế từ link.
3. Thực hiện thanh toán bằng ứng dụng/tài khoản TEST do nhà cung cấp hướng dẫn. Không dùng tiền thật.
4. Website nhận callback hoặc worker truy vấn và hiển thị đã xác minh thanh toán. Nút Kiểm tra thanh toán truy vấn lại (tối đa một lần/30 giây/đơn); trang tải trạng thái mỗi 10 giây.
5. Quản trị chỉ được xử lý giao hàng sau khi ví đã PAID; không có thao tác ghi nhận thu COD cho đơn ví.
6. Xác nhận nhận hàng giữ nguyên quy trình 7 ngày. Giao dịch sandbox KHÔNG cộng vào doanh thu thực.
7. Thử hủy/thất bại, mất callback, tải lại trang, callback trùng, sai chữ ký/số tiền. Không dựa vào tham số URL quay về để đánh dấu đã trả tiền.

## Giới hạn và đối soát

- Một phiên cổng/đơn, chống tạo trùng. Nếu gọi tạo phiên mất phản hồi, kiểm tra giao dịch; không tự tạo lần thứ hai. Có thể cần hỗ trợ merchant để phục hồi link phiên.
- MoMo giới hạn 1.000–50.000.000 VND theo tài liệu hiện tại; đơn vượt giới hạn bị từ chối trước khi tạo đơn MoMo.
- Phiên QR hiển thị tối đa 15 phút. Đơn giữ hàng theo chính sách 24 giờ hiện có. Cổng có thời hạn riêng; khi QR ẩn vẫn phải đối soát trước khi thanh toán lại.
- Worker kiểm tra mỗi phút, theo lô 10, với phiên chưa đối soát trong 7 ngày; nếu Docker tắt, kiểm tra tiếp khi chạy lại. Quá 7 ngày cần kiểm tra chủ động/merchant portal. Callback hợp lệ vẫn được tiếp nhận.
- Tiền đến sau khi hủy: lưu PAID, đánh dấu REVIEW, giữ đơn CANCELLED, không tự giao hàng/khôi phục tồn kho/cộng doanh thu. Quản trị cần đối soát và hoàn tiền qua merchant portal; chưa có API hoàn tiền trong website.
- Chưa có tích hợp production/UAT nhà cung cấp; không coi kiểm thử nội bộ là chứng nhận thanh toán thật.

## Nguồn chính thức

- [MoMo one-time wallet](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/)
- [MoMo query](https://developers.momo.vn/v3/vi/docs/payment/api/payment-api/query/)
- [ZaloPay create](https://docs.zalopay.vn/docs/specs/order-create/)
- [ZaloPay callback](https://docs.zalopay.vn/docs/developer-tools/knowledge-base/callback/)
- [ZaloPay query](https://docs.zalopay.vn/docs/specs/order-query/)

## Kết quả kiểm tra local

92/92 backend tests, 43/43 frontend tests, typecheck và Docker build thành công. Chrome kiểm tra hai lựa chọn ví bị khóa khi chưa cấu hình, COD đặt thành công, mobile không tràn ngang. Migration 011 đã áp dụng cho main/demo sau backup COPY_ONLY + CHECKSUM và RESTORE VERIFYONLY; số lượng sản phẩm/khách/đơn giữ nguyên. Chưa thực hiện giao dịch sandbox với MoMo/ZaloPay thật.
