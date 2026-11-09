# Kế hoạch hoàn thiện frontend Aura

Ngày lập: 15/10/2026. Cập nhật triển khai: 17/10/2026. Trạng thái từng giai đoạn ghi dưới đây; các hạng mục còn lại vẫn là kế hoạch.

## Tiến độ thực hiện

| Giai đoạn | Trạng thái | Bằng chứng / phạm vi |
| --- | --- | --- |
| 1. Nền tảng giao diện | Đã triển khai | Tokens, component, layout cửa hàng/admin, 404/403, tách khối lớn; xem [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) và [kết quả smoke test](qa/phase-1/results.json) |
| 2. Trải nghiệm mua sắm | Đã triển khai | C01-C05 và L01 phía khách; xem [bàn giao giai đoạn 2](STOREFRONT_PHASE_2.md) và [smoke test](qa/phase-2/results.json) |
| 3. Quản trị danh mục/tài khoản | Đã triển khai frontend demo | CRUD catalog/tài khoản, phiên theo vai trò, nguồn dữ liệu chung; đổi mật khẩu chỉ diễn tập biểu mẫu. Xem [bàn giao giai đoạn 3](ADMIN_PHASE_3.md) |
| 4. Đơn và báo cáo | Đã triển khai frontend demo | Đơn chung với checkout, chuyển trạng thái/lịch sử, thanh toán riêng, báo cáo ngày/tuần/tháng; xem [bàn giao giai đoạn 4](ORDERS_PHASE_4.md) |
| 5. Tài khoản khách | Đã triển khai frontend demo | Đăng ký/login/đổi mật khẩu mẫu, liên kết đơn theo ID, lịch sử/hủy đơn, admin chỉ xem khách; xem [bàn giao giai đoạn 5](CUSTOMER_PHASE_5.md) |
| 6. Nghiệm thu toàn bộ | Đã nghiệm thu phạm vi frontend demo; còn kiểm tra trước production | Xem [nghiệm thu và giới hạn](FRONTEND_ACCEPTANCE.md), [bàn giao backend](BACKEND_HANDOFF.md); chưa chứng nhận WCAG/cross-browser/zoom thật |

## 1. Mục tiêu và nguyên tắc

Hoàn thiện giao diện khách hàng và quản trị theo Đề tài số 3, đủ luồng thao tác và trạng thái để nối backend/database sau này. Giữ nền React 19 + TypeScript + Vite + Tailwind hiện có, kế thừa service contract, domain và cart đã tái cấu trúc.

Ưu tiên phần bắt buộc của PDF trước. Đăng ký/tài khoản khách hàng là phần nâng cao; Google OAuth, thanh toán online và email tự động không phải điều kiện hoàn thành frontend bắt buộc. Docker và hosting thuộc yêu cầu hệ thống cuối cùng, sẽ triển khai khi có backend.

Frontend hoàn thiện nghĩa là người dùng có thể đi hết luồng bằng mock adapter có dữ liệu nhất quán, lỗi được xử lý rõ và hợp đồng tích hợp được mô tả. Không coi route guard phía trình duyệt là phân quyền thật, hoặc đơn mô phỏng là giao dịch thật.

## 2. Định hướng thị giác

**Aura: cửa hàng công nghệ cao cấp, gọn, rõ, chú trọng sản phẩm.** Dùng nền trắng/ngà và xám nhạt, chữ than đậm, xanh cobalt cho hành động chính; giữ nhận diện hiện có nhưng giảm hiệu ứng trang trí và mật độ nhãn khuyến mãi.

