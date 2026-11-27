# AirPods trong Aura

Đối chiếu Apple Store Việt Nam ngày 25/11/2026:

| Sản phẩm | Giá VND | Màu / SKU |
|---|---:|---|
| AirPods 5, hộp sạc USB-C | 3.799.000 | Trắng / 1 |
| AirPods 5, hộp sạc không dây | 4.299.000 | Trắng / 1 |
| AirPods Pro 3 | 6.799.000 | Trắng / 1 |
| AirPods Max 2 | 14.999.000 | Xanh Dương, Tím, Đêm Xanh Thẳm, Ánh Sao, Cam / 5 |

Nguồn: https://www.apple.com/vn/airpods/ và ba trang mua hàng lưu trong `deploy/catalog/airpods-sources.json`. Các mẫu trong bảng trên thuộc danh sách Apple Store VN tại thời điểm kiểm tra. Các đời cũ bên dưới được bổ sung riêng theo yêu cầu; không coi trang hỗ trợ là bằng chứng chúng còn bán tại Apple.

`deploy/catalog/airpods.json` lưu dữ liệu đã chuẩn hóa cho sản phẩm, cấu hình, màu và SKU. 21 ảnh chính thức được chuyển thành WebP và lưu trong `deploy/catalog/images`, có checksum. Khi nhập, ảnh được lưu vào SQL Server và phục vụ qua `/api/v1/media`; trình duyệt không phụ thuộc CDN Apple.

Giá nhập theo Apple tại thời điểm đối chiếu. Mỗi SKU khởi tạo 10 đơn vị **tồn kho thử nghiệm của Aura**, không phải tồn kho hoặc cam kết bán hàng của Apple. Sau nhập, quản trị có thể sửa giá, tồn kho và thông tin qua màn hình quản lý hiện có. Chạy nhập lại không ghi đè các chỉnh sửa này.

## Toàn bộ các đời và bản hộp sạc

| Đời bổ sung | Chip | Cấu hình / màu | Giá thử nghiệm VND |
|---|---|---|---:|
| AirPods 1 (2016) | W1 | Lightning | 1.499.000 |
| AirPods 2 (2019) | H1 | Lightning / Qi + Lightning | 1.999.000 / 2.499.000 |
| AirPods 3 (2021/2022) | H1 | Lightning / MagSafe | 3.299.000 / 3.799.000 |
| AirPods 4 (2024) | H2 | Không ANC USB-C / có ANC, sạc không dây | 3.299.000 / 4.799.000 |
| AirPods Pro 1 (2019/2021) | H1 | Qi + Lightning / MagSafe | 3.499.000 / 3.999.000 |
| AirPods Pro 2 (2022/2023) | H2 | MagSafe Lightning IPX4 / USB-C IP54 | 4.999.000 / 5.499.000 |
| AirPods Max 1 Lightning (2020) | H1 mỗi bên | Bạc, Xám Không Gian, Xanh Da Trời, Hồng, Xanh Lá | 9.999.000 |
| AirPods Max 1 USB-C (2024) | H1 mỗi bên | Xanh Dương, Tím, Đêm Xanh Thẳm, Ánh Sao, Cam | 11.999.000 |

Cộng với bốn mục hiện hành: **12 mục sản phẩm, 29 SKU**, bao phủ AirPods 1–5, Pro 1–3 và Max 1–2. Các bản thay đổi hộp sạc được chọn dưới Cấu hình; Max 1 tách theo cổng và bộ màu. Hộp Qi mua rời tương thích AirPods 1 được mô tả là phụ kiện, không tạo thành một bộ AirPods 1 gốc giả định.

**Giá và tồn kho các đời cũ là dữ liệu thử nghiệm do Aura đặt**, chưa phải báo giá bán hàng thực. Nhãn này xuất hiện ở tagline, thông số và thông tin sản phẩm. Thông số chip, pin, kết nối, chống ồn, sạc và năm ra mắt được đối chiếu tài liệu Apple; các URL và ảnh nguồn được lưu trong `airpods-sources.json`. Ảnh minh họa dòng máy; loại hộp chính xác được ghi trên cấu hình đã chọn.

## Chuẩn bị / nhập local

Tại thư mục gốc, sau khi cài dependency backend:

```sh
node deploy/prepare-airpods.mjs
docker compose build app
node deploy/airpods-local.mjs --database=AuraStoreTeam
# Sau khi kiểm tra preview và tạo backup:
node deploy/airpods-local.mjs --database=AuraStoreTeam --apply
```

