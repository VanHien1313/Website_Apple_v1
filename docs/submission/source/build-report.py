from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT=Path.cwd()
OUT=ROOT/'docs/submission/Aura_Report.docx'
doc=Document()
sec=doc.sections[0]
sec.page_width=Cm(21);sec.page_height=Cm(29.7)
sec.top_margin=Cm(2);sec.bottom_margin=Cm(2);sec.left_margin=Cm(2.4);sec.right_margin=Cm(2)
sec.header_distance=Cm(.8);sec.footer_distance=Cm(.8)
for name,size in [('Normal',11.5),('Title',27),('Subtitle',14),('Heading 1',18),('Heading 2',13),('Caption',10)]:
    st=doc.styles[name];st.font.name='Arial';st.font.size=Pt(size);st.font.color.rgb=RGBColor(0,0,0)
    st._element.get_or_add_rPr().rFonts.set(qn('w:ascii'),'Arial');st._element.rPr.rFonts.set(qn('w:hAnsi'),'Arial')
    st.paragraph_format.space_after=Pt(8)
doc.styles['Normal'].paragraph_format.line_spacing=1.18
doc.styles['Heading 1'].paragraph_format.space_after=Pt(16)
doc.styles['Heading 2'].paragraph_format.space_before=Pt(12)
doc.core_properties.title='Báo cáo kỹ thuật website thương mại điện tử Aura'
doc.core_properties.author='Nguyễn Văn Hiền và Khuất Nguyễn Bảo Hiếu'
doc.core_properties.subject='Đồ án eCommerce dùng React Express và SQL Server'
head=sec.header.paragraphs[0];head.text='AURA   /   BÁO CÁO KỸ THUẬT';head.runs[0].font.size=Pt(9)
foot=sec.footer.paragraphs[0];foot.alignment=WD_ALIGN_PARAGRAPH.RIGHT
foot.add_run('Aura  •  ')
fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');foot._p.append(fld)
sec.different_first_page_header_footer=True
def p(text,style=None): return doc.add_paragraph(text,style)
def h(text):doc.add_heading(text,2)
def page(title):doc.add_page_break();doc.add_heading(title,1)
def table(headers,rows,widths=None):
    t=doc.add_table(rows=1,cols=len(headers));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
    for c,txt in zip(t.rows[0].cells,headers):c.text=txt
    for row in rows:
        for c,txt in zip(t.add_row().cells,row):c.text=str(txt)
    for ri,row in enumerate(t.rows):
        for ci,c in enumerate(row.cells):
            c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if widths:c.width=Cm(widths[ci])
            pr=c._tc.get_or_add_tcPr();b=OxmlElement('w:tcBorders')
            for edge in ['top','left','bottom','right']:
                el=OxmlElement('w:'+edge);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');b.append(el)
            pr.append(b);sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'153250' if ri==0 else ('F2F5F8' if ri%2==0 else 'FFFFFF'));pr.append(sh)
            margins=OxmlElement('w:tcMar')
            for edge in ['top','left','bottom','right']:
                el=OxmlElement('w:'+edge);el.set(qn('w:w'),'100');el.set(qn('w:type'),'dxa');margins.append(el)
            pr.append(margins)
            for par in c.paragraphs:
                par.paragraph_format.space_after=Pt(3);par.paragraph_format.space_before=Pt(3);par.paragraph_format.line_spacing=1.05
                for run in par.runs:
                    run.font.size=Pt(10.5);run.font.bold=ri==0;run.font.color.rgb=RGBColor(255,255,255) if ri==0 else RGBColor(0,0,0)
        if ri==0:
            repeat=OxmlElement('w:tblHeader');row._tr.get_or_add_trPr().append(repeat)
        cant=OxmlElement('w:cantSplit');row._tr.get_or_add_trPr().append(cant)
    p('')
def fig(file,caption,width=6.35):
    par=p('');par.paragraph_format.keep_with_next=True
    run=par.add_run();run.add_picture(str(ROOT/file),width=Inches(width))
    for element in run._r.xpath('.//wp:docPr'):element.set('descr',caption)
    p(caption,'Caption')

