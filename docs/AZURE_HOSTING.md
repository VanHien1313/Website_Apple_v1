# Hosting Aura: Netlify + Azure

Cập nhật 27/11/2026. Website đã chuyển backend và database khỏi Mac/ngrok.

## Kiến trúc đang vận hành

| Thành phần | Nơi chạy |
| --- | --- |
| Website | https://aura-store-vn.netlify.app |
| Frontend React API | Netlify, publish `frontend/dist-api` |
| Backend HTTPS | https://aura-store-vn-api-8c89.indonesiacentral.cloudapp.azure.com |
| Máy chủ | Azure VM `aura-web-01`, resource group `aura-store-hosting`, Indonesia Central |
| Cấu hình | Ubuntu 22.04 amd64, `Standard_B2als_v2`, 2 vCPU / 4 GB RAM, OS disk 32 GB Standard SSD |
| Ứng dụng | Express trong Docker, image build từ commit `55a0973` |
| Database | SQL Server 2022 Docker, database `AuraStoreTeam`, volume bền vững trên máy chủ |
| HTTPS | Caddy, chứng chỉ tự cấp/gia hạn qua ACME cho hostname backend |

Netlify proxy `/api/*` và `/health/*` tới Azure theo `netlify.toml`. Trình duyệt vẫn dùng cùng origin Netlify để giữ cookie đăng nhập. `APP_ORIGIN` và `PAYMENT_PUBLIC_ORIGIN` vẫn là `https://aura-store-vn.netlify.app`; callback Google, Zalo và ZaloPay không đổi.

Mac, Docker local và ngrok có thể tắt. Backend Mac được dừng khi chuyển; dữ liệu local giữ lại làm bản sao tại thời điểm cutover, không đồng bộ với các thay đổi mới trên Azure.

## Dữ liệu và quyền truy cập

Đã chốt backup `COPY_ONLY` khi backend Mac dừng ghi, xác minh SQL checksum và SHA-256 trước/sau chuyển qua SSH. Restore vào SQL Server mới, không dùng `WITH REPLACE`. Các số lượng đối chiếu tại cutover:

| Bảng dữ liệu | Số lượng |
| --- | ---: |
| Sản phẩm | 48 |
| SKU | 133 |
| Khách hàng | 2 |
| Quản trị | 1 |
| Đơn hàng | 19 |

Đây là số lượng tại thời điểm chuyển, có thể tăng/giảm khi người dùng thao tác. Tài khoản, mật khẩu đã hash, lịch sử đơn và ảnh được giữ từ backup; không tạo mật khẩu quản trị mặc định trong source.

Backend chạy bằng user Linux `node`, `NODE_ENV=production`. Tài khoản SQL runtime riêng `aura_hosting_app` không có sysadmin/CREATE TABLE và không sửa được bảng lịch sử migration. Kết nối SQL bật mã hóa và xác minh CA/hostname (`DB_TRUST_SERVER_CERTIFICATE=false`); SQL chỉ truy cập trong mạng Docker, không publish cổng 1433. Chỉ HTTPS/HTTP được mở cho người xem; SSH quản trị được giới hạn khi triển khai.

Compose vận hành, CA/key SQL, secret OAuth/thanh toán, secret SQL và backup đặt riêng dưới `/srv/aura` trên VM. Bản cấu hình/credential trên máy quản trị nằm trong `deploy/secrets/azure-hosting` và `deploy/secrets/azure-cli`, được Git ignore. Không copy những thư mục này vào repository hoặc frontend.

## Kiểm tra website

```sh
curl --fail https://aura-store-vn.netlify.app/health/ready
curl --fail https://aura-store-vn.netlify.app/api/v1/payments/methods
```

Kết quả mong đợi lần lượt là `status: ready` và `mode: sandbox`, phương thức `cod`, `zalopay`. Kiểm tra thêm trang chủ, ảnh sản phẩm, `/admin/login`, giỏ hàng và checkout trên trình duyệt mới.

