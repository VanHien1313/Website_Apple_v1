# Aura — website thương mại điện tử

Dự án đồ án môn học gồm cửa hàng Apple, tài khoản khách hàng, đặt hàng, thanh toán thử nghiệm và quản trị. Công nghệ: React 19, TypeScript, Vite, Tailwind CSS, Express, SQL Server 2022 và Docker.

**Cập nhật: 27/11/2026.** Nhánh đang phát triển: `feat/google-zalo-login-wallet-qr`.

## Trạng thái hiện tại

| Thành phần | Cấu hình hiện tại |
| --- | --- |
| Website | [https://aura-store-vn.netlify.app](https://aura-store-vn.netlify.app) |
| Frontend | Build chế độ API, triển khai lên Netlify |
| Backend | Express trong Docker trên Mac, cổng `4000`; Netlify chuyển tiếp API qua ngrok |
| Database chính | `AuraStoreTeam` trong SQL Server Docker trên máy đang vận hành |
| Đăng nhập khách hàng | Email/mật khẩu, Google và Zalo; OAuth cần cấu hình khóa backend |
| Thanh toán trên giao diện | COD và ZaloPay / QR sandbox; đã bỏ lựa chọn MoMo |

**Hosting hiện chưa độc lập với máy cá nhân.** Netlify giữ frontend, còn đăng nhập, danh mục, ảnh SQL, đặt hàng và thanh toán cần backend, SQL Server và ngrok hoạt động. Tắt Mac/Docker/ngrok thì các chức năng gọi API không hoạt động. Backend và database chưa được chuyển lên máy chủ chạy thường trực.

Repository không chứa database `AuraStoreTeam`, tài khoản/mật khẩu đã tạo trên máy, khóa Google/Zalo/ZaloPay hay các file cấu hình riêng. Clone mã nguồn không tự khôi phục những dữ liệu và quyền truy cập này.

## Chức năng

### Cửa hàng và khách hàng

- Danh mục iPhone, iPad, Mac, Apple Watch và AirPods; tìm kiếm, lọc giá/cấu hình, sắp xếp và phân trang bằng API SQL Server.
- Chi tiết sản phẩm, ảnh, màu, cấu hình, SKU, giá và tồn kho. Catalog đi kèm mã nguồn hiện có **48 sản phẩm / 133 SKU**; dữ liệu đang vận hành có thể thay đổi qua quản trị.
- Trang chủ đưa AirPods xuống sau bộ sưu tập và giới thiệu các mẫu mới được chọn trong catalog. Các đời cũ vẫn bán trong danh mục AirPods.
- Giỏ hàng, chọn sản phẩm mua, báo giá phía backend và kiểm tra lại giá/tồn trước khi tạo đơn.
- Đăng ký, đăng nhập bằng mật khẩu, đăng nhập Google/Zalo, đăng xuất, hồ sơ, địa chỉ, đổi mật khẩu và lịch sử đơn theo tài khoản.
- Checkout yêu cầu đăng nhập, tính phí giao hàng, giữ hàng và chống tạo đơn trùng khi gửi lại cùng yêu cầu.
- Theo dõi đơn, xem lịch sử và hủy đơn theo trạng thái được phép.

### Thanh toán

- **COD:** tạo đơn chưa thanh toán; quản trị xử lý giao hàng và xác nhận thu tiền theo quy trình.
- **ZaloPay sandbox:** tạo phiên thanh toán, mở cổng để xem QR/mở ví thử nghiệm, nhận callback có xác minh chữ ký và truy vấn đối soát tự động. Kết quả thanh toán không lấy từ tham số chuyển hướng của trình duyệt.
- Worker đối soát chạy mỗi 30 giây; trang phiên thanh toán tự đọc trạng thái mỗi 10 giây. Thời gian thực tế phụ thuộc phản hồi của cổng.
- Đã bỏ MoMo khỏi lựa chọn checkout. Mã tích hợp MoMo cũ vẫn còn trong backend để tương thích; không xóa lịch sử đơn.
- Chỉ hỗ trợ `PAYMENT_MODE=off` hoặc `sandbox`, chưa triển khai thanh toán production. Sandbox dùng ứng dụng/số dư thử nghiệm; giao dịch có thể bị hạn mức tài khoản thử chặn. Kiểm thử tự động dùng gateway giả, không thay thế nghiệm thu merchant của nhà cung cấp.

### Quản trị

- Đăng nhập riêng tại `/admin/login`; phân quyền owner/editor, khóa tài khoản và thu hồi phiên.
- Quản lý danh mục, sản phẩm, cấu hình, màu, SKU, giá/tồn và upload ảnh lưu SQL Server.
- Quản lý đơn, chuyển trạng thái, ghi nhận COD, lịch sử thao tác và xử lý xung đột phiên bản dữ liệu.
- Tra cứu khách hàng, quản lý tài khoản quản trị, owner đặt lại mật khẩu quản trị khác.
- Báo cáo doanh thu theo ngày/tuần/tháng; chỉ tính đơn hoàn thành đã thanh toán theo quy tắc hệ thống, loại giao dịch sandbox khỏi doanh thu thực.

## Lấy mã nguồn

Cần Git và **Node.js 24.x** cho các lệnh npm. Chạy toàn ứng dụng bằng Docker cần Docker Desktop/Engine đang hoạt động, hỗ trợ Linux containers và Docker Compose. SQL Server container dùng `linux/amd64`; máy Apple Silicon cần Docker hỗ trợ chạy image này.

```sh
git clone --branch feat/google-zalo-login-wallet-qr https://github.com/VanHien1313/Website_Apple_v1.git
cd Website_Apple_v1
```

Nếu đã clone và đã lưu/commit các thay đổi riêng:

```sh
git switch feat/google-zalo-login-wallet-qr
git pull --ff-only
```

Các lệnh tiếp theo chạy từ thư mục gốc repository, trừ khi có ghi khác.

## Chạy tiếp bản hiện có dùng AuraStoreTeam

Phần này dành cho **máy đang có AuraStoreTeam và các secrets đã cấu hình**, không phải quy trình cài mới. `compose.team.yaml` chỉ đổi database của service `app`; không tạo, restore hoặc migrate `AuraStoreTeam`.

Khởi động SQL Server đang có rồi build/chạy lại app với đủ override dùng cho website Netlify:

```sh
docker compose up -d db
docker compose -f compose.yaml -f compose.team.yaml -f deploy/secrets/compose.social-local.yaml -f deploy/secrets/compose.netlify.yaml up -d --build --no-deps app
docker compose ps -a
docker compose logs --tail=80 app
```

Hai file `compose.social-local.yaml` và `compose.netlify.yaml`, cùng các file `.env` mà chúng nạp, chỉ nằm trên máy vận hành trong `deploy/secrets/` và không có trên GitHub. Cấu hình hiện tại nạp khóa Google, Zalo, ZaloPay và đặt cả `APP_ORIGIN` / `PAYMENT_PUBLIC_ORIGIN` thành `https://aura-store-vn.netlify.app`.

Trong terminal khác, chạy ngrok với tài khoản đã được cấu hình:

```sh
ngrok http http://127.0.0.1:4000 --url https://majesty-facility-marmalade.ngrok-free.dev
```

Mở website Netlify để đăng nhập, đặt hàng và quản trị. Healthcheck local: [http://127.0.0.1:4000/health/ready](http://127.0.0.1:4000/health/ready). Khi `APP_ORIGIN` là Netlify, thao tác đăng nhập/đặt hàng từ địa chỉ local hoặc ngrok trực tiếp có thể bị từ chối vì khác origin.

Giữ nguyên volume và secret SQL hiện có. Không chạy `docker compose down -v`, thay mật khẩu SQL bằng cách ghi đè file, hoặc restore dữ liệu mẫu lên database chính. Nếu phiên bản mới thêm migration, sao lưu và thực hiện migration riêng đúng target `AuraStoreTeam`; initializer mặc định chỉ dành cho `AuraStoreDocker`.

## Cài mới trên máy khác với database riêng

Quy trình này tạo **AuraStoreDocker**, độc lập với database chính `AuraStoreTeam`. Không cần khóa OAuth/thanh toán để chạy catalog, tài khoản mật khẩu, quản trị và COD. Google/Zalo sẽ bị khóa khi chưa cấu hình; ZaloPay checkout chưa được kích hoạt.

### 1. Tạo secret SQL trên máy mới

Windows PowerShell:

```powershell
./deploy/New-LocalSecrets.ps1
```

macOS/Linux, hoặc máy có Node.js 24:

```sh
node -e "const fs = require('node:fs'), crypto = require('node:crypto'); fs.mkdirSync('deploy/secrets', {recursive:true}); for (const name of ['sql-sa-password.txt','sql-app-password.txt']) { const file = 'deploy/secrets/' + name; if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('base64') + 'Aa1!', {flag:'wx', mode:0o600}); }"
```

Các lệnh chỉ tạo file còn thiếu, không in mật khẩu và không ghi đè secret đã có. Hai file nằm trong `deploy/secrets/` đã được Git ignore.

### 2. Build và khởi động

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps -a
docker compose logs --tail=80 init app
```

Đợi SQL Server sẵn sàng, `init` kết thúc với mã `0` và `app` healthy. Lần đầu có thể mất vài phút. Initializer tạo database/login ứng dụng và áp dụng migration; không tự tạo owner hoặc nhập sản phẩm.

### 3. Tạo owner cho database mới

Windows PowerShell:

```powershell
./deploy/New-DockerOwner.ps1 -Email owner@aura.local
```

macOS/Linux có Python 3, nhập mật khẩu qua prompt ẩn:

```sh
python3 -c 'import getpass,json; print(json.dumps({"email":"owner@aura.local","name":"Owner","password":getpass.getpass("Owner password: ")}))' | docker compose run --rm --no-deps -T app node backend/dist/auth/bootstrap-cli.js
```

Bootstrap yêu cầu mật khẩu 8–128 ký tự, có chữ in hoa và ký tự đặc biệt. Chỉ thực hiện được khi chưa có quản trị viên; không đặt lại tài khoản sẵn có. Mật khẩu của môi trường đang vận hành không lưu trong README và không tự cấp cho bản clone.

### 4. Nhập catalog có sẵn

Chạy preview để kiểm tra target và số lượng; `--apply` mới ghi dữ liệu vào database riêng:

```sh
node deploy/catalog-local.mjs
node deploy/catalog-local.mjs --apply
```

Không cần chạy lại công cụ chuẩn bị/tải ảnh: catalog JSON và ảnh đã được commit. Importer giữ giá/tồn của SKU đã có và không xóa khách hàng/đơn hàng. Xem [catalog](docs/CATALOG_IMPORT.md) và [AirPods](docs/AIRPODS_CATALOG.md) trước khi nhập vào database đã sử dụng.

### 5. Mở website và dừng ứng dụng

- Cửa hàng: [http://127.0.0.1:4000](http://127.0.0.1:4000).
- Quản trị: [http://127.0.0.1:4000/admin/login](http://127.0.0.1:4000/admin/login), bằng owner vừa tạo.
- API/database: [http://127.0.0.1:4000/health/ready](http://127.0.0.1:4000/health/ready).

```sh
docker compose stop app
docker compose up -d app
```

`docker compose down` dừng stack và giữ volume. Không thêm `-v` nếu muốn giữ dữ liệu. Compose này phục vụ phát triển/đồ án local, chưa phải cấu hình hosting production.

## Sửa frontend bằng VS Code / Vite

Backend cổng `4000` và database cần chạy trước:

```sh
npm --prefix frontend ci
npm run dev
```

Vite chạy tại [http://127.0.0.1:3000](http://127.0.0.1:3000), proxy `/api` về `http://127.0.0.1:4000`. **`npm run dev` hiện dùng API thật**, tương đương `npm run dev:api`.

Đọc danh mục ở cổng 3000 vẫn dùng backend hiện có. Để đăng nhập, đổi dữ liệu hoặc đặt hàng qua Vite, backend phải có `APP_ORIGIN=http://127.0.0.1:3000`. Ví dụ cho stack cài mới `AuraStoreDocker`: tạo file riêng `deploy/secrets/compose.vite.yaml`:

```yaml
services:
  app:
    environment:
      APP_ORIGIN: http://127.0.0.1:3000
```

```sh
docker compose -f compose.yaml -f deploy/secrets/compose.vite.yaml up -d --no-deps app
```

Không áp dụng ví dụ này vào bản Netlify đang vận hành: đổi `APP_ORIGIN` sẽ ảnh hưởng đăng nhập/callback của bản đó. Sau khi test Vite trên stack riêng, dùng `docker compose up -d --no-deps app` để trở lại origin cổng 4000.

Nếu chỉ muốn xem frontend với dữ liệu mô phỏng trong trình duyệt, dùng `npm run dev:demo`. Chế độ này không dùng tài khoản SQL Server, không đăng nhập OAuth và không thanh toán thật.

## Cấu hình Google, Zalo và ZaloPay sandbox

Khóa chỉ cấp cho **backend**, không nhúng vào mã React hoặc biến `VITE_*`. Với Docker, dùng `env_file` trong override riêng dưới `deploy/secrets/`; với backend Node chạy trực tiếp, dùng `backend/.env` theo [file mẫu](backend/.env.example). Không ghi đè `.env` đã có.

| Tính năng | Biến backend |
| --- | --- |
| Origin đăng nhập/API | `APP_ORIGIN` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` hoặc `GOOGLE_CLIENT_SECRET_FILE` |
| Zalo | `ZALO_APP_ID`, `ZALO_APP_SECRET` hoặc `ZALO_APP_SECRET_FILE` |
| ZaloPay sandbox | `PAYMENT_MODE=sandbox`, `PAYMENT_PUBLIC_ORIGIN`, `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2` |

ZaloPay cũng hỗ trợ `ZALOPAY_KEY1_FILE` và `ZALOPAY_KEY2_FILE`; đường dẫn `_FILE` phải tồn tại bên trong container. Không đặt đồng thời giá trị trực tiếp và `_FILE` cho cùng một secret. Không có khóa ví nào thì giữ `PAYMENT_MODE=off`.

Với bản Netlify hiện tại, đăng ký các URL:

| Mục đích | URL |
| --- | --- |
| Google callback | `https://aura-store-vn.netlify.app/api/v1/auth/social/google/callback` |
| Zalo callback | `https://aura-store-vn.netlify.app/api/v1/auth/social/zalo/callback` |
| ZaloPay callback | `https://aura-store-vn.netlify.app/api/v1/payments/zalopay/callback` |

`APP_ORIGIN` và `PAYMENT_PUBLIC_ORIGIN` phải là origin HTTPS công khai phù hợp; callback phải đến được backend qua proxy. Nếu đổi tên miền, cập nhật biến backend, callback trên nhà cung cấp và xác minh tên miền Zalo tương ứng. Meta/file xác minh Zalo hiện nằm trong `frontend/index.html` và `frontend/public/`; khi dùng ứng dụng/tên miền khác, dùng nội dung xác minh do Zalo cấp cho cấu hình đó.

Google dùng email đã xác minh; Zalo dùng ID/tên và email nội bộ không nhận thư. Khách Zalo cần bổ sung thông tin giao hàng khi checkout. Xem [đăng nhập Google/Zalo](docs/SOCIAL_LOGIN.md), [thanh toán sandbox](docs/WALLET_PAYMENTS.md) và [file mẫu thanh toán](deploy/payment-sandbox.env.example). Các hướng dẫn MoMo trong tài liệu tích hợp là phần kỹ thuật còn lưu, không phải lựa chọn trên checkout hiện tại.

## Build và cập nhật Netlify

[`netlify.toml`](netlify.toml) đang đặt:

- Build: `npm --prefix frontend ci && npm --prefix frontend run build:api`.
- Publish directory: `frontend/dist-api`.
- Node.js: `24`.
- Proxy `/api/*` và `/health/*` sang URL ngrok đang vận hành, kèm header bỏ trang cảnh báo ngrok.
- Fallback các đường dẫn frontend về `index.html`.

Build API rồi liên kết **site hiện có** trong tài khoản Netlify trước khi deploy thủ công:

```sh
npm --prefix frontend ci
npm run build:api
npx netlify login
npx netlify link
npx netlify deploy --prod --no-build --dir frontend/dist-api
```

Chọn site `aura-store-vn` khi link; `.netlify/` đã được Git ignore. Bản hiện tại deploy thủ công; push GitHub chưa tự cập nhật Netlify nếu chưa cấu hình liên kết Git/continuous deployment.

**Không dùng `npm run build` để deploy bản API:** lệnh đó build chế độ demo vào `frontend/dist`. Dùng `build:api` hoặc `build:release` cho ứng dụng nối backend.

Nếu đổi endpoint backend/ngrok, sửa proxy trong `netlify.toml`, build/deploy lại và kiểm tra `/health/ready`, đăng nhập, catalog, checkout. Để website chạy khi tắt Mac, cần triển khai backend cùng SQL Server lên hạ tầng chạy thường trực và cập nhật proxy; deploy frontend lên Netlify chưa thực hiện bước này.

## Kiểm tra và build

Sau khi cài dependency frontend:

```sh
npm test
npm run typecheck
npm run test:catalog
npm run test:deployment
npm --prefix frontend run test:boundary
```

`test:catalog` cần cả dependency backend để đọc validator sản phẩm. Kiểm thử backend cần Docker stack local cùng các secret SQL đã sẵn sàng. Runner dùng database `AuraTest_*` tạm, không dùng database chính làm fixture:

```sh
npm run test:backend:docker
```

Build frontend/backend ngoài Docker cần cài dependency backend; với SQL authentication trên macOS/Linux có thể bỏ install scripts của driver Windows:

```sh
npm --prefix backend ci --ignore-scripts
npm run build:release
```

Windows Authentication cần driver native/ODBC và thiết lập riêng; xem [backend](backend/README.md). Kết quả kiểm tra ngày 27/11/2026: **44/44 frontend**, **100/100 backend**, **3/3 catalog**, **10 deployment đạt / 1 bỏ qua**, backend build và kiểm tra ranh giới API/demo đạt. Đây là kết quả tại mốc cập nhật, không phải chứng nhận thanh toán production.

## Đường dẫn và tài liệu

| Khu vực | Đường dẫn chính |
| --- | --- |
| Cửa hàng | `/`, `/search`, `/iphone`, `/ipad`, `/mac`, `/watch`, `/airpods`, `/product/:slug` |
| Mua hàng | `/cart`, `/checkout`, `/order-confirmation/:id` |
| Khách hàng | `/register`, `/login`, `/account`, `/account/security`, `/account/orders`, `/account/orders/:id` |
| Quản trị | `/admin/login`, `/admin`, `/admin/products`, `/admin/categories`, `/admin/users`, `/admin/customers`, `/admin/orders`, `/admin/reports`, `/admin/security` |

- `frontend/src`: giao diện, routes, API adapter, giỏ hàng và chế độ demo riêng.
- `backend/src`, `backend/migrations`: Express, xác thực, catalog, đơn hàng, thanh toán và schema SQL Server.
- `deploy/`: Docker, dữ liệu catalog, công cụ nhập và kiểm thử triển khai.
- [AirPods và nguồn catalog](docs/AIRPODS_CATALOG.md) · [nhập catalog](docs/CATALOG_IMPORT.md).
- [Docker chi tiết](docs/BACKEND_B5_DOCKER.md) · [backup/restore](docs/BACKEND_B5_RECOVERY.md) · [triển khai Linux](docs/STAGING_HOST_RUNBOOK.md).
- [Bản demo SQL riêng cổng 4001](docs/LOCAL_DEMO.md) · [hướng dẫn test tay](docs/MANUAL_TEST_GUIDE.md).
- [Báo cáo và slide đồ án](docs/submission/README.md).

Các tài liệu theo giai đoạn trong `docs/`, `backend/README.md` và `frontend/README.md` còn giữ lịch sử triển khai; ưu tiên trạng thái và cách chạy trong README gốc này khi có khác biệt. Aura là dự án học tập, không phải website đại lý Apple được xác nhận. Giá/tồn kho mẫu và sandbox dùng cho thử nghiệm.
