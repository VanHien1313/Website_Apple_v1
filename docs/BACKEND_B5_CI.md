# B5.6 — Kiểm thử tự động trước phát hành

Ngày 09/11/2026. Đã chuẩn bị `.github/workflows/verify.yml`; chưa push repository hoặc chạy GitHub Actions trên dịch vụ thật.

## Quy trình

Workflow chạy trên GitHub-hosted Ubuntu 24.04 khi push, pull_request hoặc workflow_dispatch. Node 24.22.2 khớp image đã kiểm thử. Chỉ quyền contents:read, checkout không lưu credential, không dùng pull_request_target hoặc secret staging/production.

1. Cài frontend/backend từ lockfile (backend bỏ install scripts Windows-only).
2. Typecheck/build backend, test frontend, kiểm tra ranh giới API/demo và 6 test staging preflight (gồm Compose CLI).
3. Tạo secret ngẫu nhiên mới trên runner, build app bằng Dockerfile đã pin base digest, chạy Compose và đợi healthcheck.
4. Chạy toàn bộ test backend trong Linux container với SQL Server Docker và database AuraTest riêng.
5. Cài Playwright 1.62.1/Chromium, chạy 21 nhóm E2E trên image app thật và database riêng.
6. Diễn tập restart SQL và backup/restore dữ liệu thử.
7. Chỉ upload thư mục bằng chứng E2E/recovery, giữ 7 ngày; không upload secret, backup, .env hay toàn bộ workspace. Xóa bằng chứng cũ trong checkout tạm trước chạy để không nhầm kết quả đã commit là kết quả CI mới.
8. Dọn stack/volume trên runner tạm trong bước always. Không chạy lệnh cleanup CI trên máy phát triển đang giữ dữ liệu cửa hàng.

Actions checkout/setup-node/upload-artifact đều là repository chính thức `actions/*`, đã tra tag v6 và ghim full commit SHA ngày 09/11/2026. Playwright tooling cài vào RUNNER_TEMP, không thêm dependency vào ứng dụng.

## Kiểm thử Linux trên máy hiện tại

```powershell
$env:DOCKER_PATH='C:\Program Files\Docker\Docker\resources\bin\docker.exe'
npm run test:backend:docker
```

Cần app image đã build và SQL service đang healthy. Script mount source/tests read-only vào container init một lần, dùng production Linux dependencies của image. TEST_DB_PASSWORD_FILE đọc secret trong container; không xuất mật khẩu vào shell hoặc log. Database helper từ chối đồng thời TEST_DB_PASSWORD và TEST_DB_PASSWORD_FILE. Test chạy tối đa hai file đồng thời để giảm áp lực tài nguyên.

Kết quả thực tế: **74/74 backend test đạt trên Linux/SQL Server Docker**, khoảng 81 giây phần Node test runner. Bao gồm transaction/concurrency, migrations, auth/session, phân quyền, tồn kho/checkout, CRUD, upload WebP, proxy và báo cáo. Backend typecheck và JS syntax cũng đạt. Không rebuild runtime app vì thay đổi phiên này chỉ ở workflow/helper/test.

## Secrets trên Linux runner

`node deploy/new-local-secrets.mjs` tương đương helper PowerShell: tạo hai file nếu chưa có, không ghi đè, không in giá trị. File mặc định mode 0600 và thư mục 0700. Riêng runner CI tạm đổi hai file thành 0444 để SQL uid 10001 và Node uid 1000 đọc bind mount; thư mục host vẫn 0700. Không áp dụng thay quyền này lên secrets của máy người dùng trong phiên làm việc này.

## Đã kiểm tra / còn lại

- Đã parse YAML và kiểm tra triggers, permissions, full SHA actions, không tham chiếu GitHub secrets, cleanup always.
- Đã thực thi toàn bộ 74 test backend bằng lệnh Docker mới trên máy hiện tại.
- Những luồng 21 E2E và recovery đã chạy ở B5.3–B5.4; workflow tái sử dụng các runner đó. Chưa chạy trọn workflow trên một Ubuntu GitHub runner mới, chưa xác nhận provisioning Chromium/nguồn tải mạng trong CI.
- Chưa push code, kích hoạt workflow, cấu hình branch protection, registry push hay deployment. Sau khi repository được đưa lên GitHub theo quyết định của người dùng, cần quan sát lần chạy đầu và đặt job verify làm required check nếu phù hợp.
- CI chỉ kiểm thử, không tự deploy. Staging vẫn cần máy chủ/tên miền/registry/chứng chỉ và nghiệm thu mạng/TLS thật.

Nguồn: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [Playwright CI](https://playwright.dev/docs/ci).
