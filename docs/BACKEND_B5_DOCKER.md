# B5.3 — Docker toàn ứng dụng, đã chạy local

> Cập nhật tiếp theo: [B5.4 — Recovery](BACKEND_B5_RECOVERY.md) đã kiểm chứng dữ liệu tồn kho qua restart, backup/restore/CHECKDB trên database QA và xuất backup cửa hàng ra Windows. Những mục “còn lại” phía dưới phản ánh mốc B5.3 trước B5.4.

## Kết quả triển khai ngày 08/11/2026

**Nghiệm thu nghiệp vụ Docker:** 21/21 nhóm Chrome đạt trên image Linux app + SQL Server container, bằng chứng `docs/qa/docker-e2e/results.json` (`frontend: docker-linux-app-and-sql`). Bao gồm catalog/giỏ, checkout COD/giá đổi/tồn kho/gửi lặp/phản hồi thất lạc, khách hàng/ownership/session, fulfillment và doanh thu, CRUD danh mục/sản phẩm/admin, upload PNG→WebP, bộ lọc danh sách, 403 và mobile. Helper `backend/scripts/docker-fixture.mjs` tạo database AuraTest ngẫu nhiên, dùng app login giới hạn quyền, chạy app thử cổng 3015; cleanup chỉ xóa database mới do lần chạy tạo và hai container QA. Không ghi test fixture vào AuraStoreDocker.

Chạy lại E2E sau khi build image và db/init local đã sẵn sàng (Docker CLI ở PATH, hoặc chỉ định DOCKER_PATH; Playwright/Chrome cần cài sẵn):

```powershell
$env:DOCKER_FRONTEND_SMOKE='true'
$env:PLAYWRIGHT_MODULE='C:/Users/my name/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
$env:CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:frontend --prefix backend
```

Đã build image và chạy SQL Server + init + app tại http://127.0.0.1:4000. Database AuraStoreDocker đã áp dụng đủ migrations 001–007. db/app healthy; init exited 0. Không thay đổi AuraStore trên Windows.

Lần khởi động SQL đầu tiên làm init thất bại; chạy lại sau khi SQL sẵn sàng thành công. Đã bổ sung healthcheck SQL thực sự bằng sqlcmd và đổi dependency init sang service_healthy (start_period 180s, 30 retries mỗi 10s). Đã tạo lại container db với volume cũ và chạy lại init: thành công, 7 checksum migrations được giữ nguyên. Chưa kiểm chứng lưu giữ đơn/sản phẩm qua restart vì database mới chưa có dữ liệu nghiệp vụ.

`deploy/verify-local.mjs` kiểm tra chỉ đọc trong app: schema readiness, user Linux uid 1000, SQL không sysadmin/CREATE TABLE, có INSERT categories nhưng không UPDATE schema_migrations, không được mount SA secret, tạo/đọc ảnh WebP và HTTP readiness/home/admin login/404 API. Tất cả đạt trước và sau tạo lại container database. Bằng chứng: `docs/qa/docker-local/verification.json`.

`deploy/browser-local.mjs` dùng Chrome kiểm tra home/admin login ở 1440px và 390px; 4 trường hợp đạt, không pageerror/HTTP5xx/overflow ngang. Ảnh và kết quả nằm trong `docs/qa/docker-local/`. Kiểm thử nghiệp vụ bổ sung trong docker-e2e như ghi ở đầu mục này.

Build phát hiện hai cảnh báo npm ở công cụ frontend; đã cập nhật lockfile Vite 6.4.5 và postcss-selector-parser 6.1.5. Audit sau cập nhật không còn cảnh báo, 41 test frontend và test boundary đạt, image đã build lại thành công. Không thay đổi React hay nâng major framework.

Tạo owner bằng `deploy/New-DockerOwner.ps1` (hỗ trợ `-Email` để điền sẵn email); mật khẩu nhập riêng qua secure prompt. Bằng chứng docker-local ghi số lượng dữ liệu tại thời điểm chạy. Owner/CRUD/checkout đã nghiệm thu với tài khoản QA riêng; owner thật còn phụ thuộc nhập mật khẩu trên máy. Còn kiểm tra dữ liệu nghiệp vụ qua restart, backup-restore, chốt digest image và staging/hosting. Các ghi chép dưới đây trước mục Cấu trúc là lịch sử chuẩn bị môi trường.

Chạy lại kiểm tra sau khi app đã healthy:

