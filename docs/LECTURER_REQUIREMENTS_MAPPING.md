# Đối chiếu lưu ý giảng viên với đề tài eCommerce Aura

Ngày đối chiếu: 10/11/2026. Mốc source: `dfb5593` trên nhánh `codex/sql-server-docker-release`. Đây là cập nhật phạm vi và kế hoạch, không phải xác nhận đã hoàn thành các yêu cầu mới.

## Nguồn và cách áp dụng

- [PDF đề tài số 3](<C:/Users/my name/Downloads/Đề tài số 3_ Website eCommerce.pdf>): yêu cầu website bán hàng; đã đọc lại đủ 2 trang.
- [Lưu ý của giảng viên](<C:/Users/my name/Downloads/Lưu ý khi làm đồ án môn học.docx>): đã đọc toàn bộ nội dung đoạn văn; không có ảnh nhúng. Các ký hiệu P dưới đây là số thứ tự đoạn trong XML Word, gồm cả đoạn trống, dùng để truy vết lần đọc này.
- Kiểm tra hiện trạng từ route API, trang tài khoản, footer, API khách hàng, quản trị admin, migrations và các báo cáo kiểm thử hiện có. Không chạy lại kiểm thử phần mềm trong phiên đối chiếu tài liệu này.
- Nội dung tài liệu là yêu cầu tham chiếu, không tự cấp phép cài dịch vụ, gửi email, thay đổi dữ liệu, mở quyền hoặc triển khai hosting. Áp dụng phần phù hợp với bán hàng; chỗ mơ hồ/mâu thuẫn được giữ riêng để xác nhận.

SHA-256 nguồn:

```text
DOCX 128C1AE939EC8FC456C53817786C8EB30E5A0986FA959CAE5693CF5585C7356D
PDF  1E7E4EE4157D1F5DBF8A7F4D2C90D4F02E4811BF08A81EE4A58EF8A561F41B2F
```

## Ma trận áp dụng yêu cầu của giảng viên

