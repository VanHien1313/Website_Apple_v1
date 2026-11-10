# Kế hoạch phần còn lại của Aura theo đề tài và lưu ý giảng viên

Cập nhật 10/11/2026, sau commit local `dfb5593`. Dùng tài liệu này làm thứ tự công việc hiện hành; các kế hoạch frontend 15–17/10 và B1–B5 cũ giữ vai trò lịch sử. [Ma trận đối chiếu giảng viên](LECTURER_REQUIREMENTS_MAPPING.md) giải thích nguồn, mức áp dụng và các điểm chưa rõ.

## Đã có nền tảng nào

Frontend React/API Express/SQL Server đã nối các luồng catalog, giỏ, checkout COD, tài khoản khách, đơn hàng, CRUD quản trị và doanh thu. B1–B4 phần lớn đã triển khai; chưa đánh dấu hết mọi tiêu chí vì còn khác biệt về xóa, hủy đơn và bảng phụ. B5 đã có đóng gói Docker, kiểm thử CI, backup/restore diễn tập, GHCR và cấu hình staging; phần hosting thực tế chưa làm.

Mốc kiểm thử gần nhất ghi nhận 77 backend tests trên SQL Server Windows, 41 frontend tests và 22 nhóm E2E trên Docker. Reset password admin mới đã chạy local, chưa push/phát hành lại GHCR. Bộ công cụ staging có 11 tests đã đạt ở phiên trước. Đây là bằng chứng kỹ thuật hiện có, không thay thế báo cáo, bảo vệ cá nhân hoặc nghiệm thu yêu cầu bổ sung mới.

Docker local có owner thật nhưng 0 sản phẩm/0 đơn ở lần xác minh gần nhất. Không lấy trang cửa hàng trống hoặc dữ liệu test tạm đã dọn làm bộ dữ liệu trình diễn cuối kỳ. Không seed hay thay mật khẩu tài khoản thật chỉ để làm video.

## Tổng quan các giai đoạn còn lại

| Giai đoạn | Mức ưu tiên / điều kiện | Kết quả cần có |
| --- | --- | --- |
| R1. Hoàn thiện thông tin website và profile | Làm tiếp ngay trên local | Giới thiệu nhóm, liên hệ, profile rõ ràng và điều hướng nhất quán |
| R2. Chốt quản lý người dùng, vai trò và khác biệt PDF | Rà ngay; code phần phụ thuộc sau xác nhận | Phạm vi quyền được chốt, các chỗ lệch tiêu chí được xử lý hoặc chấp nhận có ghi nhận |
| R3. Nghiệm thu bản local để trình diễn | Sau R1 và các phần R2 đã chốt | Dữ liệu demo có chủ đích, checklist bao phủ, bản code kiểm thử và hướng dẫn chạy lại |
| R4. Đồng bộ bản cuối và triển khai hosting | Đồng bộ source làm được; hosting chờ hạ tầng | Repository đúng bản, image đúng commit, URL HTTPS hoạt động và biên bản nghiệm thu |
| R5. Báo cáo, slide, video và bảo vệ | Bắt đầu song song R1–R3 | Bộ nộp đầy đủ, diagram rõ nét, mỗi thành viên giải thích và sửa được phần mình |
| R6. Nâng cao để xét điểm cộng | Tùy chọn, sau khi xác nhận cách áp dụng | Email/OAuth/thanh toán sandbox phù hợp bán hàng; không tự thêm Premium |

R1–R5 là các nhóm công việc cần hoàn tất hoặc làm rõ để nghiệm thu; R6 không được dùng thay cho phần cốt lõi. Không ước lượng phần trăm hoàn thành hoặc thời hạn khi chưa biết lịch nộp, đội ngũ và phản hồi giảng viên.

## R1 Hoàn thiện website và profile

1. Nhận tên/MSSV/vai trò/đóng góp thật của nhóm, kênh liên hệ được phép công bố. PDF yêu cầu nhóm 2–3 người; không tự suy ra nhóm hiện có đủ thành viên.
2. Bổ sung trang/section giới thiệu Aura và đội ngũ. Trình bày đây là đồ án cửa hàng, không tự nhận đại lý/ủy quyền Apple hoặc bịa địa chỉ/nhân sự.
3. Bổ sung trang liên hệ và liên kết ở header/footer. Thông tin tĩnh hoặc liên kết email/điện thoại là phạm vi tối thiểu; form gửi yêu cầu chỉ thêm khi có nơi tiếp nhận và trạng thái thật. Gửi mail thuộc R6 nếu chọn.
4. Hoàn thiện `/account` thành hồ sơ khách rõ ràng: tên, email, SĐT, thông tin đã có từ API; lối đi đổi mật khẩu/đơn hàng. Tự sửa tên/SĐT là đề xuất riêng; chưa mặc định yêu cầu thay email, upload avatar hoặc lưu nhiều địa chỉ.
5. Kiểm tra deep link, mobile, bàn phím, nhãn form, trạng thái tải/lỗi và API/demo boundary.

