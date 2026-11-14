# Bổ sung catalog ngày 11 tháng 11 năm 2026

## Kết quả hiện hành

Main tại http://127.0.0.1:4000 có **36 sản phẩm, 104 SKU và 52 ảnh WebP nội bộ**. Đã thêm 12 mẫu, đồng thời điền bảng thông số chi tiết còn trống cho 24 mẫu cũ. Demo http://localhost:4001 giữ 8 sản phẩm để bộ kiểm thử nghiệp vụ cũ không thay đổi.

| Nhóm | Mẫu mới | Cấu hình được nhập |
| --- | --- | --- |
| iPhone | 17, 17 Pro, 17 Pro Max, Air | Mỗi mẫu 256GB, một màu có ảnh đối chiếu |
| iPhone | 16e | 128GB Trắng |
| iPad | A16 | Wi-Fi 128GB Vàng |
| iPad | Air 11 inch M3 | Wi-Fi 128GB Ánh Sao |
| iPad | Air 13 inch M3 | Wi-Fi 256GB Tím, tồn 0 |
| Mac | Air 13 inch M4 | RAM 16GB, SSD 256GB, GPU 8 lõi |
| Mac | Air 15 inch M4 | RAM 16GB, SSD 256GB, GPU 10 lõi |
| Watch | Series 11 | GPS 42mm, nhôm Đen Bóng |
| Watch | SE 3 | GPS 40mm, nhôm Ánh Sao |

Không tạo các cấu hình/dung lượng khác bằng cách đoán giá. Mỗi sản phẩm mới có hai đoạn mô tả viết lại, 7–8 thông số nổi bật, nhóm màn hình/hiệu năng/kết nối và phần cấu hình/nguồn tham khảo. Mở sản phẩm rồi bấm **Xem cấu hình chi tiết** để xem đầy đủ.

## Nguồn và giới hạn

- Giá và ảnh chủ yếu lấy từ trang sản phẩm TopZone. Trang Thế Giới Di Động iPhone 17 được đọc để đối chiếu mẫu. Giá iPad Air 13 M3 lấy từ CellphoneS vì TopZone trả giá 0; CellphoneS báo hết hàng nên SKU được nhập tồn 0.
- Thông số 12 mẫu mới đối chiếu các trang Apple Support, không lấy các lời quảng cáo của cửa hàng làm thông số kỹ thuật. Mô tả được viết lại, không sao chép nguyên bài đánh giá.
- [Manifest nguồn từng sản phẩm](../deploy/catalog/expansion-sources.json) lưu URL trang giá, giá VND, tên cấu hình nguồn, URL ảnh, URL Apple và ngày ghi nhận. Giá là snapshot tham khảo, không có đồng bộ tự động hoặc cam kết là giá mua thực tế.
- Với 24 mẫu cũ, chỉ tổ chức thông tin hiện có thành bảng chi tiết: thông số, cấu hình, màu và bảo hành. **Chưa xác minh lại toàn bộ thông số/ảnh màu của 24 mẫu này**; phần nguồn trong dialog ghi rõ dữ liệu kế thừa frontend.
- Tồn ban đầu của mẫu mới là số lượng mô phỏng 10/SKU, riêng mẫu nguồn báo hết hàng là 0. Không tuyên bố đó là tồn của TopZone/CellphoneS. Không nhập đánh giá hoặc số lượng bán giả, không tạo giá gốc cao hơn để giả giảm giá.
- Ảnh được tải và lưu SQL, không phụ thuộc CDN khi mở website. Nguồn ảnh vẫn thuộc nhà cung cấp, không gọi là ảnh nhóm tự chụp.

## Vận hành và bảo toàn dữ liệu

Đã backup main COPY_ONLY, kiểm tra checksum trước nhập. Import tạo 12 sản phẩm và bổ sung `detailed_specs` còn trống ở 24 sản phẩm. Không sửa giá/tồn/revision của SKU cũ, không sửa tài khoản/khách/đơn. Số liệu trước/sau main: 24 → 36 sản phẩm, 1 admin, 0 khách, 0 đơn. Importer kiểm tra snapshot các SKU cũ trong transaction; nếu khác thì rollback.

```powershell
cd D:\Apple_Web
npm run test:catalog
npm run catalog:import -- --enrich          # xem trước
npm run catalog:import -- --apply --enrich  # nhập và điền bảng chi tiết còn trống
```

Chạy lại không nhân đôi sản phẩm hoặc reset tồn. Bảng chi tiết đã được người dùng sửa được giữ nguyên và đếm trong `preservedCustomDetails`. Việc điền bảng chi tiết chỉ xảy ra khi có `--enrich`; app không tự seed.

Source biên soạn: `deploy/catalog-expansion.mjs`; builder: `deploy/build-expanded-catalog.mjs`. Builder bình thường dùng manifest nguồn đã duyệt. `--capture-sources` chỉ dành cho bảo trì với cache trang đã tra cứu trong `logs/catalog-research`; không chạy tự động trên server. `catalog:prepare` tái tạo cả dữ liệu gốc và phần mở rộng, không làm mất 12 mẫu mới.

## Kiểm chứng

- Đã đạt: main 36 sản phẩm / 52 ảnh / 36 báo giá; demo 8 sản phẩm / 15 ảnh / 8 báo giá. Kết quả máy đọc được: `docs/qa/catalog-expanded/results.json`.
- Chạy lại import thực tế: `created: 0`, `enriched: 0`, `skipped: 36`; tài khoản và đơn giữ nguyên. Tái tạo catalog cho cùng checksum; cả 3 test đều pass.
- 3 tests: validator SQL, ID/SKU duy nhất, thông tin nguồn/giá/ảnh, mô tả và nhóm thông số, checksum WebP.
- Browser/API harness kiểm tra catalog, ảnh, chi tiết, báo giá cho từng sản phẩm, tình huống SKU hết hàng, dialog thông số và mobile. Minh chứng mới ở `docs/qa/catalog-expanded`; bộ ảnh `catalog-import` giữ làm lịch sử của lần nhập 24 mẫu.
- Không cần rebuild image ứng dụng vì schema và code frontend/backend không thay đổi. Báo cáo Word/slide trước đó là snapshot cũ, cần cập nhật số liệu trước nộp.
- Lượt kiểm tra đầu đã hoàn tất phần main nhưng ngắt kết nối host ở cổng 4001; demo vẫn ready trong container. Đã restart riêng demo-app để phục hồi cổng, không restart SQL hoặc sửa dữ liệu. Harness chờ dữ liệu liên quan tải xong trước chụp ảnh để không chụp vùng lazy-load còn trắng.