p('BÁO CÁO KỸ THUẬT', 'Subtitle')
p('Website thương mại điện tử Aura','Title')
p('Đề tài số 3  Website eCommerce','Subtitle')
p('')
p('Nguyễn Văn Hiền  —  N23DCAT023')
p('Khuất Nguyễn Bảo Hiếu  —  N23DCAT026')
p('Cả hai thành viên trực tiếp thiết kế và phát triển website.')
p('')
p('Bản nội dung kỹ thuật cập nhật ngày 10 tháng 11 năm 2026. Mốc source sử dụng: 5b25b40. Hạn hoàn tất nhóm xác nhận: 13 tháng 11 năm 2026.')
p('Tài liệu trình bày yêu cầu, kiến trúc, cơ sở dữ liệu, các quy tắc nghiệp vụ, bằng chứng kiểm thử và cách triển khai local của Aura. Các chức năng cốt lõi đã chạy với SQL Server; những nội dung chưa nghiệm thu được ghi riêng trong phần giới hạn.')
p('Thông tin học phần, lớp, giảng viên và quy cách bìa cần bổ sung theo mẫu chính thức của lớp trước khi nộp. Tài liệu không tự xác nhận đã hoàn thành hosting, test tay cuối hoặc yêu cầu bảo vệ cá nhân.')
p('Liên hệ nhóm  nguyenvanhien1313.tv@gmail.com')

page('1 Bài toán và phạm vi')
p('Aura phục vụ bài toán bán thiết bị Apple qua website: người mua tìm sản phẩm, chọn cấu hình và màu, đặt hàng COD; đội ngũ vận hành quản lý danh mục, tồn kho, đơn và báo cáo doanh thu. Đồ án kết nối frontend với API và SQL Server để dữ liệu giao dịch không chỉ tồn tại trong trình duyệt.')
h('Nguồn yêu cầu')
p('Nhóm đối chiếu đề tài eCommerce hai trang với tài liệu “Lưu ý khi làm đồ án môn học”. Yêu cầu chung của giảng viên được áp dụng theo ngữ cảnh cửa hàng. Các nội dung có khả năng mâu thuẫn, như sửa hoặc khóa khách hàng so với tra cứu chỉ đọc, được ghi để xác nhận thay vì tự coi đã đạt.')
h('Mục tiêu thực hiện')
p('Luồng mua hàng phải nhất quán từ báo giá đến tạo đơn và xuất kho. Backend phải kiểm tra lại giá, số lượng và quyền truy cập. Thông tin đơn đã đặt cần giữ nguyên dù catalog thay đổi. Các tác vụ đồng thời không được tạo trùng đơn, trừ tồn hai lần hoặc ghi đè dữ liệu mới bằng phiên bản cũ.')
h('Phạm vi hiện tại')
p('Ứng dụng có trang giới thiệu nhóm và liên hệ, catalog và tìm kiếm, giỏ hàng, checkout COD, tài khoản khách, đơn của khách, quản trị sản phẩm và danh mục, tài khoản admin, hồ sơ khách chỉ đọc, xử lý đơn và báo cáo. Docker local và môi trường demo riêng đã chạy. Cấu hình staging đã chuẩn bị nhưng chưa có máy chủ và tên miền để nghiệm thu hosting.')
p('Google/Facebook, email tự động, thanh toán online, hoàn tiền và CRUD vai trò động chưa triển khai. Trang liên hệ dùng email được phép công khai; liên kết mailto không được xem là hệ thống gửi mail tự động.')
h('Phân công')
table(['Thành viên','MSSV','Đóng góp đã xác nhận'],[['Nguyễn Văn Hiền','N23DCAT023','Thiết kế và phát triển website'],['Khuất Nguyễn Bảo Hiếu','N23DCAT026','Thiết kế và phát triển website']],[5.2,3.5,7.9])
p('Nhóm bổ sung phân công chi tiết theo module và minh chứng thực tế nếu giảng viên yêu cầu. Báo cáo không tự gán tỷ lệ đóng góp hoặc phần việc riêng cho từng thành viên.')