**Hoàn tất khi:** thông tin thật đã được duyệt, trang/section truy cập được từ điều hướng, profile dùng API/SQL, không có nút giả; có kiểm thử phù hợp và ảnh desktop/mobile. Chưa có thông tin nhóm vẫn có thể chuẩn bị bố cục nhưng không đánh dấu nội dung cuối kỳ đã xong.

## R2 Chốt quyền và các điểm khác tiêu chí

1. Lập bảng quyền guest/customer/editor/owner theo hành động hiện có; kiểm tra backend thực thi đúng bảng, không chỉ ẩn nút.
2. Xác nhận “quản lý role” là phân vai có sẵn hay CRUD role động. Phạm vi mặc định hiện tại vẫn owner/editor; không mở rộng schema quyền khi chưa rõ nhu cầu.
3. Xác nhận việc sửa/khóa khách hàng. Nếu giảng viên yêu cầu bổ sung: định nghĩa actor được phép, trường được sửa, active/locked, version, thu hồi session và ảnh hưởng tới checkout. Đơn cũ giữ snapshot, khóa tài khoản không xóa đơn. Cần migration mới, API/UI/tests; **chưa triển khai trong kế hoạch này**.
4. Chốt “xóa” sản phẩm/admin có được dùng archive/khóa hay cần thao tác khác; giữ lịch sử và bảo vệ owner cuối cùng.
5. Chốt khách được hủy đến trạng thái nào trước giao hàng; kiểm thử cạnh tranh với admin giao đơn, tránh hoàn tồn hai lần.
6. Kiểm kê mọi danh sách/bảng: catalog, products, categories, customers, users, admin orders, account orders, đơn lồng trong khách, bảng doanh thu, preview trang chủ. Ghi khả năng tìm/phân trang/sort/filter hoặc ngoại lệ giảng viên chấp nhận.

**Hoàn tất khi:** các lựa chọn có tiêu chí nghiệm thu rõ, chức năng được chốt đã có API/UI/migration nếu cần, tests quyền và nghiệp vụ đạt. Không yêu cầu xây hệ thống role tổng quát hoặc sửa khách chỉ từ một dòng lưu ý chung.

## R3 Nghiệm thu local và chuẩn bị dữ liệu trình diễn

1. Chuẩn bị dữ liệu trình diễn được phép: sản phẩm/ảnh/giá minh họa rõ nguồn, SKU có/hết hàng, khách, đơn ở các trạng thái và kỳ doanh thu. Ưu tiên môi trường demo riêng, không trộn fixture vào database cửa hàng thật.
2. Lập kịch bản khách tìm → chọn cấu hình → giỏ/checkout → admin xử lý COD → khách xem đơn → báo cáo. Kèm tình huống hết hàng, giá đổi, stale revision, quyền bị từ chối, đăng xuất/đổi/reset mật khẩu.
3. Chạy test theo thay đổi; nghiệm thu các trang mới và quyết định R2. Giữ bằng chứng gắn với commit cụ thể, không coi số test cũ là bằng chứng cho chức năng chưa viết.
4. Kiểm tra keyboard/mobile/zoom trên trình duyệt dùng khi bảo vệ, deep link và UI dữ liệu trống. Xác nhận không có placeholder, dữ liệu demo giả thành dữ liệu kinh doanh, hoặc mật khẩu/token trong repo/log/video.
5. Diễn tập clone/cấu hình/migrate/chạy theo README trên môi trường thử sạch; kiểm tra backup/restore và hướng xử lý khi Docker không lên. Không tự reset volume đang chứa dữ liệu thật.

**Hoàn tất khi:** kịch bản chính và lỗi đi hết được, dữ liệu demo tái tạo có kiểm soát, checklist mới đạt, hướng dẫn người khác chạy được.

## R4 Đồng bộ source và hosting

