> Cập nhật 12/11/2026: mật khẩu mới dài 8–128 ký tự, có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt; dấu cách không tính là ký tự đặc biệt. Áp dụng đăng ký, đổi/đặt lại mật khẩu và tạo quản trị. Đăng nhập vẫn chấp nhận mật khẩu cũ hợp lệ đã lưu.

> Cập nhật 11/11/2026: **đặt hàng bắt buộc đăng nhập khách hàng**; đăng ký cần họ tên, SĐT, email và địa chỉ. Email đơn lấy từ tài khoản. Các mục đặt hàng vãng lai/email tùy chọn bên dưới chỉ còn là lịch sử, không dùng để nghiệm thu mới. Xem [quy trình và kiểm thử hiện hành](MEMBER_CHECKOUT.md).

# Hướng dẫn tự kiểm thử từng chức năng Aura local

Ngày 10/11/2026. Đối chiếu bản ứng dụng local có reset mật khẩu admin ở commit `dfb5593`. Đây là hướng dẫn để người dùng tự thao tác, **không phải biên bản đã test tay đạt**. Các chức năng R1–R6 chưa xây được liệt kê cuối tài liệu.

## 1 Chuẩn bị môi trường và cách ghi kết quả

**Bổ sung nghiệm thu giao diện 10/11:** mở `/about` kiểm tra hai thành viên/MSSV; `/contact` kiểm tra email công khai. Từ hồ sơ thử menu Hồ sơ/Đơn hàng/Đổi mật khẩu, đối chiếu SĐT và ngày tham gia. Trong admin, dùng sidebar desktop hoặc nút Mở menu quản trị trên mobile để chuyển nghiệp vụ; editor không thấy Đội ngũ quản trị và vẫn bị backend từ chối nếu nhập URL. Thử `/account/not-a-page` và `/admin/not-a-page` (đã đăng nhập admin): phải báo trang không tồn tại. Các trường hợp này cần ghi kết quả test tay riêng dù E2E đã có kiểm tra.

Cập nhật luồng đăng nhập: tại `/login`, chọn **Khách hàng** hoặc **Quản trị viên**. Lựa chọn quản trị mở `/admin/login`, chỉ dùng tài khoản quản trị được cấp; đăng nhập thành công vào `/admin`. Khách hàng có liên kết đăng ký và vào `/account` sau đăng nhập. Kiểm tra chuyển lựa chọn xóa nội dung form cũ, không có đăng ký admin, và tài khoản khách không được dùng để cấp quyền quản trị. Google/Facebook chưa triển khai.

Mở Docker Desktop, chờ Engine chạy. Dùng **http://127.0.0.1:4000** cho mọi cửa sổ; không xen `localhost:4000` hoặc bản demo Vite port3000 vì cookie/storage/origin khác nhau. Vào `/health/ready`: phải trả HTTP200 trước khi test nghiệp vụ. Nếu lỗi Docker, dừng tại bước môi trường; không reset factory defaults hoặc xóa volume.

Có thể kiểm tra trạng thái từ PowerShell tại `D:\Apple_Web`:

```powershell
& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose ps --all
```

App và db phải healthy; init đã Exited(0) là bình thường. Hướng dẫn này không yêu cầu SQL trực tiếp, seed tự động, mật khẩu SA hoặc thay đổi migrations.

**Dữ liệu:** các thao tác dưới đây ghi thật vào database local qua UI, kể cả đơn và báo cáo. Chỉ dùng danh mục/sản phẩm/tài khoản có tiền tố `TEST-TAY`, không sửa owner thật hoặc dữ liệu kinh doanh. Lần xác minh trước có 1 admin, 0 sản phẩm, 0 đơn; nếu hiện trạng đã khác, ghi lại số liệu ban đầu và chỉ kiểm tra phần chênh lệch. Nếu local đã dùng dữ liệu thật, nên chuẩn bị database kiểm thử riêng trước khi làm các ca mutation. Không có nút xóa toàn bộ đơn thử an toàn trong UI.

Tách các phiên bằng **profile trình duyệt độc lập** hoặc Chrome/Edge/Firefox riêng:

| Cửa sổ/profile | Dùng làm gì |
| --- | --- |
| O | Owner hiện có, đăng nhập `/admin/login` bằng mật khẩu của bro |
| E | Editor thử, tạo ở mục 2 |
| A | Khách hàng A |
| B | Khách hàng B |
| G | Khách vãng lai, chưa đăng nhập khách |

Hai tab bình thường cùng profile dùng chung cookie; nhiều cửa sổ ẩn danh cũng có thể chung cookie. Dùng tab cùng profile chỉ khi chủ đích test nhiều tab. Tài khoản admin và khách có cookie riêng nên đăng xuất admin không đồng nghĩa đăng xuất khách.

Ghi kết quả theo mẫu, một dòng cho mỗi mã ca:

| Mã ca | Ngày/người test | Dữ liệu/ID/mã đơn | Mong đợi | Thực tế | PASS/FAIL/BLOCKED/CHƯA TEST | Ảnh hoặc ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| ENV01 | ... | local:4000 | healthy + trang mở | ... | CHƯA TEST | ... |