- Trang chủ có một câu chuyện sản phẩm nổi bật, ảnh lớn và CTA rõ; các section bên dưới phục vụ khám phá danh mục và lựa chọn sản phẩm.
- Trang danh mục ưu tiên khả năng so sánh: tên, cấu hình, giá, tình trạng hàng; chiều cao thẻ nhất quán, ít badge, bộ lọc dễ hiểu.
- Trang chi tiết dùng bố cục ảnh/cấu hình rõ ràng; màu, dung lượng và tồn kho là các lựa chọn có trạng thái cụ thể.
- Checkout giảm nhiễu, thể hiện chính xác giá, phí, lỗi trường nhập và tiến trình gửi đơn.
- Admin dùng sidebar, breadcrumb, thanh thao tác và bảng dữ liệu; cùng tokens với storefront nhưng tăng mật độ thông tin có kiểm soát.
- Rà lại Plus Jakarta Sans hiện có với tiếng Việt và các cỡ chữ nhỏ trước khi quyết định đổi font; ưu tiên tính dễ đọc, tối đa hai họ font và số weight cần thiết.
- Chuẩn hóa cả sáng/tối, icon, radius, shadow, spacing và focus. Dùng token theo vai trò: text, surface, border, action, success, warning, danger; tránh màu hard-code rải rác.
- Motion phục vụ phản hồi thao tác, có `prefers-reduced-motion`; tránh countdown tự lặp và số bán/đánh giá suy diễn tạo cảm giác dữ liệu thật.
- Asset có nguồn và quyền sử dụng rõ. Nội dung bảo hành/ủy quyền, đánh giá và khuyến mãi phải lấy từ dữ liệu được xác nhận hoặc gắn nhãn demo phù hợp.

## 3. Ma trận màn hình theo PDF

| ID | Yêu cầu | Màn hình/luồng | Ưu tiên |
| --- | --- | --- | --- |
| C01 | Tìm tên, khoảng giá, danh mục | Header search, `/search`, trang danh mục, filter/sort URL | Bắt buộc |
| C02 | Danh sách có ảnh, tên, giá, giá khuyến mãi | ProductCard/ProductGrid, danh mục | Bắt buộc |
| C03 | Chi tiết tên, giá, ảnh, mô tả | `/product/:slug`, lựa chọn biến thể, gallery, mô tả/thông số | Bắt buộc |
| C04 | Giỏ: giá, số lượng, tổng tiền | `/cart`, sửa/xóa dòng, biến thể hết hàng, thay đổi giá | Bắt buộc |
| C05 | Đặt hàng nhanh | `/checkout`, xác nhận và mã đơn; tên/SĐT/địa chỉ bắt buộc, email tùy chọn cho luồng khách vãng lai | Bắt buộc theo hướng guest checkout đã chọn |
| L01 | Phân trang, tìm kiếm, sorting, filter cho danh sách | Catalog, search và mọi danh sách quản trị | Bắt buộc |
| A01 | Đăng nhập admin | `/admin/login`, session demo, trạng thái hết phiên/không có quyền | Bắt buộc |
| A02 | Quản lý sản phẩm thêm/xóa/sửa/tìm/lọc | `/admin/products`, `/new`, `/:id/edit`, chi tiết, xác nhận xóa | Bắt buộc |
| A03 | Quản lý danh mục | `/admin/categories`, tạo/sửa/xóa, danh mục đang có sản phẩm | Bắt buộc |
| A04 | Quản lý đơn và xem chi tiết | `/admin/orders`, `/:id`, danh sách hàng, số lượng, người nhận, tổng giá | Bắt buộc |
| A05 | Cập nhật trạng thái đơn | Hủy, đang chuẩn bị, đang giao, đã giao, hoàn thành; modal xác nhận, lịch sử thay đổi | Bắt buộc |
| A06 | Quản lý tài khoản admin | `/admin/admin-users`, tạo/sửa/xóa/đổi mật khẩu, lỗi quyền | Bắt buộc |
| A07 | Doanh thu theo ngày/tuần/tháng | `/admin`, `/admin/reports`, chọn kỳ, biểu đồ + bảng dữ liệu cùng nguồn | Bắt buộc |
| O01 | Đăng ký, đăng nhập khách, đổi mật khẩu | `/register`, `/login`, `/account/security` | Nâng cao |
| O02 | Lịch sử, trạng thái, hủy đơn chưa giao | `/account/orders`, `/:id`, lý do không được hủy | Nâng cao |
| O03 | Liên kết đơn với người đăng nhập | Checkout tự điền, đơn tham chiếu customerId | Khi triển khai tài khoản khách |
| O04 | Admin xem danh sách/thông tin khách | `/admin/customers`, `/:id`; chỉ xem thông tin | Bắt buộc có điều kiện nếu triển khai O01 |

