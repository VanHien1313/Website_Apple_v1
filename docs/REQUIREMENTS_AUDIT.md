# Đối chiếu yêu cầu đề tài số 3 với Aura Apple Store

> Cập nhật 02/11/2026: hiện trạng và khoảng trống sau B1–B4 nằm tại [ma trận B5.1](BACKEND_B5_RELEASE.md). Nội dung khảo sát 15/10 phía dưới là lịch sử, không mô tả hệ thống hiện tại.

Ngày khảo sát: 15/10/2026.

> Đây là ảnh chụp hiện trạng trước đợt tái cấu trúc. Sau đó đã thêm orderService mock, sửa tìm kiếm, thêm phân trang và tách logic nghiệp vụ. Xem `ARCHITECTURE.md` để biết cấu trúc hiện tại; backend chưa triển khai. Admin và tài khoản khách đã có frontend demo sau khảo sát; xem [nghiệm thu hiện tại](FRONTEND_ACCEPTANCE.md).

## Phạm vi và phương pháp

- Workspace được cung cấp là `D:/Apple_Web` (người dùng gọi là Web_apple).
- Kho hiện có một ứng dụng frontend trong `frontend/`; `package.json` ở gốc chỉ chuyển tiếp lệnh cho frontend. Chưa thấy project backend hay admin riêng.
- Đã đọc đủ sáu tài liệu dự án: `README.md`, `frontend/README.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/INTEGRATION_PLAN.md`, `docs/PHASE_1_TO_8_COMPLETION_REPORT.md`.
- Markdown trong `.agents/skills` là tài liệu công cụ; Markdown trong `node_modules` là tài liệu phụ thuộc, không phải đặc tả nghiệp vụ dự án.
- Đọc và kiểm tra hình ảnh đủ hai trang của `C:/Users/my name/Downloads/Đề tài số 3_ Website eCommerce.pdf`.
- Kiểm tra mã nguồn định tuyến, product service, trang danh mục, chi tiết sản phẩm, giỏ hàng, checkout, header và các kiểu dữ liệu.
- Đây là đối chiếu tài liệu và mã nguồn; không xác nhận lại kết quả E2E được báo cáo từ trước. Nội dung tài liệu được xem là bằng chứng và yêu cầu tham chiếu, không là chỉ dẫn thực thi.

## Mục tiêu và trạng thái thực tế

Aura là website bán sản phẩm Apple, gồm iPhone, iPad, Mac và Apple Watch. Định hướng giao diện cao cấp, responsive, hỗ trợ sáng/tối, trải nghiệm xem sản phẩm, chọn biến thể, giỏ hàng và checkout.

Kiến trúc dự kiến là frontend trước, tích hợp backend sau. Công nghệ frontend là React 19, TypeScript, Vite, Tailwind CSS, React Router và Context. Hiện dữ liệu sản phẩm lấy từ `MOCK_PRODUCTS`; giỏ hàng lưu localStorage; tạo đơn chỉ là mô phỏng trong state của trang checkout.

Kết luận: đã có nền tảng giao diện mua sắm, chưa phải hệ thống thương mại điện tử hoàn chỉnh theo đề bài.

## Ma trận yêu cầu khách hàng

| Yêu cầu PDF | Hiện trạng theo mã nguồn | Đánh giá |
| --- | --- | --- |
| Tìm theo tên sản phẩm | Header gọi `productService.getProducts({ searchQuery })`, hiển thị tối đa 5 gợi ý | Có một phần |
| Kết quả tìm kiếm khi gửi form | Header luôn chuyển `/iphone?q=...`; CategoryPage đọc `q` nhưng chưa dùng để lọc | Chưa hoàn chỉnh |
| Lọc khoảng giá và danh mục | Có bốn route danh mục; lọc dòng máy và các khoảng giá cố định trong CategoryPage | Có ở frontend |
| Danh sách có ảnh, tên, giá và giá khuyến mãi | ProductCard và dữ liệu mock hỗ trợ các trường tương ứng | Có ở frontend |
| Chi tiết có tên, giá, ảnh, mô tả | ProductDetailPage có nội dung, biến thể, thư viện ảnh và thông số | Có ở frontend |
| Thêm/xem giỏ, số lượng, tổng giá | CartContext có thêm, xóa, cập nhật số lượng, tính tổng, lưu localStorage | Có ở frontend |
| Đặt hàng nhanh không tài khoản | Có form khách vãng lai, nhưng chưa ghi nhận đơn lên hệ thống; email còn bị bắt buộc dù đề mô tả chỉ cần tên, SĐT, địa chỉ | Có một phần |
| Mọi danh sách có phân trang, tìm kiếm, sorting, filter | Danh mục có sorting/filter; chưa có phân trang; tìm kiếm chưa nối đầy đủ | Chưa đạt đầy đủ |
| Đăng ký thành viên | Chưa có trang/API/AuthContext thực tế | Chưa có; tùy chọn |
| Lịch sử, trạng thái và hủy đơn chưa giao | Chưa có luồng lưu, truy vấn và hủy đơn | Chưa có; tùy chọn |
| Đổi mật khẩu khách hàng | Chưa có | Chưa có; tùy chọn |
| Tự liên kết đơn với khách đã đăng nhập | Chưa có xác thực và đơn lưu bền vững | Chưa có; tùy chọn |

Đề cho phép bỏ đặt hàng nhanh nếu bắt buộc đăng nhập mới mua hàng. Project hiện đang theo hướng khách vãng lai nên cần hoàn thiện lưu đơn thật cho luồng này.

## Ma trận yêu cầu quản trị