PASS cần quan sát đúng kết quả; thiếu dữ liệu để thử phân trang là BLOCKED, không phải PASS. Không ghi mật khẩu, cookie hoặc receipt token vào ảnh/biên bản. `F12 → Network` xem đường dẫn/mã HTTP khi cần, không gửi HAR/Copy as cURL chưa loại thông tin phiên.

## 2 Tạo bộ dữ liệu mẫu qua giao diện

Thực hiện bằng owner O; đây cũng là các ca thêm mới. Nếu trùng mã từ lần trước, dùng hậu tố `-02` cho toàn bộ bộ test, không ghi đè dữ liệu cũ.

1. `/admin/categories`: tạo mã `iphone`, tên `iPhone` nếu chưa có; nếu có thì dùng danh mục hiện hữu. Tạo thêm `test-tay-empty`, tên `TEST-TAY Danh mục rỗng` để thử xóa sau này. Mã chữ thường, không dấu, có thể dùng gạch nối.
2. `/admin/users`: tạo editor `test-tay-editor@example.test`, tên `TEST-TAY Editor`, role Biên tập viên. Chọn mật khẩu thử 12–128 ký tự và giữ riêng. Không dùng mật khẩu owner thật. Tạo thêm tài khoản `test-tay-spare@example.test` để thử đổi quyền/khóa nếu cần.
3. Profile A/B vào `/register`: tạo `test-tay-a@example.test` và `test-tay-b@example.test`, tên tương ứng, SĐT minh họa `0901234567`, mật khẩu thử riêng. Đây là địa chỉ `.test`, không nhận email thật. Sau đăng ký phải tự đăng nhập.
4. `/admin/products/new`: nhập sản phẩm mẫu theo bảng dưới. Form có sẵn 1 cấu hình, 1 màu, 1 SKU; không thêm dư rồi bỏ trống trường required.

| Trường | Giá trị mẫu |
| --- | --- |
| Tên | `TEST-TAY iPhone A` |
| Đường dẫn | `test-tay-iphone-a` |
| Danh mục | iPhone |
| Dòng giới thiệu | Sản phẩm minh họa để kiểm thử |
| Ảnh đại diện, bộ ảnh và ảnh màu | `/images/placeholder.svg` để thử chức năng; sau đó thay bằng ảnh tải lên ở mục 4 |
| Mô tả | Dữ liệu kiểm thử, không phải thông tin thương mại |
| Cấu hình 1 — Dung lượng | `128GB` |
| Màu 1 | Đen, mã `#000000` |
| SKU 1 | `TEST-TAY-A-128-BLACK`, giá bán `10000000`, giá gốc `12000000`, tồn `5` |
| Hiển thị để bán | Bật để xuất hiện ngoài cửa hàng; mặc định sản phẩm mới đang ẩn |

5. Lưu. Mở lại sản phẩm, thêm màu Trắng `#ffffff` và SKU `TEST-TAY-A-128-WHITE`, chọn 128GB + Trắng, giá bán/gốc `12000000`, tồn `0`. Chú ý chọn đúng màu cho SKU mới, tránh trùng cặp Đen/128GB.
6. Thêm cấu hình 256GB và SKU `TEST-TAY-A-256-BLACK`, màu Đen, giá bán/gốc `11000000`, tồn `2`. Không tạo SKU 256GB/Trắng để thử tổ hợp chưa tồn tại.
7. Tạo sản phẩm thứ hai `TEST-TAY iPhone B`, slug `test-tay-iphone-b`, SKU `TEST-TAY-B`, giá bán/gốc `20000000`, tồn `5`, ảnh/màu/cấu hình hợp lệ, bật bán. Sản phẩm này giúp kiểm tra tìm/lọc/sort theo giá.

Ảnh placeholder chỉ để kiểm thử, không đủ làm dữ liệu trình diễn cuối kỳ. Tồn trong bảng là mốc **trước đơn đầu tiên**; sau mỗi ca tạo đơn phải ghi lại tồn và đặt mốc mới.

## 3 Danh mục và sản phẩm quản trị