page('2 Tác nhân và yêu cầu chức năng')
table(['Tác nhân','Quyền chính'],[['Vãng lai','Xem catalog, giỏ và đặt COD; xem đơn bằng receipt trong phiên tab'],['Khách đăng nhập','Xem hồ sơ, đổi mật khẩu, đặt đơn gắn tài khoản, xem và hủy đơn PENDING của mình'],['Editor','Quản lý catalog, upload ảnh, xử lý đơn, tra cứu khách và xem báo cáo'],['Owner','Quyền editor và quản lý tài khoản admin, phân vai, khóa và reset mật khẩu người khác']],[4,12.6])
h('Điều hướng và xác thực')
p('Trang đăng nhập có lựa chọn Khách hàng và Quản trị viên. Khách có đăng ký, quản trị dùng tài khoản đã được cấp. Hai lựa chọn gọi hai luồng xác thực riêng; chọn tab quản trị không cấp quyền. Sau đăng nhập, khách vào tài khoản của mình và admin vào khu vực quản trị có sidebar hoặc drawer trên mobile.')
h('Điều kiện nghiệp vụ')
p('Mọi đơn phải có người nhận, số điện thoại và địa chỉ hợp lệ. SKU phải tồn tại và sản phẩm còn hiển thị. Báo giá chưa giữ hàng. Backend kiểm tra lại khi đặt. Chỉ tài khoản đang hoạt động và có phiên hợp lệ mới thực hiện được các thao tác quản trị.')
h('Tìm kiếm và phân trang')
p('Catalog hỗ trợ từ khóa, danh mục, dòng máy, khoảng giá và sắp xếp; UI hiển thị 6 sản phẩm mỗi trang. Danh sách sản phẩm, danh mục, khách, admin và đơn quản trị dùng phân trang 20 dòng, lọc và sắp xếp phía SQL. Đơn của khách luôn giới hạn theo chủ sở hữu. Bảng đơn lồng trong hồ sơ khách và báo cáo có cách lọc riêng, chưa coi là đã đáp ứng mọi phép lọc tổng quát.')
h('Tiêu chí chất lượng')
p('Ứng dụng cần xử lý trạng thái tải, dữ liệu trống, lỗi mạng và quyền bị từ chối; dùng được trên desktop/mobile và bàn phím. URL sai phải báo 404. API build không được quay về dữ liệu mock khi backend lỗi. Các thao tác nhạy cảm cần xác nhận và phản hồi rõ khi dữ liệu đã thay đổi.')

page('3 Kiến trúc hệ thống')
fig(Path('logs/submission/slides/slide-04.png'),'Hình 1  Kiến trúc ứng dụng ở môi trường local')
h('Frontend')
p('React 19, TypeScript và Vite tổ chức trang, component, hook và service. Route API tách khỏi route demo. useAsyncResource quản lý tải, lỗi và hủy request cũ. Giỏ lưu trạng thái mua hàng trên trình duyệt nhưng giá và tồn kho chính thức được lấy lại từ backend.')
h('Backend và database')
p('Express cung cấp API cùng origin với frontend build. Các module xác thực, catalog, checkout, vận hành đơn, báo cáo và ảnh dùng kết nối SQL Server. Query nhận tham số thay vì ghép trực tiếp input người dùng thành SQL. Luồng ghi quan trọng dùng transaction, khóa và revision.')
h('Đóng gói và vận hành')
p('Dockerfile build frontend/API rồi chạy bằng user node. Compose có SQL Server, tác vụ init và ứng dụng. Runtime database sử dụng login hạn chế quyền, không chạy với sa. Worker kiểm tra đơn chờ hết hạn giữ hàng. Chuyển sang production cần HTTPS, database TLS xác thực, secret trên host và nghiệm thu mạng thật.')

page('4 Thiết kế dữ liệu')
fig(Path('logs/submission/slides/slide-05.png'),'Hình 2  Quan hệ dữ liệu chính được rút gọn từ migrations')
table(['Nhóm bảng','Mục đích'],[['categories, products, variants, colors, inventory_skus','Danh mục, nội dung sản phẩm, cấu hình, màu và tồn SKU'],['customers, admin_users, sessions','Danh tính khách/admin và phiên đăng nhập'],['orders, order_items, reservations','Snapshot đơn và số lượng giữ theo SKU'],['payments, order_events, idempotency_requests','Ghi nhận COD, lịch sử xử lý và chống tạo trùng'],['media_images','Lưu ảnh WebP và người tải lên']],[8.1,8.5])
p('Schema thực tế còn schema_migrations; riêng database demo có marker aura_demo_dataset. Sơ đồ trên chỉ mô tả quan hệ chính, không thay thế toàn bộ danh sách FK. order_items.product_id và variant_id là giá trị snapshot, không phải khóa ngoại trong schema hiện tại. Các cột nullable cho phép đơn vãng lai không có customer_id.')

