> Cập nhật 10/11/2026: đã bổ sung POST /api/v1/admin/users/:id/password cho owner đặt lại mật khẩu tài khoản khác; [nghiệp vụ và kiểm thử](ADMIN_PASSWORD_RESET.md). Người dùng chọn tiếp tục chạy local, chưa có VPS/tên miền.

# B4.4.1 — Tài khoản quản trị SQL Server

Ngày 30/10/2026. Đã nối API và giao diện `/admin/users` cho tài khoản nội bộ owner/editor. Đây không phải danh sách khách hàng mua hàng; phần khách hàng là bước tiếp theo.

## Quyền và hành vi

Chỉ owner đang hoạt động với phiên hợp lệ được đọc/tạo/cập nhật tài khoản quản trị. Editor nhận 403; khách hàng, phiên thu hồi/hết hạn và chưa đăng nhập nhận 401. Menu tài khoản chỉ hiện với owner; API vẫn tự kiểm tra quyền, không dựa vào việc ẩn menu.

- Tìm theo tên/email, phân trang SQL 20 dòng; không tải toàn bảng về trình duyệt.
- Tạo tên, email, mật khẩu ban đầu, vai trò owner/editor, trạng thái. UI mặc định editor đang hoạt động. Email chuẩn hóa chữ thường và duy nhất trong bảng admin.
- Sửa tên, đổi quyền, khóa/mở khóa. Email giữ nguyên; không xóa vật lý nên lịch sử đơn vẫn tham chiếu đúng người xử lý.
- Không cho tự khóa hoặc hạ quyền tài khoản đang thực hiện thao tác. Các thay đổi tài khoản tuần tự hóa bằng khóa transaction, kiểm tra lại quyền sau khi lấy khóa; hai owner không thể cùng khóa nhau thành công.
- Đổi role hoặc active tăng credential_version và thu hồi toàn bộ phiên của tài khoản đích trong cùng transaction. Mở khóa không khôi phục phiên cũ. Đổi tên không buộc đăng nhập lại.

## Hợp đồng API

Cookie HttpOnly `aura_admin` (hoặc `__Host-aura_admin` khi secure). POST/PUT yêu cầu Origin đúng, `X-Aura-Request: 1`, Content-Type JSON, body tối đa16KB.

| Endpoint | Payload / kết quả |
| --- | --- |
| GET /api/v1/admin/users?q=&page=1 | `{items,total,page,pageSize,actorId}`; q tối đa120 ký tự, page1..10000 |
| POST /api/v1/admin/users | `{email,name,password,role,active}` →201, tài khoản đã tạo |
| PUT /api/v1/admin/users/:id | `{name,role,active,revision}` →200, tài khoản mới nhất |

DTO tài khoản chỉ có id/email/name/role/active/revision. Không trả password/password_hash/credential_version/token. Password theo helper scrypt hiện có, dài12–128 ký tự; kiểm tra quyền trước khi hash và kiểm tra lại trong transaction ghi. Không log body yêu cầu.

Migration007 thêm rowversion cho admin_users. revision hex16 từ SQL binary(8), thay đổi khi sửa tài khoản hoặc đổi mật khẩu. PUT cũ trả409 STALE_ACCOUNT; tên/quyền/trạng thái không bị ghi đè. Các lỗi khác: OWNER_REQUIRED403, EMAIL_EXISTS409, SELF_PROTECTED409, NOT_FOUND404, INVALID_ACCOUNT/INVALID_REVISION/INVALID_QUERY422.

Tạo không tự retry khi mất phản hồi. Email unique ngăn tạo trùng cùng email. Khi chưa rõ kết quả, UI khóa thao tác, yêu cầu tải lại và tìm email để kiểm tra; mật khẩu nhập sẽ bị xóa sau lần gửi. Không có mật khẩu trong localStorage/sessionStorage. Trình quản lý mật khẩu của trình duyệt do người dùng kiểm soát riêng.

## Giao diện và kiểm thử

Trang dùng lazy route, form controls/tokens hiện có; không nhập demo repository. Xác nhận bắt buộc khi đổi quyền/trạng thái. Tài khoản hiện tại có lựa chọn role/active bị khóa. Khi stale/lỗi mạng/5xx, form chặn lưu cho đến tải lại, thông báo sẽ bỏ thay đổi chưa lưu. 401 chuyển đăng nhập, 403 chỉ hiển thị thông báo quyền và không có form.

Backend: 63 test đạt, gồm editor/customer/revoked không được quản trị; mật khẩu hash và DTO không lộ dữ liệu bí mật; trùng email; khóa/đổi quyền thu hồi phiên; mở khóa không phục hồi phiên; form cũ; phân trang; Origin; hai owner đồng thời khóa nhau. Frontend: 41 test đạt. Browser smoke được mở rộng với tạo editor, quyền403, stale, xác nhận khóa, phiên cũ bị thu hồi và mobile390px. Bằng chứng cuối tại `docs/qa/api-frontend/results.json`, ảnh admin-users-desktop.png và admin-users-mobile.png.

## Phần còn lại

Chưa có quản trị khách hàng, reset mật khẩu của người khác, mời qua email, thay email đăng nhập hoặc audit log riêng cho sửa quyền. Người dùng vẫn có endpoint tự đổi mật khẩu với mật khẩu hiện tại. Chưa coi toàn bộ hạng mục quản trị người dùng là hoàn tất.

Migration007 đã áp dụng thành công vào AuraStore ngày 30/10/2026. Môi trường khác cần chạy db:migrate trước khi chạy bản backend này. Typecheck/build backend, build API frontend và kiểm tra ranh giới API/demo đều đạt. 19 nhóm browser smoke đạt; ảnh mobile đã kiểm tra trực quan, không tràn ngang. Test chỉ ghi trên AuraTest riêng, không tạo tài khoản thử trong AuraStore.