| Mã | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| CAT01 | Tạo `test-tay-empty`, reload danh sách | Danh mục tồn tại sau reload; có tên/mã đúng |
| CAT02 | Tạo lại cùng mã hoặc tên đã dùng | Báo trùng, không xuất hiện bản ghi thứ hai |
| CAT03 | Sửa tên danh mục rỗng, lưu và reload | Tên mới lưu thật; mã không tự thay đổi |
| CAT04 | Tìm mã/tên, đổi sắp xếp A→Z/Z→A; lọc có/chưa có sản phẩm | Danh sách đúng điều kiện; sản phẩm đã ẩn vẫn được tính là có sản phẩm |
| CAT05 | Chưa tick xác nhận xóa danh mục rỗng rồi thử; sau đó tick và xóa | Chưa xác nhận không xóa; xác nhận thì xóa được |
| CAT06 | Thử xóa iPhone đang chứa A/B | UI không cho xóa hoặc báo đang có sản phẩm; sản phẩm vẫn còn |
| PR01 | Tạo A/B theo mục 2 rồi reload editor và tìm ngoài `/search` | Toàn bộ dữ liệu lưu, sản phẩm active tìm thấy |
| PR02 | Sửa tagline/mô tả/giá A, lưu; tải lại trang chi tiết khách | Khách thấy dữ liệu mới. Trả giá A về 10 triệu trước các ca tiền mẫu |
| PR03 | Thử slug trùng B, giá âm, giá gốc thấp hơn giá bán, tồn âm, SKU trùng/cặp cấu hình-màu trùng | Form hoặc server từ chối; không lưu trạng thái lỗi. Ghi rõ lỗi UI hay HTTP422/409 |
| PR04 | Bỏ tick bán của B, lưu; mở B ở cửa sổ khách | B biến mất khỏi catalog hoặc chi tiết báo không tìm thấy; admin lọc Đã ẩn vẫn thấy. Bật lại sau test |
| PR05 | Thêm cấu hình/màu/SKU mới rồi reload | Dữ liệu mới có thật; mã/cặp SKU đã lưu không sửa/xóa tùy tiện |
| PR06 | Sửa nội dung nhưng chưa lưu, thử reload/đóng trang | Có cảnh báo thay đổi chưa lưu; chọn ở lại để giữ bản nháp. Không mong đợi tự khôi phục draft sau khi đóng |
| PR07 | Hai tab editor sản phẩm cùng tải phiên bản cũ; tab1 đổi tên/lưu; tab2 đổi mô tả/lưu | Nếu tab2 còn revision cũ: báo xung đột, không ghi đè tên mới. “Kiểm tra bản máy chủ” rồi “Bỏ thay đổi, dùng bản máy chủ” tải đúng bản mới |
| PR08 | Sau khi có đơn giữ 1 SKU, thử nhập tồn thấp hơn số đang giữ | Bị chặn; không có khả dụng âm. Không tăng/giảm tồn thật để che lỗi |

PR07 nếu tab đã tự tải dữ liệu mới thì chưa thử được stale; ghi CHƯA TEST ca stale, không coi một lần lưu bình thường là bằng chứng.

## 4 Upload ảnh

Tại editor sản phẩm có khối **Tải ảnh sản phẩm**. Dùng ảnh thử không có dữ liệu cá nhân.

| Mã | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| IMG01 | Chọn PNG/JPEG/WebP nhỏ hơn 5 MB, không quá 16 megapixel; tải lên | Có preview và đường dẫn `/api/v1/media/...`; mở đường dẫn ảnh được |
| IMG02 | Copy đường dẫn vào ảnh đại diện/ảnh màu/bộ ảnh, lưu sản phẩm, reload ngoài cửa hàng | Ảnh thực tế hiển thị; upload không tự gắn mọi ô ảnh |
| IMG03 | Thử SVG, file văn bản hoặc ảnh quá 5 MB | Bị từ chối; không báo tải thành công giả. Nếu bộ chọn không cho chọn thì ghi kiểm tra UI đạt, chưa kết luận validation server |
| IMG04 | Tải ảnh bằng editor E | Được phép; khách/guest không có quyền upload admin |

Ảnh chuẩn hóa thành WebP trên server, URL công khai. Không upload ảnh bí mật để kiểm tra quyền riêng tư.

## 5 Cửa hàng và chi tiết sản phẩm

| Mã | Thao tác trên profile G | Kết quả mong đợi |
| --- | --- | --- |
| SHOP01 | Mở `/`, `/iphone`, `/search` | Trang tải bình thường, danh mục/sản phẩm từ API; chỉ thấy sản phẩm active |
| SHOP02 | Tìm `TEST-TAY iPhone A`, rồi một từ không tồn tại | Tìm đúng A; từ lạ có trạng thái rỗng, không tự hiện mock |
| SHOP03 | Lọc dưới 15 triệu và 15–25 triệu với A/B | A thuộc dưới15, B thuộc15–25 theo giá đại diện; đổi sort giá tăng/giảm và đối chiếu các thẻ |
| SHOP04 | Đổi bộ lọc, reload, Back/Forward | Lựa chọn đi cùng URL; danh sách khớp bộ lọc; đổi bộ lọc về trang đầu |
| SHOP05 | Mở `/product/test-tay-iphone-a` | Tên/ảnh/mô tả/giá đúng; giá bán10 triệu, giá gốc12 triệu cho SKU Đen128 |
| SHOP06 | Chọn Đen128, Đen256, Trắng128 | Giá/khả dụng theo đúng SKU:10 triệu còn5 ban đầu;11 triệu còn2;12 triệu hết hàng |
| SHOP07 | Thử Trắng256 chưa có SKU | Không mua được tổ hợp chưa khả dụng; không tự lấy giá/tồn của Đen256 |
| SHOP08 | Mở đường dẫn sản phẩm không tồn tại | Có trạng thái không tìm thấy, không báo mua thành công |