page('5 Ràng buộc và tính nhất quán')
h('Sản phẩm và SKU')
p('Một SKU kết hợp một cấu hình và một màu của cùng sản phẩm. Khóa ngoại ghép kiểm tra sự thuộc về product. Slug sản phẩm và mã SKU có tính duy nhất; SKU chuẩn hóa chữ thường để kiểm tra trùng. Giá là số nguyên VND trong giới hạn số nguyên an toàn của JavaScript, giá gốc không thấp hơn giá bán.')
p('Tồn khả dụng bằng on_hand trừ reserved. Các ràng buộc kiểm tra tồn không âm và reserved không vượt on_hand. Sửa catalog không được hạ tồn thấp hơn số lượng đã giữ. Các luồng ghi khóa SKU theo thứ tự ổn định nhằm giảm xung đột.')
h('Đơn và lịch sử')
p('Đơn giữ snapshot người nhận, địa chỉ, sản phẩm và giá. Tổng đơn bằng subtotal cộng phí giao hàng. Khoản chênh giữa giá gốc và giá bán chỉ dùng trình bày tiết kiệm, không trừ lần hai. order_events chỉ được thêm; trigger từ chối sửa/xóa lịch sử. Giao dịch trạng thái, payment, tồn kho và lịch sử phải cùng commit hoặc rollback.')
h('Phiên bản dữ liệu')
p('Categories, products và admin_users có rowversion. Đơn và SKU dùng revision. Client gửi phiên bản đã đọc; backend từ chối bản cũ bằng phản hồi xung đột. UI yêu cầu tải lại hoặc kiểm tra bản máy chủ thay vì tự ghi đè. Migrations đã áp dụng được kiểm tra checksum và không sửa nội dung để tránh lệch schema giữa môi trường.')
h('Tài khoản')
p('Một session tham chiếu đúng một customer hoặc admin. Backend lưu token hash và credential_version. Đổi mật khẩu hoặc thay đổi quyền/trạng thái phù hợp sẽ thu hồi phiên. Tách dữ liệu khách và admin giúp giữ rõ phạm vi đăng ký công khai với tài khoản vận hành được cấp.')
table(['Quy tắc','Kết quả mong đợi'],[['Hai lần gửi cùng idempotency key và nội dung','Cùng một đơn, không tăng giữ hàng lần hai'],['Hai mutation cùng revision','Chỉ một thay đổi thành công'],['Một bước transaction thất bại','Toàn bộ thay đổi nghiệp vụ rollback'],['Giá frontend khác giá SQL','Không tạo đơn theo giá bị sửa']],[8.3,8.3])

page('6 Luồng đặt hàng COD')
table(['Bước','Xử lý'],[['1 Chọn hàng','Khách chọn SKU và số lượng, giỏ gọi API báo giá'],['2 Báo giá','Backend đọc giá/tồn, tính tổng và trả vấn đề cần xử lý'],['3 Xác nhận','Khách cung cấp người nhận, địa chỉ và xác nhận COD'],['4 Giao dịch','Backend kiểm tra lại trong transaction rồi lưu đơn, payment, giữ hàng và idempotency'],['5 Phản hồi','Frontend xóa giỏ sau thành công và mở trang xác nhận']],[3.5,13.1])
h('Phí giao hàng')
p('Giao tiêu chuẩn miễn phí khi subtotal lớn hơn 10.000.000 đồng. Ở đúng 10.000.000 đồng hoặc thấp hơn, phí là 50.000 đồng. Giao nhanh là 50.000 đồng. Ví dụ một SKU giá 10 triệu và giao tiêu chuẩn tạo tổng đơn 10.050.000 đồng.')
h('Mất phản hồi và thử lại')
p('Frontend lưu yêu cầu đang chờ trước khi gửi. Nếu server đã commit nhưng phản hồi bị mất, thử lại cùng requestId và nội dung trả về đơn trước đó. Nếu cùng key dùng cho nội dung khác, backend báo xung đột. Không được xem lỗi mạng là bằng chứng đơn chắc chắn chưa tạo.')
h('Quyền xem đơn')
p('Đơn của khách đăng nhập gắn customer_id từ session server. Đơn vãng lai dùng receipt token lưu trong phiên tab; URL không chứa token. Trùng email hoặc số điện thoại không đủ để tự ghép đơn guest vào tài khoản. Đơn không thuộc chủ thể hoặc thiếu quyền xem không lộ thông tin chi tiết.')
h('Giữ hàng')
p('Đơn PENDING chưa thanh toán giữ hàng tối đa 24 giờ. Worker giải phóng đơn quá hạn theo nghiệp vụ. Báo giá giỏ không phải giữ hàng; khi giá hoặc tồn thay đổi, khách phải xem lại báo giá trước khi đặt.')

