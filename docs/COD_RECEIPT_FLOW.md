# COD và xác nhận nhận hàng

Cập nhật 2026-11-13.

## Quy tắc

- Đã giao, đã thu tiền COD và đã nhận hàng là các thông tin riêng.
- Owner/Editor ghi nhận thu COD sau trạng thái Đã giao, kèm ghi chú đối soát và tích xác nhận. Chức năng chỉ ghi nhận, không thực hiện giao dịch chuyển tiền.
- Khách chỉ xác nhận nhận hàng hoặc báo chưa nhận trên đơn của mình sau khi đã giao.
- Sau đúng 7 ngày kể từ delivered_at, nếu chưa có phản hồi, worker tự xác nhận nhận hàng. Worker kiểm tra mỗi phút và khi ứng dụng khởi động; Docker tắt thì xử lý khi chạy lại.
- Báo chưa nhận hàng dừng tự xác nhận. Cửa hàng cần liên hệ khách/đơn vị vận chuyển. Khách có thể xác nhận lại khi đã nhận thực tế; quản trị không được xác nhận thay.
- Đủ cả thu tiền và nhận hàng (khách hoặc tự động), đơn tự Hoàn thành. Báo cáo doanh thu hiện tại tính tổng tiền đơn, gồm phí vận chuyển, theo ngày hoàn thành tại Việt Nam. Không tính đơn còn thiếu một trong hai điều kiện.
- Lưu lịch sử, khóa theo đơn và kiểm tra revision để chống thao tác trùng/xung đột. Worker không được tự đánh dấu PAID.
- Đơn hoàn thành cũ giữ doanh thu và được gắn nhãn LEGACY, không giả định khách đã bấm xác nhận. Đơn Đã giao cũ lấy thời điểm giao từ lịch sử; nếu thiếu thì dùng thời điểm migration.
- Thông báo/trạng thái hiển thị trong trang đơn hàng, chưa có gửi email hoặc push tự động cho mốc này.

## Test tay

1. Khách đặt COD. Quản trị vào đơn, chuyển Chuẩn bị → Đang giao → Đã giao.
2. Xác minh đơn vẫn Chưa thanh toán; giao hàng không tự ghi nhận doanh thu.
3. Bấm Ghi nhận đã thu tiền COD, nhập ghi chú đối soát, tích xác nhận rồi Lưu thao tác. Chỉ thực hiện khi thực tế đã thu tiền.
4. Khách mở Tài khoản → Đơn hàng → Chi tiết. Xem thời hạn, bấm Tôi đã nhận hàng, kiểm tra ghi chú, tích xác nhận, Lưu thao tác.
5. Đơn tự Hoàn thành, báo cáo trong khoảng ngày hiện tại tăng đúng một lần.
6. Thử thứ tự ngược: khách xác nhận trước, cửa hàng thu tiền sau. Doanh thu chỉ tăng sau bước cuối.
7. Với đơn khác, chọn Tôi chưa nhận được hàng. Hiển thị cảnh báo và dừng tự xác nhận; khách xác nhận lại khi nhận hàng.
8. Không sửa ngày đơn thật để thử 7 ngày. Kiểm thử tự động dùng database tạm kiểm tra quá hạn, chưa quá hạn, đơn có phản hồi, chạy worker đồng thời và đơn chưa thu tiền.

Kiểm chứng: 84/84 backend tests; browser thực hiện thu COD → khách nhận → hoàn thành, mobile không tràn ngang. Ảnh: docs/qa/order-receipt/.
