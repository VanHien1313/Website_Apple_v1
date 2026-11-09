# Bàn giao giai đoạn 3 — Quản trị catalog và tài khoản

Ngày 16/10/2026. Phạm vi A01-A03, A06 và danh sách quản trị L01 ở mức frontend demo. Giai đoạn tiếp theo: đơn hàng và báo cáo doanh thu.

## Cách dùng

Mở `/admin/login`, chọn Chủ cửa hàng demo hoặc Biên tập viên demo. Đây là chọn hồ sơ để thử giao diện, không xác thực danh tính. Phiên sessionStorage tồn tại 60 phút; route và thao tác service kiểm tra hồ sơ còn hoạt động. Backend sau này phải thay toàn bộ cơ chế này bằng xác thực/phân quyền thật.

| Route | Chức năng |
| --- | --- |
| `/admin` | Số lượng catalog/tài khoản từ dữ liệu chung, liên kết module, khôi phục catalog mẫu có xác nhận và đăng xuất |
| `/admin/products` | Tìm tên/slug/SKU, lọc danh mục, sort tên, phân trang 6 dòng, xem storefront, sửa và xác nhận xóa |
| `/admin/products/new`, `/admin/products/:id/edit` | Tên, slug, danh mục, dòng máy, mô tả, ảnh đại diện/gallery, màu, cấu hình, SKU, giá/gốc, khả dụng; preview ảnh và lỗi lưu giữ dữ liệu |
| `/admin/categories` | Tìm/sort/phân trang, thêm/sửa/xóa; mã bất biến, chặn trùng, chặn xóa khi còn sản phẩm |
| `/admin/admin-users` | Chủ cửa hàng tạo/sửa/khóa/xóa hồ sơ; tìm tên/email, lọc role, sort/phân trang; chặn email trùng và tự khóa/hạ quyền/xóa |
| `/admin/403` | Từ chối truy cập module tài khoản đối với biên tập viên |

Đổi mật khẩu có biểu mẫu nhập lại, kiểm tra tối thiểu 12 ký tự và thông báo mô phỏng rõ ràng. Không lưu/log mật khẩu, không thay đổi cách đăng nhập demo. Đây là phần UI chuẩn bị tích hợp, chưa phải chức năng đổi credential thực.

## Dữ liệu và khả năng mở rộng

- `types/admin.ts` và `services/contracts.ts`: mô hình/hợp đồng AdminService. Component không trực tiếp ghi localStorage.
- `services/mock/catalogRepository.ts`: dữ liệu version 1, key `aura_catalog_v1`; seed từ fixture chỉ khi chưa có dữ liệu. Lỗi đọc/ghi báo lỗi, không âm thầm ghi đè dữ liệu hỏng.
- ProductService và OrderService đọc cùng catalog hiện tại. Sửa giá/khả dụng hoặc xóa sản phẩm được phản ánh khi mở/tải lại storefront; giỏ kiểm tra lại báo giá. Snapshot đơn đã lưu giữ nguyên.
- Danh mục là ID chuỗi có slug hợp lệ. Danh mục mới xuất hiện ở bộ lọc `/search`; bốn liên kết quảng bá iPhone/iPad/Mac/Watch vẫn là các khu vực cố định của storefront.
- AdminList chia sẻ tìm kiếm, sort tên, phân trang, trạng thái rỗng và query URL. Trang sản phẩm có bộ lọc danh mục; tài khoản có bộ lọc vai trò. Trạng thái loading/error/retry dùng AsyncState chung.
- Khôi phục catalog chỉ thay sản phẩm/danh mục/hồ sơ admin; không xóa đơn hoặc giỏ. Chỉ chủ cửa hàng demo thực hiện sau xác nhận.

Repository dùng đọc/sửa/ghi localStorage, chưa có transaction đa tab, kiểm soát phiên bản chỉnh sửa, phân trang server hoặc đồng bộ tức thì giữa tab. Adapter backend cần endpoint phân trang theo từng loại dữ liệu; `read()` toàn bộ catalog chỉ phù hợp fixture demo. Mật khẩu băm, upload và quyền mọi request thuộc backend. Tồn kho vẫn là boolean cấu hình, chưa là số lượng theo SKU/màu. Asset và chính sách thương mại cần duyệt trước xuất bản.

## Kiểm chứng

- 23 test Node về nghiệp vụ, gồm 6 test mới cho catalog/role/tài khoản/storage/reset.
- `npm run typecheck`, `npm run build`.
- `scripts/admin-smoke.mjs`: CRUD danh mục/sản phẩm/tài khoản; kiểm tra chặn xóa danh mục đang dùng, email trùng, lỗi storage giữ form, đổi giá hiện ra cảnh báo trong giỏ, vai trò không có quyền, hết phiên, reset có xác nhận; 5 màn hình × 3 chiều rộng × 2 theme.
- Ảnh và kết quả máy tại `qa/phase-3/`; kiểm tra tên sản phẩm giữ đủ chiều rộng trên mobile, không chỉ kiểm tra tràn ngang.
- Chạy lại storefront smoke và UI smoke để kiểm tra hồi quy nguồn catalog và route quản trị.

Chưa nghiệm thu đa trình duyệt hoặc chứng nhận accessibility; chưa triển khai quản lý đơn/báo cáo (giai đoạn 4), tài khoản khách (giai đoạn 5) hoặc backend/database.