page('7 Xử lý đơn và báo cáo doanh thu')
fig(Path('logs/submission/slides/slide-07.png'),'Hình 3  Luồng COD mới và tác động lên tồn kho')
p('CONFIRMED là trạng thái cũ có thể chuyển sang PROCESSING. Quản trị được hủy PENDING/CONFIRMED/PROCESSING chưa thanh toán; khách chỉ được hủy PENDING chưa thanh toán. Không có luồng UI trả hàng hoặc hoàn tiền. Ghi nhận PAID chỉ sau DELIVERED và không thực hiện chuyển tiền qua cổng thanh toán.')
p('Khi SHIPPED, on_hand và reserved cùng giảm; reservation chuyển sang CONSUMED. Hủy trước xuất kho chỉ giải phóng reserved, không giảm on_hand. Revision và kiểm tra reservation ngăn xuất hoặc hoàn tồn hai lần khi có thao tác đồng thời.')
p('Doanh thu gồm tổng tiền các đơn COMPLETED và PAID, kể cả phí giao hàng. Kỳ tính theo completed_at theo giờ Việt Nam UTC+7, tuần bắt đầu thứ Hai. Báo cáo hỗ trợ ngày/tuần/tháng, khoảng tối đa 367 ngày và phân trang 12 dòng. Đây là doanh thu theo trạng thái đơn, chưa phải báo cáo lợi nhuận hoặc sổ kế toán.')

page('8 Giao diện và kiểm soát truy cập')
fig(Path('docs/qa/docker-e2e/products-desktop.png'),'Hình 4  Quản trị sản phẩm có menu chung và dữ liệu kiểm thử',6.15)
p('Sidebar desktop và drawer mobile giúp chuyển trực tiếp giữa sản phẩm, danh mục, đơn, khách và doanh thu. Mục đội ngũ quản trị chỉ xuất hiện với owner. Backend vẫn kiểm tra quyền nếu người dùng nhập URL trực tiếp. Trang hồ sơ khách hiển thị tên, email, số điện thoại và ngày tham gia; có đường đi đến đơn và đổi mật khẩu.')
p('Mật khẩu dùng scrypt. Cookie phiên HttpOnly, SameSite và cấu hình Secure cho môi trường HTTPS. Mutation có kiểm tra origin/header. Rate limit giới hạn các nhóm request phù hợp. Ảnh upload được kiểm tra định dạng, kích thước và chuẩn hóa WebP. Các biện pháp này giảm rủi ro nhưng không thay thế một cuộc kiểm toán bảo mật độc lập.')
p('Owner không được tự khóa hoặc hạ quyền tài khoản đang đăng nhập qua quản lý admin. Reset mật khẩu người khác yêu cầu xác nhận, kiểm tra revision và thu hồi phiên. Mật khẩu không ghi vào log, repo hoặc output báo cáo.')