Danh sách phân trang cần giữ query qua Back/Forward, đổi bộ lọc về trang 1, xử lý trang vượt phạm vi. Các nhóm thẻ giới thiệu ở trang chủ là preview có giới hạn và liên kết sang trang danh sách đầy đủ; xác nhận cách hiểu này với tiêu chí chấm trước nghiệm thu cuối cùng.

## 4. Trình tự triển khai và đầu ra

### Giai đoạn 1: Hệ thống thiết kế và bố cục nền

- Lập tokens sáng/tối, type scale, spacing, grid và quy chuẩn ảnh.
- Chuẩn hóa Button, Input, Select, Checkbox, Radio, FieldError, Badge, Alert, Toast, Skeleton, EmptyState, Dialog, Drawer, Tabs, Pagination.
- Thành phần phức tạp có quản lý focus, Escape và khôi phục focus. Chỉ bổ sung thư viện headless sau khi kiểm tra tương thích React 19/Tailwind 3 và giấy phép; không đổi stack chỉ vì skill gợi ý.
- Layout storefront và admin tách route/lazy chunk; thêm trang 404 và 403 rõ ràng.
- Tách Header/Home/PDP/Checkout lớn theo khối chức năng, tránh một component tổng quát với nhiều boolean prop.

**Đầu ra:** trang thử component nội bộ hoặc fixture UI, bảng tokens, hai layout, quy tắc dùng component. **Nghiệm thu:** các trạng thái cơ bản và bàn phím hoạt động ở cả hai theme.

### Giai đoạn 2: Hoàn thiện trải nghiệm mua sắm

- Chỉnh trang chủ, danh mục, search, chi tiết, giỏ, checkout theo cùng nhịp thị giác.
- Search desktop/mobile thống nhất; gợi ý có trạng thái không có kết quả/lỗi; kết quả toàn danh mục và filter hoạt động cùng nhau.
- PDP: giá theo biến thể, hết hàng, ảnh lỗi, lựa chọn không hợp lệ, thêm giỏ và mua ngay có phản hồi.
- Giỏ/checkout: kiểm tra lại giá và tồn hàng, form gắn label và mô tả lỗi, điều kiện giao hàng rõ, chặn gửi lặp, lỗi gửi giữ dữ liệu.
- Luồng khách vãng lai không bắt email; tên, SĐT, địa chỉ đủ để đặt nhanh theo PDF. Cập nhật đồng bộ kiểu dữ liệu, validator, mock và test.
- Thành công đơn có route/mô hình dữ liệu rõ, hỗ trợ tải lại trong demo; không tuyên bố đã thanh toán chỉ vì chọn phương thức.

**Đầu ra:** C01-C05, L01 phía khách. **Nghiệm thu:** tìm Mac -> lọc/sắp xếp -> chọn biến thể -> giỏ -> đặt nhanh -> xem xác nhận; kiểm tra cả trường hợp rỗng và lỗi.

### Giai đoạn 3: Quản trị sản phẩm, danh mục và tài khoản admin

- Xây trang login, AdminLayout và quyền demo; tránh hard-code credential thật hoặc lưu mật khẩu trong localStorage.
- Xây danh sách quản trị tái sử dụng có toolbar tìm kiếm/lọc/sort/phân trang, loading, empty, error/retry; trạng thái URL độc lập từng màn hình. Giai đoạn 3 dùng hàng dạng card để giữ thao tác dễ đọc trên mobile.
- Form sản phẩm: tên, slug, danh mục, mô tả, ảnh, biến thể màu/dung lượng, SKU, giá, giá gốc và tồn kho. Preview ảnh chỉ là preview trước khi có upload backend.
- Quản lý danh mục, xử lý xóa danh mục có sản phẩm; quản lý tài khoản admin, xác nhận hành động và trạng thái không đủ quyền.
- Dùng mock repository chung để sửa sản phẩm trong admin phản ánh ra storefront trong môi trường demo.

**Đầu ra:** A01-A03, A06 và L01 quản trị. **Nghiệm thu:** tạo/sửa/xóa demo có validation và cập nhật danh sách; không có nút chính chỉ trang trí.

### Giai đoạn 4: Đơn hàng và báo cáo

