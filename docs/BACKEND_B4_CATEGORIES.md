# B4.2 — CRUD danh mục SQL Server

Ngày 29/10/2026. Chế độ API có `/admin/categories`, liên kết từ tài khoản quản trị. B4.1 báo cáo giữ nguyên; CRUD sản phẩm và tài khoản quản trị là phần tiếp theo.

## Quy tắc

Owner/editor đang hoạt động, phiên server còn hiệu lực được tạo/đổi tên/xóa. Khách và guest không có quyền. Kiểm tra quyền trong cùng transaction với thao tác; dùng helper `auth/admin-access.ts` chung với vận hành đơn.

Mã danh mục cố định sau khi tạo: chữ thường ASCII, số, dấu gạch nối; tối đa200 ký tự; không gạch nối đầu/cuối/liên tiếp. Tên trim, dài1..120 ký tự. Không trùng mã hoặc normalized_name theo collation SQL Server hiện có (không phân biệt hoa/thường). Không đổi mã để giữ liên kết sản phẩm/URL.

Xóa chỉ khi không có sản phẩm tham chiếu, bao gồm sản phẩm đã ẩn. Không cascade xóa sản phẩm. Giao diện hiển thị số sản phẩm và không đưa thao tác xóa cho danh mục đang được dùng; server vẫn tự kiểm tra lại. Xóa danh mục rỗng cần tích xác nhận.

## API

| Phương thức/đường dẫn | Hợp đồng |
| --- | --- |
| GET /api/v1/admin/categories | `q` tối đa120 ký tự, `page`1..10000; kết quả `{items,total,page,pageSize:20}` |
| POST /api/v1/admin/categories | `{id,name}` →201 danh mục mới |
| PUT /api/v1/admin/categories/:id | `{name,revision}` →200 danh mục cập nhật |
| POST /api/v1/admin/categories/:id/delete | `{revision}` →204 |

Mỗi dòng quản trị có id,name,revision,productCount. Truy vấn phân trang tại SQL, tìm literal bằng CHARINDEX, không ghép input vào SQL. Endpoint public `/api/v1/categories` giữ response id/name và phản ánh tên mới ngay lần đọc tiếp theo.

Mutation cần Origin đúng, X-Aura-Request:1, JSON và cookie admin HttpOnly. Lỗi:422 INVALID_CATEGORY/INVALID_REVISION/INVALID_QUERY;409 CATEGORY_EXISTS/CATEGORY_NAME_EXISTS/STALE_CATEGORY/CATEGORY_IN_USE;404 khi danh mục không còn;401 khi phiên không hợp lệ.

## Đồng thời và phục hồi

Migration005 thêm `categories.version rowversion`. API trả chuỗi hex16 ký tự, chuyển rõ qua binary(8) trước khi CONVERT sang varchar để tương thích driver SQL Server. Không chuyển version sang số JavaScript.

Transaction SERIALIZABLE và app lock `catalog:categories` bảo vệ mutation danh mục cùng kiểm tra trùng tên. Đọc hàng với UPDLOCK/HOLDLOCK và đối chiếu revision trước update/delete. Rowversion của danh mục tạo lại khác phiên bản trước khi xóa nên form cũ không ghi đè bản mới, kể cả dùng cùng mã.

Ràng buộc unique/FK vẫn là lớp bảo vệ database. Kiểm tra sản phẩm trong transaction ngăn xóa khi có tham chiếu. Khóa mutation hiện áp dụng chung toàn danh mục (tần suất ghi thấp), không khóa toàn cửa hàng cho checkout.

Sau lỗi không xác định/phiên bản cũ/đã xóa, UI khóa thao tác và yêu cầu tải lại để kiểm tra; không tự gửi lại. Mã cố định giúp retry create không sinh bản sao; update/delete dùng revision để tránh tác động lặp. Chưa có nhật ký audit riêng cho CRUD danh mục, không có đổi mã hoặc xóa hàng loạt.

## Kiểm chứng

49/49 test backend SQL Server, 41/41 test frontend đạt; typecheck/build backend/API và kiểm tra ranh giới bundle đạt. Test mới bao phủ input, Unicode/trùng tên chuẩn hóa, cạnh tranh tạo trùng và sửa cùng phiên bản, xóa/tạo lại cùng mã, danh mục có sản phẩm ẩn, tìm kiếm/phân trang, CSRF/quyền/thu hồi phiên, public catalog cập nhật.

17/17 nhóm smoke Chrome đạt, dùng database AuraTest cô lập: tạo/đổi tên/xóa bằng UI, trùng tên, form cũ sau cập nhật từ phiên khác, bảo vệ danh mục có sản phẩm, tìm kiếm rỗng và mobile không tràn ngang. Kết quả [results.json](qa/api-frontend/results.json); ảnh [desktop](qa/api-frontend/categories-desktop.png), [mobile](qa/api-frontend/categories-mobile.png).

## Vận hành

Migration `005_category_version.sql` đã áp dụng thành công vào AuraStore cục bộ ngày29/10/2026. Môi trường khác chạy db:migrate trước khi khởi động backend mới; không sửa migration001..004. Backend bản cũ cần khởi động lại. Frontend dùng dev:api hoặc build:api. Không tạo/xóa danh mục thật trong AuraStore để kiểm thử; dữ liệu thử chỉ ở AuraTest.
