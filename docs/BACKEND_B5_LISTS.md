# B5.2 — Sắp xếp và lọc các danh sách chính

Ngày 02/11/2026. Bổ sung điều khiển tìm/lọc/sắp xếp cho năm màn danh sách chính: sản phẩm, danh mục, khách hàng, tài khoản quản trị và đơn hàng. Dữ liệu được lọc, đếm, sắp xếp và phân trang ở SQL Server; không tải toàn bảng về client.

## Hợp đồng query bổ sung

Các tham số tìm kiếm/phân trang cũ giữ nguyên. sort bỏ trống dùng mặc định cũ. Giá trị ngoài allowlist, object/array hoặc tên thuộc prototype như constructor/__proto__ trả422 INVALID_QUERY.

| Endpoint danh sách | sort | Bộ lọc |
| --- | --- | --- |
| /admin/products | newest (mặc định), oldest, name_asc, name_desc | active=true/false hoặc bỏ trống như trước |
| /admin/categories | name_asc (mặc định), name_desc | usage=all/used/empty |
| /admin/customers | newest (mặc định), oldest, name_asc, name_desc | orders=all/placed/none |
| /admin/users | oldest (mặc định), newest, name_asc, name_desc | role=all/owner/editor, active=all/true/false |
| /admin/orders và /account/orders | newest (mặc định), oldest, total_asc, total_desc | status như trước |

used tính mọi sản phẩm trong danh mục, kể cả sản phẩm đã ẩn. placed tính đơn có customer_id khớp, gồm các trạng thái đã hủy; không ghép email đơn guest. none nghĩa là chưa có bất kỳ đơn gắn tài khoản. Lọc không thay đổi quyền owner-only của /admin/users hoặc quyền sở hữu /account/orders.

`list-query.ts` chỉ trả các đoạn SQL cố định do server khai báo. Không ghép request text thành tên cột/hướng sort. q vẫn truyền tham số; filter enum chọn predicate cố định. COUNT và items dùng cùng WHERE trong transaction. ORDER BY luôn có ID làm tiêu chí phụ để ổn định khi tên/ngày/tiền bằng nhau. Phân trang vẫn20 dòng, clamp về trang cuối nếu bộ lọc làm giảm tổng.

## Giao diện

`ListOptions` dùng chung phần điều khiển; từng trang giữ tìm kiếm/trạng thái và nghiệp vụ riêng. Submit form ghi lựa chọn vào URL và bỏ page để về trang1. Nút chuyển trang giữ toàn bộ query; tải lại trình duyệt khôi phục lựa chọn. Khi tải/lỗi không hiển thị kết quả cũ. Bộ lọc có nhãn, bố cục mobile một cột và desktop nhiều cột.

Các giá trị mặc định không thay đổi hành vi URL cũ. Sau tạo tài khoản quản trị thành công, trang vẫn chuyển sang tìm email vừa tạo để người dùng thấy kết quả.

## Kiểm chứng và giới hạn

71 test backend đạt: thứ tự tên, tổng tiền; bộ lọc danh mục/khách/quyền/trạng thái và tổng đếm; loại đơn guest khỏi điều kiện đã đặt; vẫn giới hạn đơn khách theo chủ sở hữu; từ chối array, prototype key và giá trị giống SQL injection. Các kiểm thử phân trang/đồng thời/nghiệp vụ trước đó vẫn đạt.

21 nhóm Chrome smoke đạt trên backend đã biên dịch và frontend đã build: thao tác cả năm màn, đổi filter reset page, reload giữ sort, kết quả rỗng, trạng thái tài khoản và kiểm tra mobile. 41 test frontend, typecheck/build backend, build API và kiểm tra ranh giới API/demo đạt. Bằng chứng cuối trong `docs/qa/api-packaged/results.json`; ảnh list-filters-mobile.png và list-filters-desktop.png đã được kiểm tra trực quan.

Không cần migration. Đây là năm danh sách chính và danh sách đơn của khách; bảng đơn lồng trong hồ sơ khách vẫn theo ngày mới nhất, bảng báo cáo theo kỳ thời gian. Không tuyên bố mọi bảng phụ có bộ lọc tổng quát. Chưa có bộ lọc khoảng ngày cho danh sách khách/admin hoặc bộ lọc giá cho danh sách quản trị sản phẩm (catalog phía cửa hàng đã có lọc giá).

Bước tiếp theo là chuẩn bị Docker toàn ứng dụng và kiểm tra quy trình triển khai; các khoảng trống còn lại trong ma trận B5.1 phải được rà trước nghiệm thu cuối.