- Danh sách đơn theo mã, người nhận, khoảng ngày, trạng thái; chi tiết thể hiện đúng các trường PDF.
- Tách fulfillment status khỏi payment status. Định nghĩa trạng thái COMPLETED riêng và bảng chuyển trạng thái hợp lệ, tránh dùng PAID làm trạng thái vận chuyển.
- Đơn tạo từ checkout xuất hiện trong admin demo; thay đổi trạng thái phản ánh đúng trên chi tiết và danh sách.
- Thống kê ngày/tuần/tháng lấy từ cùng mock dataset đơn; dữ liệu biểu đồ và bảng khớp nhau, có trạng thái không phát sinh doanh thu.
- Đề xuất quy tắc doanh thu để chốt trong API: dựa trên đơn hoàn thành, xử lý hủy/hoàn tiền riêng; định nghĩa rõ ngày ghi nhận và múi giờ Asia/Ho_Chi_Minh. Đây là quyết định nghiệp vụ đề xuất, PDF chưa mô tả công thức.

**Đầu ra:** A04-A05, A07. **Nghiệm thu:** đơn mới -> admin xem -> chuẩn bị -> giao -> đã giao -> hoàn thành -> báo cáo phù hợp; hủy đơn không làm tăng doanh thu.

### Giai đoạn 5: Tài khoản khách hàng (phần nâng cao)

- Sau phần bắt buộc, triển khai O01-O04 như một nhóm đầy đủ: đăng ký/đăng nhập, đổi mật khẩu, lịch sử/trạng thái/hủy đơn, gắn đơn với khách và màn hình admin chỉ xem khách hàng.
- Chuẩn bị UI cho lỗi email trùng, phiên hết hạn, mật khẩu sai, đơn không thuộc tài khoản, đơn đã giao không được hủy.
- Không coi mock role/session là chứng minh an toàn hoặc quyền truy cập thật.

**Đầu ra:** nhóm chức năng tài khoản hoàn chỉnh ở mức frontend demo. Có thể tách khỏi mốc bàn giao bắt buộc nếu lịch triển khai cần ưu tiên backend.

### Giai đoạn 6: Kiểm tra thị giác, accessibility và bàn giao tích hợp

- Kiểm tra ở chiều rộng 360, 390, 768, 1024, 1440 px, hai theme, zoom 200%, bàn phím và reduced motion.
- Mục tiêu WCAG 2.2 AA: tương phản, label/error liên kết, thứ tự focus, tên nút icon, modal không mất focus, thông báo không chỉ dựa vào màu. Kiểm tra mục tiêu theo guideline chính thức khi triển khai; không tự chứng nhận đạt chuẩn chỉ qua một công cụ.
- Bảng admin trên mobile có cách đọc/chỉnh sửa khả dụng; không thu nhỏ chữ để nhét toàn bảng.
- Ảnh có tỷ lệ cố định, lazy-load khi ngoài màn hình; route chia mã; trang chủ dùng truy vấn giới hạn theo section khi thêm backend.
- Unit/integration test cho quy tắc và state; E2E cho hành trình chính; visual snapshot cho layout quan trọng. Đã khắc phục kết nối localhost cho smoke test Chrome bằng cách chạy browser và Vite cùng môi trường ngoài sandbox; E2E đầy đủ vẫn thực hiện ở giai đoạn này.
- Chạy typecheck/test/build; rà lỗi console, link/nút chết và thông tin demo gây hiểu nhầm.

**Đầu ra:** frontend nghiệm thu, danh sách kiểm thử, API contract cập nhật, bảng mô hình dữ liệu và danh sách việc backend/database.

## 5. Chuẩn bị backend/database trong quá trình làm frontend