Catalog phân trang6 sản phẩm. Để kiểm tra trang2 cần tối thiểu7 sản phẩm active phù hợp bộ lọc; A/B chưa đủ. Có thể tạo thêm5 sản phẩm test đơn giản qua UI, mã khác nhau. Kiểm tra không lặp/mất sản phẩm, bộ lọc giữ khi chuyển trang; nếu chưa tạo đủ thì ghi BLOCKED ca phân trang.

## 6 Giỏ hàng và báo giá

Trước ca tiền mẫu, A Đen128 phải ở giá10 triệu và còn hàng; xóa những dòng test cũ khỏi giỏ.

| Mã | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| CART01 | Thêm Đen128 hai lần | Một dòng cùng SKU, số lượng2; không gộp Đen256 vào dòng đó |
| CART02 | Reload `/cart`, sửa số lượng, xóa một dòng | Giỏ còn sau reload trong cùng profile; số tiền cập nhật; xóa hết có trạng thái giỏ rỗng |
| CART03 | Thử số lượng0, âm, thập phân hoặc quá hàng khả dụng | Không tạo báo giá/đơn hợp lệ với số lượng sai; có chặn hoặc hướng dẫn điều chỉnh |
| CART04 | Giỏ1 ×10 triệu, giao tiêu chuẩn | Tiền hàng10.000.000 + ship50.000 = **10.050.000đ** |
| CART05 | Giỏ2 ×10 triệu, giao tiêu chuẩn | Tổng **20.000.000đ**, ship0 vì trên10 triệu |
| CART06 | Giỏ1 ×11 triệu, giao tiêu chuẩn; rồi giao nhanh | Tiêu chuẩn **11.000.000đ**; nhanh **11.050.000đ** |
| CART07 | G giữ giỏ A giá10 triệu; O đổi giá9 triệu; G bấm “Cập nhật báo giá” | Giá mới9 triệu, tổng tiêu chuẩn9.050.000; có thông tin cập nhật, không giữ giá cũ như giá có hiệu lực |
| CART08 | Khi giỏ đang có2 chiếc, người khác giữ hàng khiến chỉ còn1; cập nhật báo giá | Báo thiếu khả dụng, không cho đặt lượng thiếu; không tự xóa món khỏi giỏ |

Giá gốc12 triệu không bị trừ thêm lần nữa: tổng dùng giá bán. Sau CART07 đưa giá về10 triệu; tải lại báo giá trước các ca sau.

## 7 Checkout khách vãng lai và bảo vệ đơn

Thông tin mẫu: tên `TEST-TAY Khách vãng lai`, SĐT `0901234567`, tỉnh `TP Hồ Chí Minh`, phường `Phường thử nghiệm`, địa chỉ `123 Đường kiểm thử`, ghi chú `TEST-TAY, không giao hàng thực tế`. Không gửi cho đơn vị vận chuyển.

| Mã | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| CK01 | Chưa đăng nhập khách, mua1 Đen128; bỏ trống email, điền tên/SĐT/địa chỉ đầy đủ, đặt COD | Tạo đúng một đơn; tổng10.050.000 khi giá10 triệu/giao tiêu chuẩn; trạng thái Chờ xác nhận/Chưa thanh toán |
| CK02 | Thử bỏ tên/địa chỉ, SĐT sai hoặc email sai định dạng | Chặn và chỉ ra lỗi; không có đơn mới. Email để trống hợp lệ |
| CK03 | Sau đặt thành công, reload trang xác nhận cùng tab rồi xem giỏ | Đơn đọc lại từ server; giỏ đã đặt được xóa sau thành công; mã đơn không đổi |
| CK04 | Copy URL đơn guest sang profile B chưa có receipt | Không đọc được đơn chỉ bằng URL;404/không tìm thấy là đúng. Không copy receipt/token |
| CK05 | G mở checkout giá10 triệu; O đổi giá9 triệu; G đặt với báo giá cũ | Yêu cầu xem lại giá/tổng, chưa tạo đơn ở lần xung đột; lần xác nhận tiếp theo mới tạo với giá đã đồng ý |
| CK06 | Hai profile cùng chuẩn bị mua chiếc cuối; gửi lần lượt sát nhau | Chỉ lượng còn hợp lệ được đặt, người còn lại thấy hết hàng/xung đột; tổng giữ không vượt tồn. Dùng SKU test riêng tồn1 để không phá các mốc A |
| CK07 | Bấm đặt liên tiếp nhanh trên cùng form | Không tạo hai đơn cho cùng yêu cầu đang gửi; kiểm tra danh sách admin, không chỉ dựa vào nút bị disabled |

Đơn guest cần receipt trong sessionStorage của tab. Đóng tab/xóa storage có thể mất khả năng xem lại; hiện chưa có email/OTP khôi phục. Đây là giới hạn đã ghi nhận, không test bằng cách xóa toàn bộ storage của phiên owner.

## 8 Luồng COD chuẩn và đối chiếu tồn kho

Làm CK01 đúng1 đơn Đen128 số lượng1, không đồng thời tạo đơn khác trên SKU này. Owner/editor mở `/admin/orders`, tìm mã vừa tạo. Ở mỗi bước: chọn **Thao tác**, nhập **Ghi chú xử lý**, tick xác nhận rồi **Lưu thao tác**. Reload editor sản phẩm để đọc tồn mới.

