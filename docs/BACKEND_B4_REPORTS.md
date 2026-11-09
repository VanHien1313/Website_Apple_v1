# B4.1 — Báo cáo doanh thu SQL Server

Ngày 29/10/2026. Mở `/admin/reports` trong chế độ API; có liên kết từ tài khoản quản trị. Đây là phần báo cáo của B4; CRUD sản phẩm/danh mục/tài khoản quản trị còn tiếp tục ở các bước sau.

## Hợp đồng và cách tính

`GET /api/v1/admin/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&period=day|week|month`

Cookie admin hợp lệ, hồ sơ owner/editor đang hoạt động, phiên chưa hết hạn/thu hồi và đúng credential_version. Kiểm tra quyền cùng transaction truy vấn. Khách/guest không truy cập. Response no-store, không trả thông tin người nhận hay danh sách đơn.

- Ngày thực trong 2000–2099; from không sau to; tối đa 367 ngày gồm hai đầu. period mặc định day. Sai dữ liệu trả422 INVALID_REPORT.
- Chỉ `orders.status=COMPLETED AND payment_status=PAID`; dùng completed_at tại giờ Việt Nam UTC+7. Khoảng SQL là `[00:00 ngày đầu, 00:00 ngày sau ngày cuối)` đổi sang UTC.
- Doanh thu = SUM(total), gồm phí giao hàng. Giá hàng trong total đã là giá bán; không trừ discount lần nữa. Đơn hủy, chưa hoàn thành, chưa thu tiền và REFUNDED không được tính.
- Trung bình = tổng tiền / số đơn, làm tròn VND; không có đơn thì0.
- Tuần bắt đầu thứ Hai; nhãn là ngày thứ Hai. Nhãn tháng YYYY-MM. Kỳ đầu/cuối chỉ cộng phần nằm trong khoảng chọn. Các kỳ trống vẫn có dòng0.

Đây là báo cáo theo trạng thái hiện tại: khi một đơn được đánh dấu hoàn tiền, nó bị loại khỏi kỳ hoàn thành ban đầu. Chưa là sổ kế toán theo ngày hoàn tiền, chưa tính giá vốn/lợi nhuận/thuế hay hoàn một phần.

## Truy vấn và độ chính xác

WHERE so sánh trực tiếp completed_at với hai biên UTC, giữ khả năng dùng index `orders_revenue` có sẵn. SQL GROUP BY ngày Việt Nam và SUM decimal(38,0), trả tối đa367 dòng tổng hợp theo ngày; server nhóm tuần/tháng và thêm kỳ trống. Không tải toàn bộ đơn về Node hoặc trình duyệt.

Tổng/count được cộng bằng BigInt, kiểm tra giới hạn JS safe integer trước chuyển sang JSON number. Vượt giới hạn trả422 REPORT_TOO_LARGE, không âm thầm làm tròn sai tiền. Giao diện hướng dẫn chọn khoảng ngắn hơn.

Response: `{from,to,period,timeZone,total,count,average,rows:[{label,count,amount}]}`. Bộ lọc URL chia sẻ được; mặc định đầu tháng đến hôm nay theo Asia/Ho_Chi_Minh. Màn hình có ba chỉ số tổng, bảng kèm thanh so sánh dùng cùng thang đo toàn khoảng và phân trang12 kỳ. Các chỉ số không thay đổi theo trang bảng.

Loading/lỗi không giữ số tiền cũ dưới bộ lọc mới. Có empty state, retry, tải lại khi focus và chuyển đăng nhập khi401. Không fallback sang báo cáo demo. Không thêm thư viện biểu đồ.

## Kiểm chứng và vận hành

43/43 test backend SQL Server và 41/41 test frontend đạt; typecheck/build backend/API, kiểm tra ranh giới bundle đều đạt. Test mới: ngày không hợp lệ và năm nhuận, mốc17:00UTC/00:00VN, tuần thứ Hai, tháng, khoảng đầu/cuối, kỳ trống, loại trạng thái, số tiền sát/vượt safe integer, owner/editor, admin vô hiệu hóa/thu hồi, customer/guest, HTTP no-store.

16/16 nhóm smoke Chrome đạt trên bản build API dùng SQL Server cô lập; đối chiếu doanh thu với đơn COD hoàn tất từ UI, loại đơn hủy, đổi nhóm/phân trang, khoảng rỗng/sai, lỗi503 không giữ số cũ, retry, mobile và401 sau logout. Đã kiểm tra trực quan desktop/mobile; đổi nhóm không lặp bộ lọc. Kết quả: [results.json](qa/api-frontend/results.json). Ảnh [desktop](qa/api-frontend/revenue-desktop.png), [mobile](qa/api-frontend/revenue-mobile.png).

Không cần migration mới; dùng schema001..004. Khởi động lại backend bản build mới, chạy frontend chế độ API. Test chỉ tạo dữ liệu trong database AuraTest riêng, không sửa doanh thu AuraStore.