Importer chỉ hỗ trợ các database local đã cho phép, chỉ thêm mới trong transaction và dừng khi ID/slug/ảnh xung đột. Không reset database, không sửa migration cũ, không sửa khách hàng/đơn hàng hay tồn kho cũ. Dữ liệu AirPods cũng được bổ sung trong catalog chung để các bộ cài sinh lại từ catalog có cùng sản phẩm.

Khởi động bản local đang có Google/Zalo/ZaloPay bằng đúng các override:

```sh
docker compose -f compose.yaml -f compose.team.yaml -f deploy/secrets/compose.social-local.yaml up -d --build --no-deps app
```

## Luồng sử dụng

- `/airpods`, tìm kiếm và lọc dòng AirPods / Pro / Max dùng cùng API SQL Server.
- Chọn hộp sạc hoặc màu lấy đúng SKU/giá/ảnh/tồn kho; cấu hình mặc định là bản còn hàng có giá thấp nhất; thêm giỏ, mua ngay và checkout dùng báo giá backend.
- Đơn AirPods sử dụng giữ hàng, hủy, COD hoặc ZaloPay sandbox, callback/worker và quyền sở hữu tài khoản như các danh mục khác. Giá không được lấy từ client.
- Danh mục và SKU xuất hiện trong quản trị; thay đổi có kiểm tra revision như sản phẩm hiện có.
- `npm run dev` cổng 3000 và Docker cổng 4000 dùng cùng database/backend.

Kiểm thử `backend/tests/airpods.test.ts` chạy trên database tạm: nhập lại bảo toàn giá/tồn kho, rollback khi xung đột, API ảnh/màu/tìm kiếm, báo giá, giữ hàng COD và tạo phiên ví với tổng đúng giá SKU. Các kiểm thử này không thu tiền hoặc tạo đơn trong AuraStoreTeam.

## Kết quả triển khai local 25/11/2026

Đã nhập bổ sung 8 mục đời cũ sau 4 mục hiện hành: tổng database **48 sản phẩm, 133 SKU, 73 ảnh**; giữ nguyên 11 đơn, 2 khách hàng và 1 quản trị. Backup trước đợt bổ sung được SQL Server RESTORE VERIFYONLY xác minh và xuất tại `deploy/backups/AuraStoreTeam_before_airpods_history_20261125.bak` (Git ignore). Import lại bỏ qua sản phẩm đã tồn tại, giữ chỉnh sửa giá/tồn kho.

Đợt mở rộng đạt 5 kiểm thử backend AirPods trên database tạm, 44 kiểm thử frontend, 3 kiểm thử catalog và typecheck cả hai phần. Kiểm thử bao gồm mọi SKU, cấu hình lịch sử, báo giá backend, giữ hàng COD và tạo phiên ví qua gateway giả lập. Đợt danh mục hiện hành trước đó đã đạt thêm các kiểm thử quản trị, đơn hàng và ví. Không tạo thêm đơn mua hàng trong database chính.

Live API tại cổng 3000/4000 đã trả đủ 12 mục, 29 cấu hình báo giá đúng giá nguồn và 21 ảnh HTTP 200. Chrome kiểm tra phân trang 1/2 và 2/2, AirPods 2 mặc định Lightning 1.999.000 VND, đổi Qi 2.499.000 VND, thêm giỏ qua ngrok giữ đúng hộp Qi và báo tổng 2.549.000 VND gồm phí giao 50.000 VND. Đã xóa SKU thử khỏi giỏ. Bản dev 3000 kiểm tra Pro 2 đổi Lightning IPX4 sang USB-C IP54 và giá 5.499.000 VND.

API quản trị được kiểm thử trên database tạm; chưa đăng nhập quản trị live qua ngrok trong lượt này vì cơ chế duyệt tự động không cho truyền mật khẩu lưu riêng qua URL công khai. Không thay đổi mật khẩu hoặc bỏ kiểm tra quyền để vượt bước này.

Bản 3000/4000 dùng chung backend 4000; các thao tác giao dịch trên trình duyệt cần dùng origin HTTPS đã cấu hình APP_ORIGIN. Đọc catalog local vẫn hoạt động; mở checkout qua URL ngrok để cookie, callback và kiểm tra origin thống nhất.
