# B4.3.1 — API quản trị sản phẩm/cấu hình/màu/SKU

> Cập nhật sau B4.3.1: form quản trị đã được nối tại [B4.3.2](BACKEND_B4_PRODUCTS_UI.md). Các ghi chú chưa có UI phía dưới mô tả thời điểm hoàn thành nền API.

Ngày 29/10/2026. Hoàn thành nền API SQL Server trước khi nối form quản trị. Frontend `/admin/products` hiện vẫn là trang tài khoản quản trị; chưa có UI tạo/sửa sản phẩm qua API. Bước kế tiếp B4.3.2 triển khai form và nghiệm thu browser.

## Endpoint

Cookie admin owner/editor hoạt động, phiên chưa thu hồi/hết hạn và credential_version đúng. Quyền được kiểm tra lại trong transaction ghi. Thao tác POST/PUT yêu cầu Origin đúng, X-Aura-Request:1 và JSON. Router xác thực trước khi nhận body sản phẩm tối đa256KB; các endpoint checkout/auth giữ giới hạn16KB cũ.

| Endpoint | Công dụng |
| --- | --- |
| GET /api/v1/admin/products | q tối đa120 ký tự; active rỗng/true/false; page1..10000; phân trang20 trên SQL |
| GET /api/v1/admin/products/:id | toàn bộ bản ghi biên tập, cấu hình, màu và SKU, gồm các revision |
| POST /api/v1/admin/products | tạo aggregate trong một transaction;201 |
| PUT /api/v1/admin/products/:id | cập nhật aggregate đầy đủ, ID body phải khớp URL;200 |

Không hard-delete sản phẩm/SKU. Ngừng bán bằng `active:false`; storefront không trả sản phẩm và checkout mới từ chối, các đơn/snapshot/giữ tồn hiện có vẫn được xử lý bình thường. Có thể bật lại bằng active:true với revision mới.

## Payload để nối frontend

```json
{
  "id": "UUID sản phẩm (client tạo một lần)",
  "revision": "hex16 từ GET, chỉ bắt buộc khi PUT",
  "slug": "san-pham-moi",
  "name": "Tên sản phẩm",
  "categoryId": "demo-hardware",
  "active": true,
  "tagline": "",
  "thumbnail": "/images/placeholder.svg",
  "gallery": [],
  "description": ["Đoạn mô tả"],
  "keySpecs": [{"label":"Chip","value":"Mẫu"}],
  "detailedSpecs": [{"groupName":"Thông số","items":[{"label":"Kết nối","value":"Wi-Fi"}]}],
  "warrantyInfo": "",
  "subCategory": "",
  "badge": null,
  "configurations": [{"id":"UUID cấu hình","storage":"256GB","screenSize":"","connectivity":"","chip":""}],
  "colors": [{"id":"UUID màu","name":"Đen","hex":"#000000","image":"/images/placeholder.svg"}],
  "skus": [{"id":"UUID SKU","configurationId":"UUID cấu hình","colorId":"UUID màu","sku":"SKU-256-BLACK","price":10000000,"originalPrice":11000000,"onHand":5,"revision":0}]
}
```

Các chuỗi UUID mô tả trong ví dụ phải thay bằng UUID hợp lệ. GET trả cùng dữ liệu, thêm reserved của SKU để hiển thị; client không được quyết định reserved. revision SKU mới có thể bỏ qua, SKU đã lưu bắt buộc dùng revision từ GET. Frontend cần giữ các ID khi retry tạo; trùng ID/slug/SKU trả409 thay vì tạo bản sao. Không tự sinh bộ ID/slug khác sau lỗi không xác định; tải lại để kiểm tra.

## Validation và định danh

Tối đa30 cấu hình,30 màu,100 SKU; cần ít nhất một mỗi loại. SKU phải tham chiếu cấu hình/màu trong payload, không lặp ID/SKU/cặp cấu hình-màu. Mã SKU được trim/uppercase, chỉ chữ ASCII/số/chấm/gạch dưới/gạch nối, tối đa120 ký tự; unique toàn catalog. Slug/mã danh mục chữ thường/số/gạch nối. Tên sản phẩm1..200, màu1..120. Các mảng mô tả/thông số/ảnh đều có giới hạn.