| Mã/bước | Thao tác | Tồn kho tổng / đang giữ / khả dụng khi bắt đầu từ5 | Đơn/thanh toán |
| --- | --- | --- | --- |
| ORD01 | Khách vừa đặt1 chiếc | 5 / 1 / 4 | Chờ xác nhận / Chưa thanh toán |
| ORD02 | Xác nhận và chuẩn bị hàng | 5 / 1 / 4 | Đang chuẩn bị / Chưa thanh toán |
| ORD03 | Bàn giao vận chuyển | 4 / 0 / 4 | Đang giao / Chưa thanh toán |
| ORD04 | Xác nhận đã giao | 4 / 0 / 4 | Đã giao / Chưa thanh toán |
| ORD05 | Ghi nhận đã thu tiền COD | 4 / 0 / 4 | Đã giao / Đã thanh toán |
| ORD06 | Hoàn thành đơn | 4 / 0 / 4 | Hoàn thành / Đã thanh toán |

ORD07: thử hoàn thành trước thu tiền, thu tiền trước giao, hủy sau SHIPPED, hoặc đi ngược trạng thái. UI không cung cấp thao tác sai; không được ghi thành công. Không có chuyển tiền thật khi bấm ghi nhận COD.

ORD08: kiểm tra lịch sử sau mỗi bước: có tác nhân, thời gian, trạng thái/ghi chú; snapshot hàng/giá/người nhận giữ nguyên khi sửa sản phẩm sau đó. Thử thiếu ghi chú hoặc chưa tick xác nhận: không lưu.

ORD09: tạo một đơn test khác đang PENDING hoặc PROCESSING chưa trả tiền rồi admin hủy. Tồn tổng không giảm, đang giữ giảm đúng lượng hủy; khả dụng trở lại. Reload không giải phóng lần thứ hai. Ghi số trước/sau vì mốc ban đầu có thể không còn5.

ORD10: các trang đơn có refresh khi focus. Muốn thử xung đột hai người xử lý, cả hai cần cùng phiên bản cũ; nếu chuyển tab đã tự refresh thì ca đó chưa chứng minh stale. Không can thiệp DB để ép kết quả; ca cạnh tranh transaction/stale chính xác còn được kiểm chứng bằng test tự động.

## 9 Tài khoản khách và quyền sở hữu đơn

| Mã | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| ACC01 | Đăng ký A/B, thử email trùng, mật khẩu dưới12 ký tự, SĐT sai | Hợp lệ tạo được; dữ liệu sai/trùng bị từ chối; đăng ký không tự đồng nghĩa đã login |
| ACC02 | Đăng nhập A, mở `/account`, reload | Hiện tên/email A, có đổi mật khẩu và liên kết đơn; phiên vẫn hợp lệ |
| ACC03 | A đặt đơn khi đã login, mở `/account/orders` và chi tiết | Đơn gắn đúng A; admin tra khách A cũng thấy đơn này |
| ACC04 | B mở URL chi tiết đơn của A | Không đọc được, thường404. B không có nút hủy đơn A |
| ACC05 | Đặt guest bằng email giống A, sau đó login A | Không tự nhận đơn guest vào lịch sử tài khoản chỉ vì trùng email |
| ACC06 | A hủy đơn PENDING chưa trả tiền, ghi lý do và xác nhận | Đơn hủy, tồn giữ được trả một lần. Với PROCESSING/SHIPPED không có thao tác hủy phía khách theo chính sách hiện tại |
| ACC07 | A đổi mật khẩu: thử sai mật khẩu cũ/xác nhận không khớp, rồi nhập đúng | Lỗi bị chặn; thành công phải login lại, mật khẩu cũ không đăng nhập được; tab khác cùng A bị thu hồi phiên khi kiểm tra lại |
| ACC08 | Logout A, reload và mở lại URL lịch sử | Chuyển về login/401, không còn dữ liệu đơn được phép đọc. Back của trình duyệt không cấp lại quyền |

Không đổi mật khẩu owner thật trong vòng test này. Profile hiện mới hiển thị tên/email và các lối đi chức năng; chưa có sửa tên/SĐT/địa chỉ cá nhân. Khách hủy chỉ PENDING là hành vi hiện tại, phạm vi “chưa giao” rộng hơn trong PDF còn cần chốt ở R2.

## 10 Quản trị khách hàng, tài khoản admin và phân quyền