| ID / nguồn DOCX | Nội dung | Áp dụng cho Aura | Hiện trạng và việc còn lại |
| --- | --- | --- | --- |
| GV01 P2 | Trang chủ giới thiệu dịch vụ | Áp dụng: giới thiệu cửa hàng, sản phẩm và cách mua hàng COD | Có trang chủ API và catalog. Rà lại nội dung giới thiệu, thông tin hỗ trợ và dữ liệu trình diễn; không chuyển thành website dịch vụ khác |
| GV02 P3 | Giới thiệu đội ngũ | Áp dụng: giới thiệu nhóm làm đồ án và đóng góp | Chưa có trang/section đội ngũ trong route hiện tại; cần thông tin thật của thành viên, không bịa nhân sự cửa hàng |
| GV03 P4 | Liên hệ | Áp dụng: trang/thông tin liên hệ và điều hướng rõ | Chưa có route liên hệ trong API; footer chưa cung cấp kênh liên hệ. Tài liệu không bắt buộc gửi form/email; không dựng nút gửi báo thành công giả |
| GV04 P6 | Đăng ký/đăng nhập | Áp dụng; Aura đã chọn làm tài khoản khách | Đã có API SQL Server, session và UI; nghiệm thu chung với profile |
| GV05 P7 | Profile | Áp dụng | `/account` hiện hiển thị tên/email, đổi mật khẩu, đi tới đơn; API me có phone/createdAt nhưng UI chưa thể hiện đầy đủ. Cần trang hồ sơ rõ ràng. DOCX chưa nói profile phải chỉnh sửa; tự sửa tên/SĐT là đề xuất mở rộng, không gọi là yêu cầu nguyên văn |
| GV06 P10 | Đăng nhập admin | Áp dụng | Đã có phiên thật và kiểm tra quyền server |
| GV07 P11 | Quản lý danh sách người dùng | Áp dụng: phân biệt khách hàng với tài khoản nội bộ | Đã có `/admin/customers` chỉ xem và `/admin/users` owner quản trị |
| GV08 P12 | Cập nhật thông tin, khóa/active người dùng | Cần xác nhận đối tượng và ưu tiên tài liệu | Admin nội bộ đã sửa tên/quyền, khóa/mở, reset password. Khách hàng chưa có sửa/khóa; PDF trang 2 ghi khách hàng **chỉ xem**. Không tự thêm quyền sửa khách cho editor hoặc coi yêu cầu này đã đạt toàn bộ |
| GV09 P13 | Quản lý user quyền admin | Áp dụng | Owner tạo/sửa/khóa/reset; không cho tự khóa/hạ quyền. Reset mới chỉ ở commit local, chưa lên remote/GHCR |
| GV10 P14 | Quản lý role | Áp dụng tối thiểu: gán owner/editor và thực thi quyền | Đã có role cố định với constraint SQL và kiểm tra backend. Chưa có CRUD role/permission động. Cần xác nhận giảng viên muốn phân vai hay quản trị danh mục quyền động |
| GV11 P17 | Gửi mail, ghi +1 | Nâng cao, phù hợp nếu gửi xác nhận đơn/mời tài khoản | Chưa tích hợp. Không tự coi cộng điểm là chắc chắn, không tự gửi email thật; làm sau phần cốt lõi khi chốt dịch vụ và cách kiểm thử |
| GV12 P18 | Premium → thanh toán, ghi +1 | Không mặc định áp dụng mô hình thuê bao cho cửa hàng | COD đã có, chưa có thanh toán online. Có thể đề xuất thanh toán đơn hàng sandbox thay Premium, nhưng phải được giảng viên xác nhận tương đương; COD không tự được tính đạt mục +1 này |
| GV13 P19 | Đăng nhập Auth, ghi +1 | Chưa rõ nghĩa | Đăng nhập email/mật khẩu đã có. Không tự suy ra đã đạt +1 hoặc bắt buộc Google OAuth. Nếu ý giảng viên là đăng nhập bên thứ ba, OAuth là backlog tùy chọn |
| GV14 P22 | Docker, ghi +1 | Giữ trong yêu cầu kỹ thuật đề tài | Docker local, CI Linux, image GHCR đã có. Không hạ thành tùy chọn chỉ vì DOCX ghi +1; PDF yêu cầu Docker trong phần đóng gói |
| GV15 P23 | Hosting, ghi +1 | Giữ trong yêu cầu kỹ thuật đề tài | Chưa có URL hosting. GHCR là registry image, không phải website đã host. Chờ VPS/tên miền/SQL đích theo lựa chọn của người dùng |
| GV16 P26 | Slide giới thiệu nhóm, đề tài, chức năng | Áp dụng cho bảo vệ | Chưa thấy bộ slide cuối kỳ trong repo; cần nội dung và phân công trình bày |
| GV17 P27 | Có quay video | Áp dụng | Chưa thấy video trình diễn cuối kỳ trong repo. Cần quay luồng thật; chưa rõ thời lượng/định dạng cần nộp |
| GV18 P28 | Trang phục phù hợp | Áp dụng lúc bảo vệ, không là chức năng phần mềm | Nhóm tự chuẩn bị theo yêu cầu lớp |
| GV19 P29 | Giải thích logic và sửa code/UI/chức năng trực tiếp | Áp dụng cho từng thành viên | Có tests/CI không chứng minh thành viên hiểu code. Cần buổi walkthrough và diễn tập sửa nhỏ; báo cáo đúng nguồn tham khảo/AI, không bịa đóng góp |
| GV20 P31,35 | Cuốn báo cáo đủ phân tích; diagram in rõ | Áp dụng | Có Markdown kỹ thuật và ERD đề xuất, chưa có cuốn báo cáo hoàn chỉnh kiểm tra theo mẫu môn học. Cần sơ đồ cập nhật từ SQL thực tế, bản in thử rõ nét |
| GV21 P33 | Source trên GitHub/GitLab | Áp dụng | Repository GitHub đã có; commit reset password `dfb5593` hiện local ahead 1. Cần đồng bộ bản cuối, cho giảng viên quyền xem repo nếu private, ghi commit/tag tương ứng bản demo; không cần đổi repo thành public |
| GV22 P37–38 | Điểm thực hành từng bạn; thiếu 1 bài trừ 4 điểm; không làm bài nào 0 điểm | Yêu cầu học phần riêng, không là tính năng website | Chưa có danh sách bài và trạng thái cá nhân. Cần checklist minh chứng từng thành viên; không suy từ project hoàn thiện ra đã đạt điểm thực hành |