page('9 Kiểm thử và kết quả hiện có')
table(['Bộ kiểm tra','Bằng chứng và phạm vi'],[['Frontend','41 kiểm thử đạt ở phiên 10/11; quy tắc tiền, giỏ và API adapter'],['Ranh giới API và demo','Build guard từ chối dependency mock được chèn thử'],['Docker E2E','24 nhóm đạt với Chrome và database cô lập'],['Dataset demo','2 kiểm thử định dạng, ID/SKU và ảnh nội bộ'],['Trình duyệt demo','6 kiểm tra đạt về catalog, ảnh, đăng nhập, đơn, quyền và mobile'],['SQL demo','Tồn kho, doanh thu, số lượng và quyền không truy cập DB chính đạt']],[4.2,12.4])
p('Các con số không được cộng thành một tổng ca tương đương: nhóm E2E bao phủ nhiều thao tác, khác kiểm thử đơn vị. Bộ SQL backend 77 ca đã đạt ở phiên trước; phiên tạo bộ nộp không chạy lại và không dùng số đó để tuyên bố đã kiểm thử một thay đổi backend mới.')
h('Tình huống đã bao phủ')
p('E2E kiểm tra giá thay đổi, hết hàng, mất phản hồi checkout, thử lại không tạo trùng, cookie HttpOnly, khách chỉ xem đơn của mình, hủy đơn giải phóng giữ hàng, xử lý COD đến hoàn thành, báo cáo, sửa dữ liệu cũ bị từ chối, upload ảnh, quyền editor/owner và phiên bị thu hồi. Kiểm tra route và nội dung nhóm/liên hệ đã bổ sung trong bản local.')
h('Giới hạn của bằng chứng')
p('Một lượt E2E trước đó thất bại khi thu thập ảnh lỗi và che thông báo gốc. Logging đã được sửa và lượt chạy lại đạt 24 nhóm. Báo cáo không coi lần thất bại là pass. Nhóm vẫn cần test tay, kiểm tra khả năng thao tác bằng bàn phím/zoom và diễn tập trên thiết bị dùng khi bảo vệ.')
p('Nguồn kết quả: docs/qa/docker-e2e/results.json, docs/qa/demo/results.json và docs/qa/demo/sql-verification.json. Ảnh trong tài liệu dùng dữ liệu thử, không phải giao dịch kinh doanh thật.')

page('10 Triển khai và môi trường demo')
table(['Môi trường','Địa chỉ','Database'],[['Local chính','http://127.0.0.1:4000','AuraStoreDocker'],['Demo riêng','http://localhost:4001','AuraDemoDocker']],[3.1,6.4,7.1])
p('Hai môi trường dùng khác hostname để cookie không ghi đè nhau; cookie không tách chỉ theo port. Bản demo có login SQL riêng và không có quyền truy cập database chính. Cả hai cùng chia sẻ SQL engine/volume, do đó restart SQL có thể ảnh hưởng cả hai app.')
h('Bộ dữ liệu trình diễn')
p('Demo có 4 danh mục, 8 sản phẩm, 24 SKU, 8 ảnh WebP tự tạo, 2 admin và 1 customer. Sáu đơn ban đầu lần lượt ở PENDING, PROCESSING, SHIPPED, DELIVERED, COMPLETED và CANCELLED. Đơn hoàn thành đã thu tiền tạo doanh thu 25 triệu đồng. Giá, cấu hình, thông tin người nhận và ảnh đều là minh họa.')
p('Initializer gọi service nghiệp vụ để tạo đơn/chuyển trạng thái. Chạy demo:start lần hai giữ nguyên dữ liệu, không nhân đôi hoặc reset mật khẩu. Database có dữ liệu nhưng thiếu marker hoàn tất sẽ bị từ chối ghi đè. Không có lệnh drop/reset tự động. Đơn PENDING vẫn hết hạn sau 24 giờ, cần đặt đơn mới khi trình bày vào ngày khác.')
h('Vận hành và bàn giao')
p('Mật khẩu demo sinh ngẫu nhiên và lưu tại deploy/secrets, nằm ngoài Git. Người vận hành xem tài khoản qua Show-DemoAccounts.ps1 trên máy, không chiếu output trong video. Các lệnh demo:start, demo:stop và demo:status quản lý riêng demo-app. Backup/restore cần theo runbook, không xóa volume để khắc phục lỗi đăng nhập.')
p('Staging đã có cấu hình, preflight và runbook. Hosting công khai chưa có VPS/domain. GHCR đang giữ bản phát hành 09/11, khác source local mới; cần đồng bộ và phát hành đúng phiên bản trước khi dùng cho triển khai cuối.')