| Mô hình | Dữ liệu cần thể hiện | Quyền quyết định khi có backend |
| --- | --- | --- |
| Product / Category | ID, slug, tên, ảnh, mô tả, danh mục, trạng thái | Kiểm tra dữ liệu, quyền sửa, quan hệ danh mục |
| Variant / Inventory | SKU, màu, dung lượng, giá, tồn kho | Giá, tồn kho và giữ hàng trong giao dịch |
| Order / OrderItem | Mã, khách/guest, địa chỉ snapshot, dòng hàng snapshot, tiền, trạng thái | Ghi đơn nguyên tử, tổng tiền, idempotency |
| OrderStatusEvent | Trạng thái trước/sau, thời gian, người thao tác | Chuyển trạng thái, quyền và nhật ký |
| AdminUser / Session | Hồ sơ hiển thị, role, trạng thái phiên | Mật khẩu băm, xác thực, kiểm tra quyền mọi request |
| Customer | Hồ sơ và liên kết đơn (nếu làm tài khoản) | Quyền xem/sửa và sở hữu đơn |
| RevenueReport | Kỳ báo cáo, tổng, các dòng theo thời gian | Tổng hợp theo công thức đã chốt |

Mọi list service nhận query định kiểu và trả items/total/page/pageSize, với kiểu lỗi thống nhất. Bổ sung contract cho admin catalog, category, order, admin user, report và customer nếu chọn phần nâng cao. Mock và HTTP adapter triển khai cùng interface; UI không import fixture trực tiếp.

Sắp xếp theo ngày phải có timestamp thật trong fixture, không dùng badge để suy luận. Giá tiền lưu số nguyên VND; thời gian dùng ISO ở API và định dạng theo múi giờ hiển thị. Trạng thái rỗng/lỗi/403/409/422 cần có fixture kiểm tra.

Mock repository demo phải có reset/seed rõ và dữ liệu liên thông giữa storefront/admin. Chỉ dùng dữ liệu giả; không lưu password hoặc token thật trong cơ chế demo. Database migration, hashing, upload, phân quyền, thanh toán, email, Docker và hosting vẫn là phần triển khai backend/hệ thống tiếp theo.

## 6. Điều kiện sẵn sàng chuyển sang backend

Đối chiếu ngày 17/10: các checkbox dưới đây là tiêu chí đầy đủ ban đầu, không tự động đánh dấu từ build. Phạm vi đã đạt, ngoại lệ L01, auth demo và kiểm tra thủ công còn lại được ghi tại [FRONTEND_ACCEPTANCE.md](FRONTEND_ACCEPTANCE.md). Có thể bắt đầu backend theo [BACKEND_HANDOFF.md](BACKEND_HANDOFF.md).

- [ ] Từng yêu cầu bắt buộc PDF có route, luồng thao tác, trạng thái lỗi và tiêu chí test tương ứng.
- [x] Frontend storefront/admin dùng cùng mô hình dữ liệu và service contract.
- [ ] Có đầy đủ trạng thái loading/empty/error/success/disabled/submitting; dialog thao tác phá hủy có xác nhận.
- [ ] Các danh sách bắt buộc có tìm kiếm/lọc/sắp xếp/phân trang.
- [x] Tính tiền, trạng thái đơn và công thức báo cáo demo được mô tả và có test; công thức production còn cần chốt nghiệp vụ.
- [x] Form, responsive, theme và keyboard được kiểm tra trên Chrome; zoom thật/cross-browser/screen reader còn cần nghiệm thu.
- [x] Không có credential thật, API key hoặc quyền giả được mô tả là bảo mật thật.
- [x] API_CONTRACT và bảng quan hệ dữ liệu khớp frontend; các phần nâng cao được đánh dấu riêng.
- [x] Typecheck/test/build đạt; E2E có bằng chứng, không suy từ build.

## 7. Skill sử dụng

- `frontend-design`: định hướng thị giác, bố cục, typography và độ hoàn thiện giao diện.
- `vercel-react-best-practices`: performance và React lifecycle.
- `web-design-guidelines`: rà soát giao diện, accessibility và tương tác.
- `vercel-composition-patterns`: cấu trúc component/form/dialog/table có thể mở rộng.

Nguồn, mức phổ biến quan sát được, kết quả kiểm tra và phiên bản cài đặt ghi trong `SKILLS_REVIEW.md` cùng manifest. Lượt cài/star là tín hiệu cộng đồng, không phải chứng nhận không có rủi ro. Skill chỉ được dùng trong phạm vi công việc; không chạy script hoặc lệnh được gợi ý mà chưa đánh giá mục đích và quyền cần thiết.
