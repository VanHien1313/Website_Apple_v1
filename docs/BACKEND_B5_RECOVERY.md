# B5.4 — Restart và diễn tập backup/restore Docker

Ngày 08/11/2026. Áp dụng cho Compose local và SQL Server Developer, chưa phải quy trình DR production.

## Đã kiểm chứng

- Tạo database AuraTest ngẫu nhiên với schema thật và dữ liệu sản phẩm/SKU mẫu; restart service SQL Server rồi so sánh SKU, giá, tồn kho, số lượng giữ hàng: khớp.
- Backup COPY_ONLY với CHECKSUM và COMPRESSION; RESTORE VERIFYONLY WITH CHECKSUM thành công.
- Đổi dữ liệu nguồn sau backup, restore bản backup vào database AuraRestore riêng bằng MOVE đến file mới, không dùng REPLACE.
- So sánh danh mục, sản phẩm, tồn kho và migration checksum với snapshot trước backup: khớp. Database nguồn sau thay đổi khác snapshot, chứng minh restore đúng thời điểm backup.
- Schema readiness và DBCC CHECKDB trên bản restore đạt.
- Đã dọn hai database QA, container runner và đúng file backup QA vừa tạo. Không restore đè hoặc seed dữ liệu vào AuraStoreDocker.

Bằng chứng máy đọc được: [results.json](qa/docker-recovery/results.json).

Kiểm tra sau diễn tập: db/app healthy, HTTP/schema/quyền SQL/WebP tiếp tục đạt; cửa hàng có 1 admin, 0 sản phẩm, 0 đơn. Không còn container aura-qa. Tài khoản owner thật đã được tạo qua bước nhập riêng trên máy.

## Backup cửa hàng local

Từ thư mục gốc, Docker CLI ở PATH hoặc đặt DOCKER_PATH đến docker.exe:

```powershell
node deploy/backup-local.mjs
```

Helper chỉ chấp nhận cấu hình development/AuraStoreDocker của service init, đọc SA secret trong container. Mỗi lần tạo filename riêng, backup COPY_ONLY, kiểm tra SQL checksum rồi xuất file ra deploy/backups. SHA-256 file Windows phải khớp file trong SQL container. Chỉ xóa bản tạm trong volume sau khi export và manifest hoàn tất; nếu export lỗi, giữ bản SQL để phục hồi thủ công.

File .bak và manifest JSON (thời điểm, số byte, SHA-256) nằm trong deploy/backups, được loại khỏi Git và Docker build context. Backup thật đầu tiên đã tạo thành công, 606208 bytes, kiểm tra checksum khớp. Không đưa nội dung backup hoặc mật khẩu vào bằng chứng QA.

Backup có thể chứa thông tin khách hàng và password hash; chỉ lưu ở nơi có quyền truy cập phù hợp. Bản local chưa mã hóa, chưa có lịch tự động/retention hoặc bản sao ngoài máy; thư mục Windows riêng giúp tách khỏi vòng đời volume nhưng không bảo vệ khi cả máy/ổ đĩa hỏng.

## Chạy lại diễn tập

```powershell
node deploy/recovery-rehearsal.mjs
```

Lệnh restart service db của Compose, nên website local có thể tạm lỗi kết nối trong thời gian SQL khởi động. Dữ liệu QA dùng tên ngẫu nhiên và cleanup có giới hạn theo tên được tạo trong lần chạy. Nếu restore thất bại giữa chừng, kiểm tra database AuraRestore/file QA còn lại; không xóa hàng loạt AuraTest/AuraRestore theo wildcard.

## Khi cần phục hồi dữ liệu thật

Không chạy RESTORE WITH REPLACE vào database cửa hàng đang phục vụ. Trước tiên kiểm tra manifest/hash của bản export, copy vào SQL container, RESTORE VERIFYONLY và restore vào một tên database mới với các file MOVE riêng. Chạy CHECKDB, kiểm tra migrations và dữ liệu. Chỉ chuyển ứng dụng sang database đã nghiệm thu trong thời gian bảo trì đã thống nhất.

Diễn tập hiện tại dùng database QA trên cùng SQL instance. Chưa thử phục hồi sang máy/SQL instance mới: cần tái tạo login, ánh xạ user bằng ALTER USER ... WITH LOGIN, secrets và chứng chỉ; không coi database backup là bản sao login cấp server. Chưa kiểm chứng point-in-time recovery bằng chuỗi log backup.

## Bước tiếp theo

Chốt image digest đã kiểm thử, chuẩn bị cấu hình staging (HTTPS/proxy/secrets/SQL TLS), chọn hạ tầng hosting, chính sách backup ngoài máy và lịch lưu giữ. Không dùng nguyên Compose development làm production.

Tham khảo: [Microsoft BACKUP](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17), [giới hạn RESTORE VERIFYONLY](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17). VERIFYONLY không thay thế restore và CHECKDB; diễn tập đã thực hiện cả ba.