page('11 Đánh giá và phần cần hoàn thiện')
p('Kết quả hiện tại là bản local có luồng mua hàng và vận hành COD dùng SQL Server, menu quản trị thống nhất, profile khách, giới thiệu nhóm và môi trường demo có dữ liệu tái tạo. Source tách API khỏi mock và có các kiểm tra nhất quán giao dịch quan trọng.')
h('Các điểm cần xác nhận với giảng viên')
p('Nhóm cần chốt phạm vi sửa/khóa customer, quản lý role cố định hay động, việc dùng ẩn/khóa thay xóa cứng, thời điểm khách được hủy đơn và ngoại lệ lọc/sort cho bảng phụ. Các quyết định này ảnh hưởng schema, quyền và kiểm thử, không nên tự thay đổi sát hạn mà không có tiêu chí nghiệm thu.')
h('Việc còn lại trước nộp')
p('Nhóm thực hiện test tay cuối, hoàn thiện thông tin bìa và quy cách báo cáo theo mẫu lớp, kiểm tra bản in sơ đồ, luyện thuyết trình và tự sửa code, quay video luồng thật và chuẩn bị source cho giảng viên truy cập. Việc có file Word/PowerPoint không đồng nghĩa đã có video hoặc đã đạt yêu cầu bảo vệ cá nhân.')
h('Nguồn tài liệu của báo cáo')
table(['Nguồn','Nội dung đối chiếu'],[['Đề tài số 3 Website eCommerce.pdf','Yêu cầu đề tài do người dùng cung cấp'],['Lưu ý khi làm đồ án môn học.docx','Yêu cầu chung của giảng viên'],['backend/migrations/001–007','Schema, ràng buộc và migration thực tế'],['backend/src/auth và checkout','Xác thực, đặt đơn, giữ hàng, xử lý COD'],['Dockerfile và compose*.yaml','Đóng gói và cấu hình môi trường'],['docs/ACCEPTANCE_SCOPE.md','Ma trận quyền và các khoảng trống'],['docs/qa','Kết quả kiểm thử và ảnh minh chứng']],[7.2,9.4])
p('Báo cáo dựa trên source và tài liệu của dự án tại mốc đã ghi; không bổ sung nguồn web chưa kiểm chứng hoặc số liệu thị trường. Nhóm cần trình bày trung thực các thư viện, nguồn tham khảo và việc dùng công cụ AI trong quá trình thực hiện.')

page('Phụ lục Biên bản nghiệm thu tay')
p('Bảng này dành cho nhóm điền sau khi thao tác trên phiên bản cuối. Các ô “Chưa chạy” là trạng thái ban đầu, không phải kết quả kiểm thử tự động. Ghi ngày, người thực hiện, URL môi trường và source/image sử dụng.')
table(['Ca kiểm tra','Kết quả','Ghi chú'],[[x,'Chưa chạy',''] for x in ['Đăng nhập khách và admin đúng lựa chọn','Đăng ký và xem hồ sơ khách','Tìm kiếm và chọn SKU hết hàng','Giỏ hàng và ngưỡng phí 10 triệu','Đặt COD và thử lại sau mất phản hồi','Khách chỉ xem đơn của mình','Hủy đơn và giải phóng reserved','Xuất kho và ghi nhận COD','Báo cáo theo kỳ hoàn thành','Editor không quản lý admin','Reset mật khẩu và phiên bị thu hồi','Mobile và thao tác bàn phím','Giới thiệu nhóm và email liên hệ','Chạy lại demo không tạo trùng dữ liệu']],[8.8,3.4,4.4])
p('Ưu tiên sửa lỗi truy cập chéo dữ liệu, tăng quyền, bán quá tồn và tạo trùng đơn trước lỗi trình bày. Nếu thiếu dữ liệu hoặc môi trường, ghi BLOCKED thay vì PASS. Không chụp cookie, token hoặc mật khẩu vào minh chứng.')

for element in [doc.styles.element, doc.element]:
    for border in list(element.iter(qn('w:pBdr'))):
        border.getparent().remove(border)
OUT.parent.mkdir(parents=True,exist_ok=True);doc.save(OUT)
print(str(OUT))
