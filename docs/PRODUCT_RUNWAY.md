# Hero Aura — Product Runway

Tinh chỉnh typography: dùng tiêu đề ngắn “Khám phá Apple.”, bỏ slogan hai dòng và mô tả lặp lại; giảm độ đậm chữ, tách rõ tên/giá và bỏ số thứ tự trong thông số. Hình thiết bị là trọng tâm.

Tham khảo bố cục sân khấu có chiều sâu, danh sách lựa chọn và bảng thông tin bên cạnh của [IdeaToCodee/runway](https://github.com/IdeaToCodee/runway), cụ thể `pages/runway/index.html` và ảnh `preview.png`. REPORT của repo mô tả đây là bản lưu tĩnh từ Shopify. Không chạy hoặc đưa script, ảnh thời trang, mã checkout Shopify vào Aura.

Triển khai React/CSS riêng tại `frontend/src/components/product/ProductRunway.tsx`. Bốn thiết bị đại diện Mac, iPhone, iPad, Watch được truy vấn từ catalog SQL; mỗi nhóm chọn sản phẩm giá cao nhất, sắp theo giá giảm dần. Bộ sưu tập phía dưới giữ cách sắp xếp hiện hành.

- Thiết bị đang chọn nằm phía trước, ba thiết bị còn lại nhỏ dần ở phía sau.
- Giá, tên, ba thông số và link chi tiết thay đổi theo lựa chọn.
- Có nút trước/sau, nút chọn từng thiết bị, phím mũi tên và vuốt ngang; không chiếm cuộn dọc.
- Không tự chạy; tôn trọng `prefers-reduced-motion`. Có nhãn nút, trạng thái lựa chọn và live region cho thông tin thay đổi.
- Desktop có bảng thông tin bên phải; mobile chuyển xuống dưới và rút gọn thông số. Giữ chế độ sáng và đen–coban.
- Không thêm thư viện, không thay đổi giỏ hàng, giá hoặc nghiệp vụ đặt hàng. Nút chính mở trang cấu hình sản phẩm.

Ảnh kiểm chứng và kết quả trình duyệt tại `docs/qa/product-runway/`.
