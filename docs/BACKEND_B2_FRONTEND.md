# B2 — Frontend kết nối catalog và authentication SQL Server

Cập nhật 25/10/2026. Đây là mốc tích hợp catalog/auth, chưa nghiệm thu toàn bộ B2 hoặc checkout B3.

## Chạy hai chế độ

Tại thư mục gốc, mở hai terminal:

```powershell
npm run backend:dev
```

```powershell
npm run dev:api
```

Mở `http://127.0.0.1:3000`. Backend cần cấu hình/migrate theo [backend README](../backend/README.md). `APP_ORIGIN` phải đúng origin frontend; không đổi sang localhost khi backend đang cho phép 127.0.0.1. Vite dùng strictPort để tránh tự đổi port làm hỏng origin check. `/api` proxy đến `http://127.0.0.1:4000`; có thể cấu hình `API_TARGET` phía Vite khi kiểm thử.

`npm run dev` vẫn chạy demo trình duyệt. `npm run build:api` đóng gói API vào `frontend/dist-api`; `npm run build` đóng gói demo vào `frontend/dist`. Hai bản không ghi đè nhau. Dùng `npm run preview:api --prefix frontend` để xem bản API; preview mặc định vẫn xem demo. MODE được chọn lúc build, không phải công tắc tại runtime. Khi triển khai cần reverse proxy cùng origin cho `/api`, HTTPS và cấu hình cookie production. Preview khác port cần APP_ORIGIN tương ứng. Chưa dùng bản này để triển khai công khai.

## Phần đã triển khai

- Adapter HTTP catalog: query được encode, lọc giá đúng mốc VND, phân trang server, sửa page vượt phạm vi bằng một request bổ sung, truyền AbortSignal. HTTP lỗi không tự quay về mock. `getProducts`/`getProductsByCategory` là helper giới hạn 100 sản phẩm; màn hình danh sách dùng `getCatalog` có phân trang.
- Trang chủ API lấy 8 sản phẩm và danh mục song song; không tải toàn catalog rồi lọc. Search/detail dùng chung giao diện hiện có; có ảnh placeholder cho seed.
- ProductVariant bổ sung colorId/configurationId. PDP chỉ hiển thị SKU của màu chọn và giữ cấu hình khi chuyển màu; hết hàng vẫn hiển thị đúng giá và trạng thái. Demo không có colorId vẫn tương thích.
- Khách: đăng ký, đăng nhập, `/me`, đăng xuất, đổi mật khẩu. Admin: đăng nhập, `/me`, đăng xuất, đổi mật khẩu. Guard chờ kết quả server, tách 401 với lỗi dịch vụ và cho retry; kiểm tra lại khi focus hoặc mỗi 60 giây khi trang đang hiện.
- Cookie HttpOnly do server quản lý. Client không lưu token/password/profile server vào localStorage. Mutation gửi JSON và X-Aura-Request; trình duyệt gửi Origin qua proxy cùng nguồn.
- API mode không đọc/lưu giỏ demo, không dùng demo session để xác thực. Route đặt hàng và CRUD quản trị chưa có API hiển thị trạng thái chưa khả dụng; không tạo dữ liệu giả dưới danh tính server.

## Kiểm tra

### Cập nhật 26/10 — tách bản build API/demo

- Vite chọn `@runtime/routes` và `@runtime/products` theo mode trước khi tạo module graph. `ApiRoutes.tsx` chỉ nhập các trang dùng API; `AppRoutes.tsx` giữ route demo. Shared UI giữ nguyên.
- Plugin `reject-demo-in-api` làm build thất bại nếu import repository/fixture hoặc service nghiệp vụ demo. Test `npm run test:boundary --prefix frontend` chèn một import fixture ảo để xác nhận guard thực sự chặn; không sửa source để thử.
- Build API và demo đều đạt; 40/40 test frontend đạt. Main JS API khoảng293,74KB (gzip93,80KB), so với khoảng350,19KB (gzip106,21KB) trước bước tách. Đây là dung lượng bundle, không phải số đo tốc độ trang.
- 6/6 nhóm browser smoke đạt trên bản `dist-api` qua Vite preview và SQL Server riêng, không có page error. Chạy lại bằng cách đặt `FRONTEND_PREVIEW=true` trước lệnh smoke (cần build API trước); nếu không đặt, smoke dùng Vite dev như cũ. Kết quả mới nằm trong `qa/api-frontend/results.json`.

Kết quả phiên 25/10: **40/40 test frontend đạt**, build API đạt; **6/6 nhóm smoke Chrome với SQL Server thật đạt**, không có page error. Đã xem ảnh PDP desktop và login mobile390px; không thấy tràn ngang ở trang login. Evidence: [results.json](qa/api-frontend/results.json), [PDP](qa/api-frontend/product.png), [login mobile](qa/api-frontend/login-mobile.png).

`npm test` kiểm thử domain và adapter frontend. `npm run build:api` kiểm tra TypeScript và bundle. Browser smoke nằm ở `backend/scripts/frontend-smoke.mjs`, chạy bằng `npm run test:frontend --prefix backend`, cần Playwright (PLAYWRIGHT_MODULE nếu dùng runtime ngoài project), Chrome (CHROME_PATH nếu cần) và quyền kết nối SQL Server/tạo database kiểm thử.

Smoke tạo AuraTest ngẫu nhiên, migrate/seed và bootstrap owner chỉ trong database đó, chạy Vite port3015 cùng backend port ngẫu nhiên, rồi đóng tiến trình và dọn database trong finally. Không sử dụng tài khoản hoặc dữ liệu AuraStore. Bằng chứng chạy thành công được ghi ở `docs/qa/api-frontend/results.json`; xem file này cho trạng thái thực tế.

## Phần tiếp theo

**Cập nhật28/10:** [B3.1 giỏ hàng/báo giá](BACKEND_B3_QUOTE.md) đã có chế độ API, giỏ lưu riêng và giá/tồn lấy từ SQL Server. Các ghi chú trước đó về khóa giỏ API giữ làm lịch sử; checkout tạo đơn vẫn khóa.

**Cập nhật26/10:** upload ảnh và kiểm thử đăng xuất admin đa tab đã triển khai; xem [B2 media](BACKEND_B2_MEDIA.md). 19 test backend và8 nhóm smoke browser đạt. Các ghi chú “upload chưa triển khai” trong lịch sử trước cập nhật này đã hết hiệu lực.

1. B2 đã có upload và test owner/editor/khách/admin khóa; cần tiếp tục kiểm thử quyền cho từng API quản trị khi triển khai B4. Tách module demo khỏi bản build API đã hoàn thành26/10. Upload còn quota/cleanup/object storage để mở rộng.
2. B3: quote canonical, checkout COD có idempotency/transaction/giữ tồn, snapshot đơn, quyền truy cập đơn khách và guest receipt. Sau đó mở lại giỏ/checkout trong API mode.
3. B4: API CRUD quản trị, cập nhật trạng thái đơn, báo cáo SQL phân trang và đúng timezone.

Không tạo owner thật tự động. Bootstrap owner theo hướng dẫn backend bằng mật khẩu do người vận hành chọn.