```powershell
Get-Content -Raw deploy/verify-local.mjs | docker compose exec -T app node --input-type=module
```

## Kiểm tra môi trường ngày 08/11/2026

**Sau restart lúc 17:42 ngày 08/11:** WSL mặc định docker-desktop/version 2 hoạt động; Docker Desktop 4.98.0 trả cả Client và Server (Engine 29.9.2, linux/amd64). `docker run --rm hello-world` tải image và chạy thành công; `docker compose config --quiet` đạt. `docker compose ps -a` chưa có container project. Sẵn sàng build/up; chưa nghiệm thu ứng dụng Docker. Truy cập Docker/WSL từ sandbox bị Access denied nhưng kiểm tra ngoài sandbox thành công, không phải lỗi cài đặt.

**Cập nhật sau lần thử lại:** WSL 3.0.1.0 đã cài qua Microsoft Store. Docker Desktop 4.98.0 cài thành công (log installer: `Installation succeeded`); Docker CLI 29.9.2 và Compose v5.6.1 hoạt động. Installer đã bật VirtualMachinePlatform và Microsoft-Windows-Subsystem-Linux và xác nhận cần restart Windows. Đã tạo hai secret bằng New-LocalSecrets.ps1, xác nhận git check-ignore và chạy `docker compose config --quiet` thành công. Chưa build/chạy container vì cần người dùng restart máy. Sau restart: mở Docker Desktop, kiểm tra engine rồi build/up và nghiệm thu SQL/app. Các mục dưới ghi lịch sử lỗi trước khi cài thành công.

- WSL vẫn báo chưa cài. `wsl --install --no-distribution --no-launch` thất bại; hai lần tải gói Microsoft.WSL 2.7.14 qua winget/GitHub gặp HTTP 504. Cài qua Microsoft Store chưa có kết quả hoàn tất và đã dừng lệnh chờ.
- Docker Desktop 4.98.0 đã tải từ nguồn Docker và winget xác minh checksum thành công. Log installer ghi yêu cầu nâng quyền UAC bị hủy (`The operation was canceled by the user`); đã dừng lệnh winget chờ. Chưa tìm thấy Docker CLI ở hai đường dẫn cài all-users/per-user đã kiểm tra.
- Chưa build image, chạy Compose, tạo secrets hoặc tạo database Docker trong phiên này. Chưa nghiệm thu container. Cần hoàn tất cài WSL/Docker với quyền Windows thích hợp, khởi động lại nếu được yêu cầu, rồi tiếp tục các bước bên dưới.

Ngày 02/11/2026. Đã chuẩn bị Dockerfile, Compose local, khởi tạo DB/migration và helper quản lý secret/bootstrap. **Máy hiện không có Docker CLI/Desktop ở PATH hoặc đường dẫn cài đặt thông thường; chưa build image, chưa chạy Compose, chưa nghiệm thu Linux/native dependencies hoặc SQL login/grants trong container.** Không coi các kiểm tra YAML/Node/Windows là thay thế nghiệm thu Docker.

## Cấu trúc

Dockerfile nhiều stage: build frontend API, build TypeScript backend, giữ production dependencies, rồi copy dist/migrations/dist-api sang image chạy bằng user node. Không copy node_modules Windows, .env, Git, secret, bản SQL backup hoặc tài liệu QA. Native install scripts backend được bỏ qua vì msnodesqlv8 không được dùng trong Linux DB_AUTH=sql; giữ optional packages của sharp. Build kiểm tra sharp tạo WebP cùng import mssql đã đạt trên Linux.

Compose gốc chạy ba service:

1. db: SQL Server2022 Developer, volume riêng, không publish cổng1433. SA password được đọc từ secret file.
2. init: dùng SA để chờ DB, tạo AuraStoreDocker nếu chưa có, tạo login aura_docker_app nếu chưa có, chạy migrations001–007, cấp quyền dữ liệu và kiểm tra readiness bằng tài khoản ứng dụng. Không DROP/reset DB, không tự đổi password của login cũ.
3. app: chỉ nhận app password, chạy Express/frontend đã build trên127.0.0.1:4000, read-only filesystem + /tmp riêng, bỏ Linux capabilities. Chỉ bắt đầu sau khi init hoàn thành thành công. Không tự seed sản phẩm/tạo owner.

Tài khoản app được SELECT/INSERT/UPDATE/DELETE trong schema dbo; bị cấm sửa bảng schema_migrations, không được cấp quyền DDL/server admin. Đây là mức quyền theo ứng dụng hiện tại, chưa phải phân quyền stored procedure theo từng chức năng. Việc cấp quyền cần xác minh bằng smoke test container.