| Mã | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| USR01 | O/E mở `/admin/customers`, tìm tên/email/SĐT A, mở hồ sơ | Có thông tin và chỉ các đơn gắn bằng customer_id; không gộp guest theo email |
| USR02 | Lọc khách có/không có đơn, đổi thứ tự | A đã đặt thuộc nhóm có đơn; B chưa đặt thuộc nhóm không có. Đơn đã hủy vẫn là đã từng đặt |
| USR03 | Tìm nút sửa/khóa khách | Hiện không có: khách chỉ xem. Ghi CHƯA TRIỂN KHAI nếu theo lưu ý giảng viên yêu cầu thêm, không coi là lỗi của chức năng đã có |
| ADM01 | O tạo editor, thử email trùng/mật khẩu ngắn, reload | Tạo hợp lệ lưu thật; lỗi bị chặn; mật khẩu nhập được xóa khỏi form sau gửi |
| ADM02 | E mở `/admin/users` bằng URL trực tiếp | Báo chỉ owner có quyền, API403; ẩn menu không phải bằng chứng duy nhất |
| ADM03 | O sửa tên editor; E reload hồ sơ | Tên mới đúng; đổi tên không bắt buộc logout |
| ADM04 | O đổi role tài khoản spare, tick xác nhận | Role mới lưu; phiên cũ của spare bị thu hồi; login lại thấy quyền mới. Đổi về editor khi xong |
| ADM05 | E đang login; O khóa E; E reload trang/API hoặc login lại | Phiên cũ bị từ chối, login thất bại. O mở khóa: phải login mới, phiên cũ không được phục hồi |
| ADM06 | O nhìn các điều khiển trên chính tài khoản O | Không tự khóa/hạ quyền; không có reset password của chính mình ở danh sách |
| ADM07 | Hai tab `/admin/users` cùng bản cũ; tab1 đổi tên editor; tab2 sửa/lưu | Tab2 báo stale, cần tải lại; tên đã lưu không bị ghi đè |
| ADM08 | O mở “Đặt lại mật khẩu” của E, nhập mật khẩu mới nhưng chưa xác nhận | Nút xác nhận chưa cho gửi; tick xác nhận rồi gửi mới được |
| ADM09 | Sau reset E, kiểm tra E đang login, login mật khẩu cũ/mới | Mọi phiên E cũ bị thu hồi; cũ thất bại, mới thành công; form mật khẩu đã rỗng |
| ADM10 | Reset tài khoản spare đang khóa | Vẫn khóa, dù có mật khẩu mới cũng không login được cho tới khi mở khóa |

Ma trận quyền đối chiếu nhanh:

| Hành động | Guest | Khách | Editor | Owner |
| --- | --- | --- | --- | --- |
| Xem hàng/đặt guest | Có | Có luồng đặt bằng tài khoản | Có thể dùng cửa hàng; phiên admin không biến thành phiên khách | Tương tự editor |
| Đọc/hủy đơn tài khoản | Không | Chỉ đơn mình, theo trạng thái cho phép | Không có quyền khách chỉ từ phiên admin | Tương tự editor |
| Catalog admin/upload/xử lý đơn/báo cáo/xem khách | Không | Không | Có | Có |
| Quản trị admin, reset mật khẩu admin khác | Không | Không | Không | Có, kèm các ràng buộc bảo vệ |

Kiểm tra bằng profile độc lập không chứa cookie admin khác. Không kết luận lỗi quyền nếu profile “khách” vẫn đang có phiên owner.

## 11 Doanh thu, tìm kiếm, phân trang

**Báo cáo:** mở `/admin/reports` bằng O/E, ghi tổng/số đơn ban đầu và chọn ngày Việt Nam bao gồm thời điểm ORD06 hoàn thành.

| Mã | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| REP01 | So sánh trước và sau ORD06 với đơn10.050.000đ | Doanh thu tăng đúng10.050.000 và số đơn tăng1; gồm50.000 phí giao |
| REP02 | Xem khi đơn chỉ DELIVERED/PAID nhưng chưa COMPLETED; hoặc đơn hủy | Chưa tăng doanh thu từ những đơn này |
| REP03 | Chỉ một đơn hoàn thành trong kỳ | Tổng10.050.000, số đơn1, trung bình10.050.000. Nếu còn đơn khác, tính theo tổng tất cả đơn đủ điều kiện |
| REP04 | Đổi nhóm ngày/tuần/tháng cùng khoảng ngày | Tổng và số đơn không đổi; tuần bắt đầu thứ Hai, dùng ngày hoàn thành theo giờ Việt Nam |
| REP05 | Khoảng rỗng, từ>sau ngày đến, khoảng hơn367 ngày | Rỗng trả0; khoảng sai bị từ chối; không giữ số cũ dưới bộ lọc mới |
| REP06 | Chọn khoảng hơn12 ngày, chuyển trang bảng kỳ | Chỉ đổi các dòng kỳ; tổng toàn khoảng không đổi |
| REP07 | Guest/khách mở báo cáo trực tiếp | Không đọc được số liệu admin |

Không gọi đây là lợi nhuận, không lấy tổng mọi đơn đặt làm doanh thu. Chưa có UI trả hàng/hoàn tiền để tự diễn tập luồng đó.

**Kiểm tra chung danh sách:** catalog6 dòng/trang; các danh sách admin và đơn khách20 dòng/trang. Muốn test trang2 phải có nhiều hơn pageSize **sau khi lọc**. Không cần tạo21 tài khoản thật; dùng tài khoản test và phân biệt test UI với test phân trang SQL đã có tự động.