Qua Azure Portal, chọn VM rồi **Run command → RunShellScript** để đọc trạng thái mà không mở thêm SSH:

```sh
cd /srv/aura
docker compose ps -a
docker compose logs --tail=80 app caddy
```

Log có thể chứa thông tin vận hành; không công khai toàn bộ log hoặc xuất `docker inspect`/environment chứa khóa.

## Cập nhật ứng dụng

Frontend và backend được phát hành riêng. Push GitHub không tự cập nhật cả hai môi trường.

- Frontend: build API, deploy lại Netlify theo README. Không đổi domain khi chỉ cập nhật source.
- Backend: đăng nhập VM bằng kênh quản trị được cấp; sao lưu database Azure trước thay schema. Đưa source đã kiểm thử vào `/srv/aura/source`, chọn commit cụ thể, rồi build image mới.
- Khi có migration mới, dùng tài khoản migration riêng được cấp quyền phù hợp; không cấp DDL cho runtime để chạy migration. Initializer restore hiện tại không phải công cụ tự nâng cấp schema.

Ví dụ cập nhật backend **không đổi schema**, sau khi source đã ở đúng commit và đã có backup:

```sh
cd /srv/aura
docker compose build app
docker compose up -d --no-deps app
docker compose ps -a
```

Chỉ hoàn tất khi app healthy, healthcheck public đạt và các chức năng đã kiểm tra. Không chạy `down -v`, không thay file mật khẩu SQL để tự xoay vòng login và không chạy initializer local `AuraStoreDocker` vào server này.

## Tín dụng sinh viên và sao lưu

Subscription là Azure for Students, spending limit đang **On** tại thời điểm triển khai. Không nâng cấp sang Pay-As-You-Go hoặc bỏ spending limit trong đợt chuyển này.

Giá compute tại thời điểm kiểm tra: `Standard_B2als_v2` ở Indonesia Central là 0,0428 USD/giờ, khoảng 31 USD cho 730 giờ; ổ đĩa và public IP tính thêm. Các chi phí này dùng tín dụng sinh viên trong hạn mức, không có cam kết chạy miễn phí đủ 12 tháng. Xem chi phí/tín dụng còn lại trong Azure Portal; giữ lại spending limit. Microsoft có thể vô hiệu hóa dịch vụ khi hết tín dụng/hết hạn.

Có thể stop/deallocate VM khi không cần demo để giảm compute, nhưng website sẽ tạm ngừng và ổ đĩa/IP vẫn có thể tính chi phí. Backup cutover trên Mac chỉ giữ dữ liệu lúc chuyển; phải sao lưu lại **database Azure đang dùng** trước khi hết credit, xóa tài nguyên hoặc thực hiện nâng cấp. Volume SQL và backup cùng VM không thay thế backup ngoài máy chủ. Chưa thiết lập lịch backup tự động/offsite trong đợt triển khai này.

Nguồn: [Azure for Students](https://learn.microsoft.com/en-us/azure/education-hub/about-azure-for-students), [spending limit](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit), [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices).

## Phạm vi kiểm chứng sau chuyển

- App/SQL healthy; restore đủ số lượng, checksum migration đúng, quyền runtime SQL và TLS đạt.
- Link Netlify public trả catalog/ảnh SQL, các deep link và đăng nhập owner thành công trong khi backend Mac tắt.
- Google/Zalo API bắt đầu OAuth trả đúng callback Netlify. Việc xác nhận trên tài khoản/điện thoại vẫn do người dùng thực hiện khi đăng nhập.
- Từ Azure đã tạo và query được một phiên ZaloPay sandbox 10.000 VND chưa thanh toán. Probe không tạo đơn trong AuraStoreTeam và không thu tiền. Chưa xác nhận thanh toán thành công hoặc callback thật của nhà cung cấp trong lần chuyển hosting này.