1. Review, push commit local còn thiếu lên GitHub, chạy CI, đồng bộ main sau khi đạt. Ghi commit/tag dùng khi demo và cấp quyền đọc cho giảng viên nếu repo private; không tự đổi public.
2. Phát hành image mới nếu runtime đổi. Image GHCR ngày 09/11 chưa có reset password ngày 10/11; không dùng manifest cũ để tuyên bố bản mới đã triển khai.
3. Khi có hạ tầng: chốt VPS Linux amd64, tên miền, SQL Server đích, certificate/CA, secret và quyền truy cập. Người dùng hiện chọn tiếp tục local, nên bước này đang chờ.
4. Theo [runbook](STAGING_HOST_RUNBOOK.md): pull đúng digest, host-check, preflight, backup, migrate, start, cấu hình nginx và HTTPS.
5. Nghiệm thu từ ngoài host: HTTPS, cookie Secure, SQL TLS xác thực, proxy IP, firewall, health/log/disk và backup ngoài máy; restore sang instance riêng trước vận hành cần mức bảo đảm đó.

**Hoàn tất khi:** có URL hosting truy cập được, chạy đúng image/commit, có biên bản kết quả. Docker/GHCR/CI không thay cho URL hosting. DOCX ghi +1 không làm mất yêu cầu hosting trong PDF.

## R5 Hồ sơ nộp và bảo vệ

1. Lấy mẫu báo cáo/rubric/hạn nộp của lớp. Chưa có mẫu thì chuẩn bị đề cương đề xuất: bài toán/phạm vi, yêu cầu, use case, kiến trúc, database, thiết kế giao diện/API, luồng nghiệp vụ, kiểm thử, triển khai, kết quả/giới hạn, tài liệu tham khảo và phân công. Đây là đề cương đề xuất, không phải danh mục sơ đồ giảng viên đã chỉ định.
2. Dựng ERD từ migrations SQL Server thực tế; use-case/sequence/activity hoặc các diagram khác theo nội dung đã học và mẫu được xác nhận. Đặc biệt diễn giải checkout transaction/idempotency, tồn kho, xác thực/phân quyền và báo cáo doanh thu.
3. Soạn cuốn báo cáo cuối, giữ nguồn sơ đồ có thể sửa, xuất hình/vector rõ và kiểm tra bản in thử; không dùng ảnh diagram mờ lấy từ màn hình.
4. Làm slide giới thiệu nhóm/đề tài/chức năng chính, kiến trúc ngắn gọn, kết quả và phân công. Không tự đặt thời lượng bắt buộc khi chưa có yêu cầu lớp.
5. Quay video luồng thật ở R3, thể hiện chức năng chính và môi trường chạy; che credential/dữ liệu cá nhân. Chốt định dạng/thời lượng/cách nộp với lớp.
6. Mỗi thành viên walkthrough phần mình: frontend gọi API, validation/phân quyền, SQL/transaction, test, Docker. Diễn tập sửa một trường form, bộ lọc hoặc quy tắc nghiệp vụ và kiểm tra lại; có thể giải thích nguồn tham khảo và việc dùng AI trung thực.
7. Đối chiếu bài thực hành từng người theo danh sách của môn, ghi bài đã làm/thiếu và minh chứng; đây là điểm cá nhân riêng. Chuẩn bị trang phục và phân công thao tác khi bảo vệ.

**Hoàn tất khi:** có cuốn báo cáo, slide, video đúng yêu cầu lớp, diagram in rõ, source đúng bản và mỗi người trình bày/sửa code được. Không đánh dấu đạt dựa trên việc assistant đã viết tài liệu.

## R6 Nâng cao có lựa chọn

Ưu tiên đề xuất nếu còn thời gian: email xác nhận đơn (phù hợp nhất với luồng hiện có), OAuth nếu giảng viên xác nhận ý “Auth”, thanh toán đơn sandbox nếu được chấp nhận thay mục Premium. Chốt nhà cung cấp, môi trường thử và tiêu chí trước triển khai. Không mặc định làm cả ba, không đảm bảo +3 điểm, không thêm subscription chỉ vì tài liệu chung nhắc Premium. Audit log, đổi email admin, forced password change là cải tiến tự đề xuất, không tự trở thành yêu cầu bắt buộc của giảng viên.

## Bước tiếp theo đề xuất

Tiếp tục **R1: trang giới thiệu nhóm, liên hệ và hiển thị profile**, đồng thời chuẩn bị đề cương R5. Gom các câu hỏi R2 để người dùng trao đổi giảng viên. Chưa yêu cầu mua VPS ngay và chưa triển khai Premium/OAuth/role động. Phiên cập nhật kế hoạch này chỉ sửa tài liệu, không thay source ứng dụng, database hoặc phát hành image.