| Danh sách | Tìm/lọc/sort cần thử |
| --- | --- |
| Sản phẩm admin | Tên/slug; đang bán/đã ẩn; mới/cũ, tên A→Z/Z→A |
| Danh mục | Mã/tên; có/chưa có sản phẩm; tên A→Z/Z→A |
| Khách hàng | Tên/email/SĐT; có/chưa đặt; mới/cũ/tên |
| Admin | Tên/email; owner/editor; hoạt động/khóa; mới/cũ/tên |
| Đơn admin/khách | Mã/người nhận/SĐT; trạng thái; mới/cũ/tổng tiền tăng/giảm |

LIST01: tìm vô nghĩa phải rỗng; LIST02: filter + sort kết hợp rồi reload giữ đúng; LIST03: đang trang2 đổi filter về trang1; LIST04: URL page rất lớn được kẹp hợp lệ hoặc báo lỗi cho giá trị ngoài giới hạn, không500. Bảng đơn lồng trong hồ sơ khách chưa có đầy đủ tìm/sort/filter; ghi giới hạn R2, không tự đánh PASS toàn bộ yêu cầu “mọi danh sách”.

## 12 Mạng lỗi, nhiều tab, giao diện và khôi phục

| Mã | Cách thử | Mong đợi và giới hạn |
| --- | --- | --- |
| ERR01 | F12 Network → Offline ở profile khách, rồi refresh catalog | Có lỗi/retry, không chuyển sang sản phẩm mock. Trả Online và retry phục hồi |
| ERR02 | Mở checkout Online đầy đủ rồi chuyển Offline trước khi gửi | Không báo thành công giả, giỏ không bị xóa; nếu hiện yêu cầu đang chờ, giữ tab/payload, Online và “Kiểm tra lại yêu cầu đang chờ” |
| ERR03 | Trong cùng tab retry yêu cầu chưa rõ kết quả, đối chiếu admin | Một yêu cầu chỉ có một đơn. Offline trước gửi chưa chứng minh trường hợp server đã commit nhưng mất response; ca đó đã có automated E2E, không tự ghi PASS nếu chưa mô phỏng đúng |
| ERR04 | O/E logout hoặc bị khóa ở tab khác; quay lại tab cũ/reload | Server từ chối phiên cũ, về login/403 phù hợp, không lưu tiếp mutation |
| UI01 | F12 Device Toolbar, viewport390px rồi desktop1365px | Không tràn ngang; nút/input đọc được; bảng cuộn trong vùng nếu cần. Thử menu/filter, giỏ, checkout, editor, đơn, reports, reset password |
| UI02 | Tab/Shift+Tab, Enter/Space trên các điều khiển; zoom200% | Focus thấy được, thao tác không phụ thuộc chuột, nội dung không che nút quan trọng; ghi lỗi thực tế nếu có |
| UI03 | Reload deep link sản phẩm/admin/đơn; URL không có thật | Route hợp lệ mở lại; URL404 có hướng quay về. Một số wildcard account/admin có thể vào màn tài khoản, ghi lại để rà route, không giả định mọi URL lạ đều404 |
| UI04 | Xem tên/giá/SĐT/địa chỉ/ảnh và trạng thái tải | Không cắt thông tin quan trọng, không NaN/undefined, không có lỗi JS không bắt được |
| UI05 | Bấm logo, các danh mục, ô tìm kiếm/Enter, biểu tượng giỏ và tài khoản; thử menu ở mobile | Điều hướng đúng; menu mở/đóng được và không che vĩnh viễn nội dung. Link đang xem có phản hồi rõ |
| UI06 | Trên chi tiết sản phẩm có nhiều ảnh, chọn từng ảnh thumbnail; mở các phần thông tin được cung cấp | Ảnh lớn đổi đúng, mô tả/thông số đọc được và không mất cấu hình mua hàng đã chọn |
| UI07 | Mở “Xem ảnh lớn”, “Xem cấu hình chi tiết” và menu mobile; thử Tab, Escape và nút đóng | Nội dung đọc được, focus không chạy ra sau dialog khi đang mở; đóng trả focus về nút đã mở, trang cuộn lại bình thường |

Ca hết hạn giữ hàng: code hiện giữ **24 giờ**, worker kiểm tra khoảng mỗi phút khi server chạy. Không chờ15 phút rồi kết luận lỗi. Có thể ghi lại một đơn PENDING test, kiểm tra lại sau24 giờ và worker chạy; tồn được trả một lần. Không chỉnh đồng hồ hệ thống hoặc sửa SQL thật để ép hết hạn.

Ca persistence: sau khi chắc chắn không có thao tác đang gửi, có thể restart riêng app từ Docker Desktop rồi reload và login lại nếu cần. Đơn/sản phẩm đã lưu còn nguyên, không sinh bản sao. Backup/restore database không thuộc ca click UI; dùng [runbook recovery](BACKEND_B5_RECOVERY.md), không bấm xóa volume/reset factory.

Nếu thử đăng nhập/đăng ký liên tục gặp429, dừng một phút rồi thử lại; limiter auth hiện giới hạn20 mutation/phút theo IP, upload10 ảnh/phút theo admin. Không dùng thao tác spam để vượt limiter; ghi riêng kết quả giới hạn tốc độ, không nhầm với mật khẩu sai.

## 13 Kết thúc vòng test và phân loại lỗi