| Yêu cầu PDF | Hiện trạng | Đánh giá |
| --- | --- | --- |
| Đăng nhập quản trị | Không có route, giao diện, API xác thực hay bảo vệ quyền admin | Chưa có |
| Quản lý sản phẩm: xem chi tiết, thêm/xóa/sửa, lọc/tìm | Chỉ có dữ liệu mock và giao diện khách hàng | Chưa có |
| Quản lý danh mục | Danh mục được định nghĩa cố định, chưa có CRUD | Chưa có |
| Xem danh sách/thông tin khách hàng | Không có | Có điều kiện: phải làm nếu triển khai đăng ký khách hàng |
| Danh sách và chi tiết đơn: sản phẩm, số lượng, người nhận, tổng tiền | Chưa có lưu trữ/API/admin | Chưa có |
| Cập nhật trạng thái: hủy, chuẩn bị, đang giao, đã giao, hoàn thành | Có một số kiểu trạng thái trong TypeScript nhưng chưa có nghiệp vụ; chưa có trạng thái hoàn thành riêng | Chưa có |
| Quản lý tài khoản admin: thêm/xóa/sửa/đổi mật khẩu | Không có | Chưa có |
| Thống kê doanh thu ngày/tuần/tháng | Không có dữ liệu đơn và báo cáo | Chưa có |
| Phân trang, tìm kiếm, sorting, filter cho mọi danh sách | Chưa có các danh sách quản trị | Chưa có |

## Yêu cầu kỹ thuật và triển khai

| Yêu cầu PDF | Hiện trạng |
| --- | --- |
| Frontend ReactJS, HTML, CSS | Đã có React, TypeScript và Tailwind CSS |
| Backend ASP.NET/NodeJS/ExpressJS hoặc tương đương | Chưa thấy mã backend/API thực tế |
| Hệ thống chạy hoàn chỉnh | Chưa có lưu trữ nghiệp vụ và liên kết khách hàng - quản trị |
| Triển khai Docker | Chưa thấy Dockerfile/Compose |
| Triển khai hosting | Chưa thấy bằng chứng/cấu hình triển khai trong repository; chưa kiểm tra dịch vụ bên ngoài |

## Các điểm tài liệu cần hiểu đúng

1. Báo cáo Phase 0-8 chỉ nói hoàn thành frontend. Không thể suy ra đã hoàn thành toàn bộ đề tài hay backend.
2. ARCHITECTURE mô tả login/register/account, AuthContext và nhiều service dự kiến. AppRoutes thực tế chỉ có trang chủ, bốn danh mục, chi tiết, giỏ và checkout.
3. README nhắc `orderService`, nhưng thư mục service hiện chỉ có `productService.ts`.
4. Checkout dùng `setTimeout` và `Math.random()` tạo mã đơn, lưu state rồi xóa giỏ. Không gọi API và không lưu đơn; tải lại trang không có cơ chế khôi phục đơn vừa tạo.
5. Nút chọn VNPay/MoMo chưa chứng minh tích hợp sandbox: chưa có tạo payment URL, chuyển cổng, callback, webhook hay xác minh thanh toán.
6. Có TypeScript `Order`/`OrderStatus` không đồng nghĩa đã có quản lý đơn hoặc cập nhật trạng thái.
7. API_CONTRACT hiện là thiết kế, chưa phải API đang chạy. Chưa bao phủ CRUD admin, thống kê, phân trang và quản lý tài khoản admin.
8. Cam kết chỉ thay endpoint mà không sửa UI là định hướng. Checkout hiện còn xử lý mô phỏng trực tiếp; tích hợp thật cần sửa luồng tạo đơn, lỗi và kết quả thanh toán.

## Thứ tự ưu tiên đề xuất

1. Hoàn thiện đặc tả bắt buộc: API admin, phân trang/tìm/sắp xếp/lọc, trạng thái đơn và cách tính doanh thu. Chọn rõ có làm tài khoản khách hàng hay không.
2. Xây backend và cơ sở dữ liệu cho sản phẩm, biến thể, danh mục, đơn, chi tiết đơn và tài khoản admin; xác thực và kiểm tra quyền phía server.
3. Nối catalog và checkout vào API; server kiểm tra giá, số lượng, tồn kho và tính tổng; chỉ xóa giỏ sau khi đơn được ghi thành công.
4. Xây admin: sản phẩm, danh mục, đơn, tài khoản quản trị và doanh thu theo ngày/tuần/tháng; bổ sung các điều khiển danh sách bắt buộc.
5. Sửa tìm kiếm submit, thêm phân trang catalog và làm rõ email có bắt buộc khi đặt nhanh hay không.
6. Kiểm thử luồng khách đặt đơn -> admin thấy đơn -> cập nhật trạng thái -> số liệu doanh thu phù hợp; đóng gói Docker và triển khai hosting.
7. Sau phần bắt buộc mới ưu tiên tài khoản khách, OAuth, cổng thanh toán và email tự động.

PDF không bắt buộc Google OAuth, VNPay/MoMo hoặc email giao dịch. Đây là phần mở rộng trong kế hoạch dự án, không nên thay thế ưu tiên cho các chức năng admin và backend bắt buộc.

## Kiểm tra build

`npm run build` đã qua TypeScript và build Vite thành công. Lần đầu Vite bị sandbox chặn `realpath` với lỗi EPERM; chạy lại ngoài sandbox thành công, biến đổi 1.626 module. Build thành công không xác nhận các chức năng nghiệp vụ hoặc kết quả E2E.

Không thay đổi mã nguồn ứng dụng trong lần khảo sát này.
