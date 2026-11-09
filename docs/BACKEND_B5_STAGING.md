# B5.5 — Chuẩn bị staging, chưa triển khai công khai

Cập nhật 09/11/2026: GHCR đã phát hành thành công, xem [B5.7](BACKEND_B5_REGISTRY.md). [B5.8 runbook Linux host](STAGING_HOST_RUNBOOK.md) có công cụ kiểm tra engine/image và quy trình bàn giao. Người dùng chưa có máy chủ/tên miền và chọn chuẩn bị cấu hình trước.

## Kiến trúc dự kiến

Một Linux host chạy nginx HTTPS và một container app. nginx chuyển tiếp tới 127.0.0.1:4100; app kết nối SQL Server riêng bằng SQL login giới hạn quyền, encrypt=true/trustServerCertificate=false. Database không được tạo/seed tự động. Không dùng compose.yaml local làm overlay staging.

- `compose.staging.yaml`: file độc lập, không có build hoặc SQL Developer tự động; bắt buộc cung cấp origin, image, DB, secret paths.
- `deploy/staging.env.example`: placeholder để điền sau khi chọn hạ tầng; không chứa mật khẩu.
- `deploy/nginx.staging.conf.example`: mẫu vhost HTTPS với certificate paths cần thay thế. nginx ghi đè Forwarded-For/Host/Proto, không nối giá trị người dùng gửi.
- `deploy/image-lock.json`: digest Node/SQL, ID local và tham chiếu image GHCR đã phát hành. Dùng appRegistryReference cho staging; ID local không là địa chỉ pull.

## Proxy và giới hạn triển khai

Backend hỗ trợ TRUST_PROXY_IPS, mặc định rỗng (không tin header proxy). Chỉ chấp nhận tối đa 16 IPv4/IPv6 cụ thể; từ chối true, số hop, hostname, wildcard, subnet hoặc alias loopback. Phải xác minh IP peer app thực sự nhận từ nginx trên host; qua Docker bridge thường là địa chỉ gateway, không mặc định cho rằng 127.0.0.1 là đúng. Không dùng IP của khách làm trusted proxy.

Không có trust proxy rộng hoặc trust theo số hop. Test HTTP xác minh header giả không đổi IP/protocol khi peer không tin cậy, và dừng ở hop không tin cậy gần app nhất khi proxy đã được cấu hình. Local Compose giữ TRUST_PROXY_IPS rỗng.

Chỉ một app replica. Limiter hiện lưu trong process; restart làm mất bộ đếm. Chưa có limiter chia sẻ hoặc nghiệm thu nhiều instance. Nếu thêm CDN/load balancer, phải rà lại chuỗi proxy và IP nguồn; mẫu nginx hiện dành cho kết nối client trực tiếp tới nginx.

## Chuẩn bị trên máy chủ khi đã chọn hạ tầng

1. Chọn registry và push chính image đã kiểm thử, ghi digest registry vào AURA_IMAGE. Không rebuild riêng một bản không kiểm thử trên máy chủ. Đổi image-lock khi phát hành bản mới.
2. Chuẩn bị SQL Server edition/license phù hợp mục đích sử dụng, database staging riêng, chứng chỉ có SAN khớp DB_SERVER. File CA PEM phải chứa chuỗi CA được tin cậy, mount vào NODE_EXTRA_CA_CERTS. Không hạ DB_TRUST_SERVER_CERTIFICATE để bỏ qua lỗi.
3. DBA tạo login migrator và login app riêng. Migrator có quyền DDL cần cho migrations trong database staging; app chỉ SELECT/INSERT/UPDATE/DELETE schema dbo và DENY ghi schema_migrations. Không cấp sysadmin cho runtime. Tài khoản/secret của local không tự được sao chép lên staging.
4. Lưu secret files và CA ở đường dẫn chỉ người vận hành được đọc, vẫn bảo đảm container user node đọc được qua mount. Copy staging.env.example thành file môi trường riêng (không commit), điền đầy đủ placeholder.
5. Cấp certificate HTTPS, thay hostname/path trong nginx mẫu, kiểm tra nginx -t và cấu hình default vhost từ chối hostname lạ. Chỉ public 80/443; 4100 bind loopback. DB chỉ nhận kết nối từ app/migrator được phép.
6. Kiểm tra proxy peer IP và điền TRUST_PROXY_IPS trước nghiệm thu rate limit theo người dùng.

## Quy trình phát hành dự kiến

### Kiểm tra trước triển khai (bổ sung 09/11/2026)

Trên máy có Node.js 24, Docker Compose và các secret/CA files tương ứng với máy triển khai:

