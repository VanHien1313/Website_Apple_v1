# Hồ sơ bảo vệ Aura

Cập nhật 10/11/2026 theo source ứng dụng `5b25b40`. Đây là bộ nội dung kỹ thuật để nhóm rà soát trước khi nộp, chưa thay thế mẫu chính thức của lớp.

- `Aura_Report.docx`: báo cáo 13 trang, có kiến trúc, dữ liệu, nghiệp vụ, bằng chứng kiểm thử và biên bản test tay chưa điền.
- `Aura_Defense.pptx`: 12 slide, nội dung/bảng/sơ đồ chỉnh sửa được, có ghi chú nguồn cho người thuyết trình. Ảnh giao diện là minh chứng từ môi trường kiểm thử/demo.

## Kiểm tra chất lượng

PowerPoint đã qua kiểm tra cấu trúc package, hình học bố cục và nhập lại bằng Artifact Tool. Đã xem đủ 12 ảnh slide và sửa chiều mũi tên. Báo cáo đã xuất bằng Microsoft Word, raster PDF bằng pypdfium2 và xem đủ 13 trang. Công cụ `render_docx.py` chuẩn chưa chạy thành công do thiếu LibreOffice; lần cài đặt trả mã 1602 (bị hủy). Vì vậy không ghi nhận đã đạt kiểm tra LibreOffice. Word xuất PDF thành công nhưng COM báo đóng sớm khi cleanup; PDF đọc đủ 13 trang.

Ảnh/PDF kiểm tra và receipt giữ trong `logs/submission`, không phải tệp nộp. Phiên này không sửa ứng dụng/database hay chạy lại bộ kiểm thử ứng dụng; số liệu trong hồ sơ là bằng chứng đã ghi nhận ở các phiên trước.

## Trước khi nộp

1. Bổ sung tên học phần, lớp, giảng viên và bìa theo mẫu lớp.
2. Chốt các khác biệt yêu cầu trong `docs/ACCEPTANCE_SCOPE.md` với giảng viên.
3. Thực hiện test tay theo `docs/MANUAL_TEST_GUIDE.md`, ghi kết quả thật vào phụ lục. Không đổi “Chưa chạy” thành PASS khi chưa thao tác.
4. Dùng `http://localhost:4001` để diễn tập và quay video. Đặt đơn mới nếu cần PENDING sau 24 giờ. Không quay mật khẩu/cookie/token.
5. Hai thành viên tự phân vai thuyết trình, giải thích và sửa code; báo cáo chỉ ghi nhận cả hai cùng thiết kế/phát triển theo thông tin đã xác nhận.
6. Đồng bộ source/image đúng phiên bản trước bàn giao. Hosting vẫn chưa triển khai vì chưa có VPS/tên miền.

## Tái tạo tài liệu

Source nằm trong `source/`. Builder dùng runtime Node/Python do Codex cung cấp. `build-slides.mjs` cần `AURA_RUNTIME_ROOT`, `RUNTIME_NODE_MODULES` và `AURA_PRESENTATION_SKILL`; tạo ảnh sơ đồ trước khi chạy `build-report.py`. Chạy từ thư mục gốc dự án. Finalizer PowerPoint không ghi đè file đã tồn tại: dùng tên đầu ra phiên bản mới khi tái tạo. Không cài dependency vào ứng dụng chỉ để build hồ sơ.