1. Bật lại Online, tắt request blocking nếu từng dùng; đóng DevTools chứa thông tin phiên.
2. Ghi mã đơn, chênh lệch tồn/doanh thu, trạng thái từng ca. Hủy các đơn thử còn được phép hủy để trả tồn; đơn đã giao/hoàn thành giữ làm lịch sử, không xóa SQL thủ công.
3. Ẩn sản phẩm thử, khóa admin thử khi hết nhu cầu. Danh mục có sản phẩm đã ẩn vẫn không xóa được; điều này là đúng. Không khóa owner thật.
4. Thay mật khẩu thử nếu tiếp tục giữ tài khoản; không đưa các mẫu password test vào tài khoản dùng thật.
5. Mỗi lỗi gửi theo mẫu: mã ca; vai trò/profile; URL; bước tái hiện; dữ liệu/mã đơn không nhạy cảm; mong đợi/thực tế; ảnh; HTTP status và error.code nếu có. Không gửi password/cookie/receipt.

Ưu tiên xử lý: **P0** lộ dữ liệu người khác, vượt quyền, bán vượt tồn, tạo trùng đơn; **P1** không mua/xử lý đơn được hoặc sai tiền/tồn/doanh thu; **P2** lỗi filter/validation/trạng thái khôi phục; **P3** bố cục/nội dung. Dừng thao tác liên quan khi gặp P0/P1 để giữ bằng chứng, không tiếp tục “sửa dữ liệu bằng tay” làm mất nguyên nhân.

## 14 Những mục chưa có để tránh test nhầm

Theo [kế hoạch R1–R6](REMAINING_WORK_PLAN.md): trang đội ngũ/liên hệ, profile đầy đủ hoặc sửa profile, sửa/khóa khách hàng, CRUD role động, hard-delete sản phẩm/admin, Google OAuth, email, thanh toán online/Premium, hosting HTTPS thực tế chưa được coi là đã triển khai. Không ghi chúng là PASS; đánh dấu CHƯA TRIỂN KHAI/CẦN CHỐT. Local HTTP không có Secure cookie như staging HTTPS; không dùng tiêu chí cookie Secure của hosting để kết luận local sai.

Lần đầu nên đi theo thứ tự **1 → 2 → 3 → 4 → 5 → 6 → CK01 → 8 → 11**, rồi quay lại các ca lỗi, tài khoản và quyền ở7/9/10/12. Như vậy bro thấy trước một vòng mua hàng hoàn chỉnh và có số tiền/tồn cụ thể để so sánh.

## Chọn sản phẩm trong giỏ (13/11/2026)

Bản API/Docker cho phép tích chọn từng dòng hoặc Chọn tất cả. Báo giá, phí giao hàng và checkout chỉ tính các dòng đã chọn. Bỏ chọn hết sẽ khóa nút đặt hàng. Lựa chọn được giữ trong cùng tab khi reload hoặc qua đăng nhập. Đặt hàng thành công chỉ trừ số lượng SKU đã mua; sản phẩm chưa chọn vẫn trong giỏ. Mua ngay chọn riêng cấu hình vừa thêm.

Kiểm tra: thêm hai cấu hình, bỏ chọn một, reload, đăng nhập và đặt hàng. Đơn chỉ chứa một SKU; quay lại giỏ vẫn còn cấu hình chưa chọn. Thử bỏ chọn tất cả, chọn lại tất cả và đổi số lượng để xác nhận tổng tiền cập nhật.

### Giao diện giỏ hàng có ảnh

Ảnh ưu tiên màu đã chọn, dự phòng ảnh chính sản phẩm. Tên/ảnh dẫn về chi tiết sản phẩm. Nút +/- điều chỉnh số lượng từ 1 đến 999; vẫn có thể nhập trực tiếp. Nút thùng rác xóa dòng. Bố cục danh sách và tóm tắt đơn hàng cạnh nhau trên desktop, xếp dọc trên mobile. Giá dòng chưa có báo giá mới được ghi chú để người dùng biết cần chọn mua xác nhận giá.

### Giao diện thanh toán

Trang checkout đồng bộ với giỏ hàng: ba khối thông tin người nhận, địa chỉ và giao hàng/thanh toán; thẻ chọn giao tiêu chuẩn/giao nhanh; tóm tắt có ảnh theo màu sản phẩm và số lượng. Email tài khoản chỉ đọc. Tổng tiền vẫn lấy từ API báo giá, không tính lại từ giá trong ảnh sản phẩm. Các trạng thái đang gửi/chờ kết quả/lỗi vẫn giữ cơ chế chống gửi trùng và phục hồi yêu cầu.

Luồng COD, xác nhận nhận hàng và tự xác nhận 7 ngày: xem [COD_RECEIPT_FLOW.md](COD_RECEIPT_FLOW.md).

Ví MoMo/ZaloPay và QR sandbox: xem [WALLET_PAYMENTS.md](WALLET_PAYMENTS.md). Chưa có merchant thì hai lựa chọn ví bị vô hiệu hóa; không xem đó là đã tích hợp giao dịch sandbox thật.