Giá nguyên VND an toàn, price>=1, originalPrice>=price. onHand nguyên0..2147483647. Ảnh chỉ nhận đường dẫn nội bộ `/images/...` hoặc `/api/v1/media/<UUID>`; ảnh media phải tồn tại. Không nhận URL bên ngoài/data/javascript; SVG chỉ là asset nội bộ do dự án quản lý, upload API vẫn chỉ raster theo B2.

Cho phép thêm cấu hình/màu/SKU vào aggregate đã có. Không được bỏ các ID con đã lưu khỏi payload; không đổi mã SKU hoặc cặp cấu hình/màu của SKU cũ. Cấu hình/màu thuộc sản phẩm khác bị từ chối. Đổi nhãn/mô tả không sửa snapshot các đơn đã tạo. Dừng bán một cấu hình hiện dùng tồn khả dụng0 khi không còn giữ hàng, hoặc ẩn cả sản phẩm; chưa có active riêng cho từng SKU.

## Transaction, concurrency và tồn kho

Migration006 thêm rowversion cho products. Version hex16 qua binary(8) để ổn định với driver; PUT kiểm tra phiên bản sản phẩm. SKU có revision số nguyên hiện có, tăng khi checkout/expiry/vận hành hoặc admin cập nhật; PUT kiểm tra tất cả revision SKU hiện hữu. Metadata không thay đổi nếu bất kỳ SKU nào stale.

Một SERIALIZABLE transaction lưu metadata, cấu hình, màu và inventory; rollback toàn bộ nếu bất kỳ bước nào lỗi. Khóa `catalog:products` tuần tự hóa các ghi catalog để bảo vệ slug/SKU unique. Trước khi khóa cập nhật sản phẩm, khóa inventory theo SKU UUID chữ thường và thứ tự ổn định giống checkout; không lấy khóa sản phẩm trước rồi chờ khóa SKU checkout đang giữ.

Admin chỉ điều chỉnh on_hand, không ghi reserved. Không cho on_hand thấp hơn reserved. Sản phẩm đổi giá/ẩn không làm thay đổi tổng tiền hoặc snapshot đơn cũ. Truy vấn quản trị dùng tham số; bảng động nội bộ chỉ variants/colors từ allowlist mã nguồn.

Lỗi409 gồm PRODUCT_EXISTS, STALE_PRODUCT, STALE_INVENTORY, STOCK_RESERVED, SLUG_EXISTS, SKU_EXISTS, SKU_IDENTITY_CHANGED, CHILD_ID_EXISTS, IDENTITY_REMOVAL. Lỗi422 cho payload, category/ảnh không tồn tại, thiếu revision hoặc ID URL khác body. Sau xung đột/lỗi mạng, frontend phải tải lại và cho người dùng xem khác biệt trước khi gửi lại.

## Kiểm chứng và giới hạn

56/56 test backend SQL Server đạt. Ca mới: validation aggregate, tạo đầy đủ graph, trùng slug/SKU rollback, thêm cấu hình/màu/SKU, hai lần lưu cùng revision, không xóa/đổi danh tính SKU, checkout làm stale inventory, chặn giảm dưới reserved, ẩn bảo toàn snapshot, cạnh tranh checkout với giảm tồn, trigger lỗi khi ghi SKU rollback toàn graph, HTTP quyền/Origin/body lớn và public catalog ẩn sản phẩm.

Đây là nghiệm thu API, chưa phải nghiệm thu browser cho form sản phẩm. Không thay frontend ở bước này. Không có hard-delete, audit log riêng cho sửa sản phẩm, upload ảnh hàng loạt hoặc import CSV; chưa kiểm thử tải lớn/nhiều instance production.

Backend typecheck/build đạt. Migration006 đã áp dụng thành công vào AuraStore ngày 29/10/2026. Môi trường khác cần chạy db:migrate và khởi động lại backend. Tests chỉ dùng AuraTest riêng, không tạo/sửa sản phẩm thật trong AuraStore.
