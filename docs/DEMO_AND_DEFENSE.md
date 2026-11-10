# Kịch bản demo và chuẩn bị bảo vệ Aura

Cập nhật 10/11/2026. Hạn hoàn tất do nhóm xác nhận: **thứ Sáu 13/11/2026**. Đây là kịch bản đề xuất; thời lượng và mẫu báo cáo chính thức vẫn theo giảng viên.

## Nhóm thực hiện

| Thành viên | MSSV | Đóng góp được nhóm xác nhận |
| --- | --- | --- |
| Nguyễn Văn Hiền | N23DCAT023 | Trực tiếp thiết kế và phát triển website |
| Khuất Nguyễn Bảo Hiếu | N23DCAT026 | Trực tiếp thiết kế và phát triển website |

Email được phép công khai: nguyenvanhien1313.tv@gmail.com. Không dùng email owner database làm thông tin liên hệ công khai. Chưa phân chia chi tiết module hoặc tỷ lệ đóng góp; nhóm phải tự bổ sung đúng thực tế.

## Mốc bàn giao đề xuất

- **10/11:** hoàn thiện điều hướng, giới thiệu/liên hệ, profile; chạy nghiệm thu kỹ thuật và cập nhật Docker local.
- **11/11:** nhóm test tay theo MANUAL_TEST_GUIDE; tạo dữ liệu trình diễn; sửa lỗi P0/P1 và chốt các khác biệt yêu cầu với giảng viên.
- **12/11:** chốt phiên bản demo; hoàn thiện báo cáo, slide, quay video; diễn tập trình bày và sửa code. Nếu chưa có hosting, phải ghi rõ chưa đạt mục hosting và quyết định hạ tầng ngay.
- **13/11:** kiểm tra chạy lại, đóng gói source/tài liệu/video, xác nhận quyền truy cập repo và nộp. Tránh thay đổi schema hoặc thêm OAuth sát giờ nếu chưa nghiệm thu.

Các mốc là thứ tự ưu tiên, không phải cam kết mọi mục đã xong.

## Chuẩn bị dữ liệu và môi trường

1. Docker app/db healthy; truy cập đúng http://127.0.0.1:4000. Không dùng bản Vite demo để minh họa dữ liệu SQL Server.
2. Dùng profile trình duyệt riêng cho owner/editor/customer. Không chiếu mật khẩu, cookie, token, secrets hoặc thông tin khách thật.
3. Theo mục 2 của MANUAL_TEST_GUIDE tạo sản phẩm TEST-TAY, SKU có hàng/hết hàng, danh mục, editor và khách thử. Không reset volume hoặc seed đè dữ liệu hiện có.
4. Ghi tồn ban đầu và mã các đơn thử. Không khẳng định doanh thu về 0 nếu đã có đơn hoàn thành từ lần chạy trước.
5. Chuẩn bị ảnh sản phẩm được phép sử dụng, backup theo runbook và bản source có thể mở để giải thích.

## Luồng trình diễn chính

| Bước | Thao tác | Bằng chứng cần thể hiện |
| --- | --- | --- |
| 1 | Trang chủ → Về Aura → Liên hệ | Hai thành viên/MSSV, email thật, điều hướng desktop/mobile |
| 2 | Tìm sản phẩm, lọc/sort, mở chi tiết | SQL catalog; cấu hình hết hàng không đặt được |
| 3 | Đăng nhập chọn Khách hàng; đăng ký/đăng nhập | Hồ sơ có tên/email/SĐT/ngày tham gia; dữ liệu riêng của khách |
| 4 | Đặt 1 sản phẩm giá 10 triệu, giao tiêu chuẩn | Tổng 10.050.000 đồng; không miễn ship ở đúng ngưỡng 10 triệu |
| 5 | Chọn Quản trị viên, đăng nhập owner | Sidebar đúng vai trò; đơn vừa tạo hiện trong quản trị |
| 6 | PENDING → PROCESSING → SHIPPED → DELIVERED | Lịch sử, ghi chú, tồn kho thay đổi đúng ở SHIPPED |
| 7 | Ghi nhận PAID → COMPLETED | COD là ghi nhận tiền đã thu, không phải chuyển tiền online |
| 8 | Mở báo cáo đúng kỳ hoàn thành | Doanh thu tăng đúng tổng đơn, chỉ COMPLETED + PAID |
| 9 | Khách xem đơn; editor mở chức năng quản lý admin | Khách chỉ xem đơn của mình; editor không có quyền quản lý admin |
| 10 | Mở mobile, thử đường dẫn sai | Drawer đóng sau chọn; 404 đúng; không tràn ngang |

Đơn vãng lai demo riêng: không gắn với tài khoản chỉ vì trùng email. Quyền xem nằm trong phiên tab đã đặt; URL không chứa receipt token.

## Tình huống phản biện nên chuẩn bị

- Hai người đặt SKU cuối cùng: transaction/khóa và kiểm tra available ngăn bán quá tồn.
- Đặt thành công nhưng mất phản hồi: idempotency giúp lần thử lại không tạo đơn/giữ hàng lần hai.
- Hai admin sửa cùng dữ liệu: revision cũ bị từ chối, phải đọc lại bản máy chủ.
- Khóa/đổi quyền/reset password admin: thu hồi phiên; không chỉ ẩn nút ở giao diện.
- Giá frontend bị sửa: backend tính tiền từ SQL, không tin tổng tiền gửi từ client.
- Hủy đơn: giải phóng reserved; SHIPPED trừ on_hand và reserved một lần.
- Bảo vệ lịch sử: đơn lưu snapshot tên/giá/người nhận; order_events chỉ append.
- Vì sao website ban đầu trống: database Docker tách biệt; không tự lấy mock frontend làm dữ liệu thật.

## Khung slide/video

1. Nhóm và đề tài; 2. Vấn đề/phạm vi; 3. Actor và phân quyền; 4. Kiến trúc React–API–SQL Server;
5. ERD; 6. Luồng mua hàng và giữ tồn; 7. Demo; 8. Kết quả kiểm thử và Docker; 9. Giới hạn còn lại; 10. Hướng phát triển.

Video dùng luồng thật trên local, ghi ngày và phiên bản source. Quay đoạn ngắn cho từng luồng để dễ thay đoạn có lỗi; không dùng số test cũ chứng minh code mới. Chưa có video/slide thành phẩm chỉ từ tài liệu này.

## Diễn tập sửa code

Mỗi thành viên cần tự giải thích và thực hiện được ít nhất một thay đổi nhỏ: sửa nhãn giao diện, thêm kiểm tra input, điều chỉnh bộ lọc rồi chạy kiểm tra tương ứng. Không học thuộc mô tả mà không mở được vị trí xử lý. Trình bày trung thực nguồn tham khảo và công cụ AI đã sử dụng.

Tài liệu liên quan: [test tay](MANUAL_TEST_GUIDE.md), [khung báo cáo và sơ đồ](REPORT_DRAFT.md), [phạm vi nghiệm thu](ACCEPTANCE_SCOPE.md), [kế hoạch còn lại](REMAINING_WORK_PLAN.md).