Dockerfile mặc định NODE_ENV=production; Compose local chủ động dùng development, HTTP và chứng chỉ SQL tự ký. **Không dùng nguyên Compose local làm hosting production.** Database/volume này tách khỏi AuraStore trên SQLEXPRESS của Windows.

## Chạy khi Docker đã sẵn sàng

Cần Docker Engine chạy Linux containers/Compose plugin và host phù hợp SQL Server Linux. Compose SQL dùng platform linux/amd64. Không tự cài Docker hoặc đổi cấu hình hệ thống trong bước này.

Từ gốc repo, PowerShell:

```powershell
./deploy/New-LocalSecrets.ps1
docker compose config --quiet
docker compose up --build -d
docker compose ps -a
docker compose logs init app
./deploy/New-DockerOwner.ps1
```

Helper secrets tạo hai mật khẩu ngẫu nhiên, không in giá trị và không ghi đè file đã tồn tại. File nguồn nằm trong deploy/secrets, bị Git/Docker context loại bỏ; vẫn là plaintext trên máy host, cần giới hạn quyền truy cập và không đưa vào file chia sẻ. Bootstrap nhập mật khẩu bằng secure prompt, gửi JSON qua stdin, từ chối nếu đã có admin. Không gõ mật khẩu vào lệnh shell hoặc commit vào .env.

Mở http://127.0.0.1:4000, kiểm tra /health/ready, đăng nhập /admin/login, tạo danh mục/sản phẩm rồi đặt đơn thử. Database mới không có sản phẩm demo. Nếu cổng4000 đang dùng, dừng đúng backend dev hoặc sửa cả port mapping và APP_ORIGIN đồng bộ.

Dừng bằng `docker compose down` để giữ volume. Không dùng `down -v` khi cần giữ dữ liệu. Rebuild không tự xoay vòng mật khẩu. Nếu đổi file secret sau lần khởi tạo, cần kế hoạch thay password SQL tương ứng; init sẽ thất bại khi app credential không khớp thay vì reset dữ liệu.

Khi nâng cấp phiên bản đã có container app chạy, dừng app, chạy init một lần bằng image mới rồi khởi động app; không dựa vào việc container init cũ đã exited0:

```powershell
docker compose stop app
docker compose build
docker compose run --rm init
docker compose up -d app
```

Chỉ chạy dòng cuối khi init thành công. Sao lưu database trước thay schema; hiện chưa có diễn tập backup/restore tự động.

## Kiểm tra đã làm / còn phải làm

Đã parse YAML và kiểm tra dependency init→app, chỉ app secret vào runtime, DB không mở cổng host, filesystem read-only; node --check cho init script; typecheck/build backend; test đọc DB_PASSWORD_FILE (bỏ một newline cuối, giữ ký tự đặc biệt/khoảng trắng, từ chối file rỗng/quá dài hoặc đồng thời DB_PASSWORD); hồi quy SQL Server Windows.

Kết quả:72/72 test backend đạt; typecheck/build backend và kiểm tra cú pháp PowerShell đều đạt. Không chạy lại browser ở bước chỉ thay cấu hình/đóng gói này; kết quả21 nhóm browser B5.2 là bằng chứng trước đó, không phải kiểm thử Docker.

Config/build/up, sharp Linux, init lặp lại, quyền SQL, readiness và giữ migration history sau tạo lại db đã kiểm chứng. Còn bootstrap owner, dữ liệu nghiệp vụ qua restart và toàn bộ luồng mua hàng/quản trị qua container. Image tags hiện là node:24-bookworm-slim và SQL2022-latest; cần chốt digest sau QA đầy đủ trước phát hành ổn định.

Production cần TLS công khai, chứng chỉ DB xác minh được, quyền/license SQL phù hợp, backup/restore, reverse proxy/rate limiting và host cụ thể. Không deploy công khai hoặc sửa dữ liệu AuraStore trong bước này.

## Nguồn xác minh

- [Docker Compose: thứ tự khởi động và service_completed_successfully](https://docs.docker.com/compose/how-tos/startup-order/).
- [Compose secrets theo service qua /run/secrets](https://docs.docker.com/compose/how-tos/use-secrets/).
- [SQL Server container và giới hạn Developer/production](https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment?view=sql-server-ver17).