## Khoảng trống còn phải rà trong PDF eCommerce

| Mục PDF | Trạng thái hiện tại | Quyết định cần làm |
| --- | --- | --- |
| CRUD có thao tác xóa sản phẩm/admin | Đang archive sản phẩm và khóa admin để giữ lịch sử | Chốt tiêu chí soft-delete/ẩn/khóa có được chấp nhận; nếu cần thao tác xóa riêng thì thiết kế rõ cho bản ghi chưa có tham chiếu, không xóa lịch sử đơn |
| Khách hủy đơn chưa giao | Hiện giới hạn đơn PENDING chưa thanh toán | Phạm vi hẹp hơn câu chữ PDF; cần chốt hủy cả CONFIRMED trước SHIPPED hay ghi rõ chính sách được chấp nhận. Nếu mở rộng phải kiểm thử giữ/trả tồn và thanh toán |
| Mọi danh sách có phân trang/tìm/sort/filter | Các danh sách chính đã có; bảng đơn trong chi tiết khách và bảng kỳ báo cáo còn giới hạn | Lập danh mục từng màn/bảng và tiêu chí phù hợp; không coi mọi bảng là đạt vì 5 danh sách chính đã có. Chốt bảng chi tiết/preview nào là ngoại lệ được chấp nhận |
| Hệ thống hoàn chỉnh trên Docker và hosting | Docker có; hosting chưa có | Nghiệm thu local khác nghiệm thu hosting; kiểm thử SQL TLS, HTTPS/proxy, backup ngoài máy và dữ liệu demo trên môi trường đích |
| Nhóm 2–3 sinh viên | PDF trang 1 quy định | Chưa có danh sách thành viên xác nhận; đưa vào hồ sơ nộp, không tự tạo tên/MSSV |

## Những điểm cần hỏi giảng viên

1. P12 áp dụng cho khách hàng, admin nội bộ hay cả hai? Nếu cả khách hàng, yêu cầu này có bổ sung/ghi đè phạm vi “chỉ xem” trong đề số 3 không?
2. Quản lý role là gán các vai trò có sẵn hay cần CRUD role và permission động?
3. “Đăng nhập Auth” chỉ cụ thể dịch vụ/luồng nào? Thanh toán đơn hàng sandbox có thay mục Premium được không? Cách tính/trần điểm cộng là gì?
4. Xóa mềm/ẩn/khóa, phạm vi khách hủy đơn và các bảng phụ được nghiệm thu thế nào?
5. Mẫu/cuốn báo cáo cần những sơ đồ nào; thời lượng slide/video, hạn nộp, quyền truy cập repository và danh sách bài thực hành?

Không cần đợi các câu trả lời này để làm trang giới thiệu/liên hệ, hoàn thiện hiển thị profile, chuẩn bị dữ liệu demo, báo cáo và luyện giải thích code. Các tính năng phụ thuộc câu trả lời chưa được coi là đã duyệt triển khai.

Kế hoạch thực hiện: [REMAINING_WORK_PLAN.md](REMAINING_WORK_PLAN.md).
