# B4.4.2 — Tra cứu khách hàng

Ngày 30/10/2026. Hoàn thành phần danh sách/thông tin khách hàng đã đăng ký theo ma trận yêu cầu. Giao diện/API chỉ đọc; không thêm chức năng sửa/xóa hoặc khóa tài khoản khách ngoài phạm vi đã đặt ra.

## API và phân quyền

Owner và editor có phiên admin hoạt động được truy cập. Kiểm tra quyền trong transaction cùng lần đọc. Cookie customer không được dùng thay cookie admin; phiên hết hạn/thu hồi nhận401. Responses no-store. Các trường trả về được chọn tường minh, không SELECT *.

| Endpoint | Kết quả |
| --- | --- |
| GET /api/v1/admin/customers?q=&page=1 | `{items,total,page,pageSize}`; mỗi hồ sơ có id,fullName,email,phone,createdAt |
| GET /api/v1/admin/customers/:id?page=1 | `{customer,orders:{items,total,page,pageSize}}` |

q tối đa120 ký tự, tìm chuỗi literal trong tên/email/điện thoại; không dùng wildcard LIKE. page nguyên1..10000,20 dòng/trang, vượt cuối được clamp. Đơn trong chi tiết được sắp ngày mới nhất rồi ID, gồm id/orderCode/status/paymentStatus/total/createdAt. Tiền nguyên VND chuyển từ bigint theo ràng buộc an toàn đã có trong schema.

Chỉ liên kết đơn bằng orders.customer_id, không suy đoán từ email/điện thoại người nhận. Đơn guest trùng email và đơn của tài khoản khác bị loại. Tên/điện thoại hồ sơ hiện tại tách khỏi snapshot người nhận tại thời điểm đặt đơn. Khách chưa đặt hàng vẫn xem được hồ sơ với danh sách đơn rỗng.

Không trả password_hash, credential_version, session hoặc receipt token. Không có POST/PUT/DELETE cho khách hàng. ID không tồn tại trả404, query sai trả422, lỗi tải không dùng dữ liệu demo thay thế.

## Giao diện

- `/admin/customers`: tìm kiếm qua URL và phân trang server; thẻ hồ sơ, ngày tham gia theo giờ Việt Nam.
- `/admin/customers/:id`: hồ sơ liên hệ và danh sách đơn phân trang, liên kết đến màn vận hành đơn hiện có.
- Menu “Tra cứu khách hàng” trong trang quản trị cho owner/editor.
- Lazy route; tải lại khi cửa sổ được focus để kiểm tra lại phiên. Loading/error không hiển thị danh sách cũ; có empty/not-found/retry,401 chuyển đăng nhập. Bố cục390px/desktop dùng cùng design tokens.

## Kiểm chứng

66 test backend và41 test frontend đạt. Ca mới bao phủ dữ liệu trả về theo allowlist, tìm kiếm literal, phân trang/clamp, query sai, quyền admin/editor/customer/revoked, account-vs-guest/khách khác, hồ sơ rỗng,404 và HTTP chỉ đọc/no-store.

20 nhóm browser smoke đạt, gồm tìm theo email, mở hồ sơ, chỉ thấy đơn tài khoản và dẫn đến đơn, danh sách rỗng,404,503/retry không giữ bản cũ, kiểm tra tràn ngang mobile. Kết quả chạy cuối tại `docs/qa/api-frontend/results.json`; ảnh customer-detail-desktop.png, customer-detail-mobile.png, customers-mobile.png. Typecheck/build backend, build API frontend và kiểm tra ranh giới API/demo đạt.

Không cần migration: sử dụng chỉ mục orders_customer_created có sẵn. Không thay đổi dữ liệu thật trong AuraStore; test ghi vào database AuraTest riêng. Không có export danh sách liên hệ hoặc thống kê chi tiêu/lifetime value trong giai đoạn này.

Tiếp theo: rà soát các khoảng trống còn lại so với yêu cầu đề tài, cấu hình vận hành/triển khai và nghiệm thu tổng thể. Các giới hạn B4.4.1 (reset mật khẩu người khác, đổi email, audit log quyền) vẫn được ghi nhận riêng, không tự đánh dấu đã hoàn tất.