```sh
node deploy/staging-preflight.mjs /srv/aura/staging.env
# Hoặc từ thư mục gốc repo:
npm run staging:check -- /srv/aura/staging.env
```

Exit 0 và `configuration_passed` chỉ xác nhận cấu hình tĩnh/file đọc được. Exit 1 với `blocked` liệt kê các mục cần sửa, không in mật khẩu hoặc nội dung PEM. Công cụ render chính compose.staging.yaml qua Docker Compose, bao gồm tác động của biến môi trường đang có trong shell; không chỉ đọc text file env.

Kiểm tra: image digest/migrator cùng image, origin HTTPS thật, IP proxy cụ thể, database staging riêng, SQL TLS bắt buộc, login/password app và migrator khác nhau, ranh giới secrets, port app loopback, filesystem read-only/capabilities, một app replica. Password files cần 16–128 ký tự, bỏ tối đa một newline cuối; SQL CA bundle phải chứa CA PEM đang còn hiệu lực, không chứa private key. Quy tắc này không thay thế kiểm tra quyền login SQL ở server.

Không xác minh được DNS, image có tồn tại trong registry, khả năng container đọc mount theo quyền trên host đích, chuỗi certificate của SQL server thực, hostname SAN, IP proxy quan sát thực tế, firewall hoặc kết nối HTTPS/SQL live. Phải nghiệm thu các mục này trên hạ tầng thật sau khi preflight đạt.

Đã chạy 6/6 test đạt (5 nhóm quy tắc/file và 1 test CLI qua Compose thực với credential giả và CA tạm). Test bổ sung này không kết nối tới SQL/registry/tên miền thử. Chạy `npm run test:deployment`; đặt `TEST_STAGING_COMPOSE=true` để bao gồm test Compose CLI. File example hiện cố ý bị preflight chặn vì còn placeholder; đó là kết quả mong đợi.

Các lệnh dưới dành cho cấu hình đã điền thật. Không chạy với file example còn placeholder:

```sh
docker compose --env-file /srv/aura/staging.env -f compose.staging.yaml --profile tools config --quiet
docker compose --env-file /srv/aura/staging.env -f compose.staging.yaml --profile tools pull
# Tạo backup hợp lệ trước thay schema; thông báo thời gian bảo trì khi nâng cấp.
docker compose --env-file /srv/aura/staging.env -f compose.staging.yaml stop app
docker compose --env-file /srv/aura/staging.env -f compose.staging.yaml --profile tools run --rm migrate
# Chỉ chạy dòng tiếp theo nếu migrations thành công.
docker compose --env-file /srv/aura/staging.env -f compose.staging.yaml up -d app
```

App chỉ được mount secret runtime, service migrate (profile tools) mới nhận secret migrator. Không tự chạy migrations mỗi lần app restart. Không dùng helper backup-local.mjs cho staging: helper đó cố định AuraStoreDocker/Compose local; backup staging cần cấu hình theo DB/host thực tế.

Rollback image chỉ an toàn khi schema mới vẫn tương thích. Không sửa migration đã áp dụng; nếu cần phục hồi DB, restore sang database mới rồi nghiệm thu trước chuyển kết nối. Đọc B5.4 về giới hạn backup/restore cùng instance.

## Kiểm chứng và phần còn thiếu

- Typecheck/build backend đạt. 74/74 test backend đạt, gồm 2 test mới về cấu hình và IP proxy.
- Compose staging render/parse đạt; đã kiểm tra production mode, verified SQL TLS, loopback port và secret migrator không xuất hiện ở app.
- Node/SQL base images đã pin digest lấy từ bản build/pull thực tế. Image app đã build lại.
- Image mới đạt 21/21 nhóm nghiệp vụ Chrome trên Docker, bằng chứng `docs/qa/docker-e2e/results.json`. Đã cập nhật riêng app local bằng --no-deps; HTTP/schema/quyền SQL/WebP đạt, owner còn nguyên (1 admin, 0 sản phẩm/đơn). init local cũ vẫn là bản đã exited 0; lần nâng cấp có migrations mới phải chạy lại init/migrate đúng quy trình, không dựa vào kết quả init cũ.
- Đã có registry/image thật; chưa có máy chủ/tên miền/certificate staging: chưa kiểm tra nginx -t với certificate thật, HTTPS, SQL verified TLS qua mạng hosting, DNS, firewall hoặc cookie Secure qua proxy trên staging. Không coi config parse là nghiệm thu triển khai.
- Trước public hosting cần backup ngoài máy, lịch lưu giữ, theo dõi health/log/dung lượng và diễn tập phục hồi sang SQL instance khác.

Nguồn: [Express sau reverse proxy](https://expressjs.com/en/guide/behind-proxies/), [nginx proxy_set_header](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header).
