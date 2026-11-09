# Đặt lại mật khẩu quản trị — 10/11/2026

Tiếp tục hoàn thiện và chạy local theo lựa chọn của người dùng; chưa có VPS/tên miền.

## Nghiệp vụ

Owner có thể đặt lại mật khẩu của tài khoản quản trị khác tại `/admin/users`, mở mục **Đặt lại mật khẩu**, nhập mật khẩu 12–128 ký tự và xác nhận đăng xuất mọi phiên của tài khoản đích. Không tự gửi email hoặc thông báo cho người khác. Tài khoản bị khóa vẫn bị khóa sau reset. Tài khoản của chính owner dùng luồng đổi mật khẩu hiện có với mật khẩu cũ.

POST `/api/v1/admin/users/:id/password` nhận `{ password, revision, confirmed: true }`. Cookie admin, Origin, X-Aura-Request và Content-Type JSON được kiểm tra như các mutation quản trị khác. Owner được kiểm tra trước khi hash và lại trong transaction sau khóa `admin:accounts`. Hash scrypt mới, credential_version và thu hồi sessions được ghi trong cùng transaction. Không cần migration mới.

Revision SQL rowversion bảo vệ trước thay đổi đồng thời: một request cũ không thể ghi đè mật khẩu mới hoặc trạng thái/quyền vừa được người khác sửa. DTO chỉ trả id/email/name/role/active/revision, không trả mật khẩu/hash/credential_version. Tự reset trả SELF_PROTECTED409; stale trả STALE_ACCOUNT409; không phải owner trả OWNER_REQUIRED403; thiếu xác nhận/password/revision sai trả422.

Form xóa mật khẩu ngay khi gửi, không lưu browser storage. Khi lỗi mạng/5xx/stale, form khóa thao tác và yêu cầu tải lại, không tự retry reset. Nếu mất phản hồi, việc tải lại chỉ xác nhận phiên bản tài khoản mới nhất; cần kiểm tra đăng nhập bằng mật khẩu đã chọn hoặc thực hiện một lần reset mới có chủ đích. Không thể đọc lại mật khẩu từ server.

## Kiểm chứng

- 77/77 backend tests trên SQL Server Windows đạt: reset thành công, mật khẩu cũ bị từ chối, phiên cũ bị thu hồi, owner/editor/anonymous/revoked/self, validation/Origin, stale và hai reset đồng thời, tài khoản khóa không được mở lại.
- Typecheck backend/frontend, build API, 41/41 frontend tests và runtime boundary đạt.
- 22/22 nhóm E2E Docker đạt. Đã kiểm tra ảnh mobile trực quan. E2E bổ sung luồng reset editor, xác nhận bắt buộc, đăng nhập cũ/mới, trường mật khẩu rỗng sau gửi và giao diện mobile. Kết quả lần chạy được lưu tại `docs/qa/docker-e2e/results.json`.

## Khôi phục Docker local trong phiên này

Docker Desktop lỗi khởi động do socket `engine.sock` cũ không thể rename. Log và thư mục đã kiểm tra: chỉ có socket 0 byte. Sau khi dừng các tiến trình Docker bị lỗi, đổi tên thư mục socket thành `C:\Users\my name\AppData\Local\docker-secrets-engine.preserved-20261110` rồi khởi động lại; Engine Linux và db/app trở lại healthy. Không reset Docker về factory defaults, không xóa volume hay database. Đây là khôi phục cho lần lỗi này, chưa chứng minh lỗi sẽ không tái diễn sau reboot. Tham khảo [báo cáo upstream](https://github.com/docker/for-win/issues/15064).

## Phạm vi còn lại

Chưa có bắt buộc đổi mật khẩu sau lần login đầu bằng mật khẩu owner đặt lại, gửi email mời/reset hoặc audit log quản trị riêng. Chưa đổi email đăng nhập và vẫn khóa thay xóa vật lý để giữ lịch sử. Image GHCR đã phát hành ngày 09/11 chưa có tính năng này; chỉ cập nhật local trong phiên làm việc này.

App local đã cập nhật tại http://127.0.0.1:4000, health/HTTP/SQL permissions/WebP đều đạt. Database vẫn 1 admin, 0 sản phẩm và 0 đơn, migrations001–007 giữ nguyên checksum. Không reset mật khẩu tài khoản thật.
