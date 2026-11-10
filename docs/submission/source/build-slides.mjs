import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(), runtime=process.env.AURA_RUNTIME_ROOT;
if(!runtime) throw new Error('Set AURA_RUNTIME_ROOT to the workspace dependency root');
const skill=process.env.AURA_PRESENTATION_SKILL;
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const build=path.join(root,'logs/submission/slides'), output=path.join(root,'docs/submission/Aura_Defense.pptx');
await fs.mkdir(build,{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const blue='#0066CC',ink='#142033',gray='#546174';
function text(s,t,x,y,w,h,size=28,bold=false,color=ink){const v=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});v.text=t;v.text.style={typeface:'Arial',fontSize:size,bold,color,insets:0,autoFit:'none',wrap:'square'};return v;}
function slide(title,notes=''){const s=p.slides.add();s.background.fill='#FFFFFF';text(s,title,64,48,1150,85,44,true);text(s,String(p.slides.items.length).padStart(2,'0'),1160,665,50,30,18,false,gray);s.speakerNotes.text=notes;return s;}
async function image(s,file,x,y,w,h){const b=await fs.readFile(path.join(root,file));s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:path.basename(file),fit:'contain',position:{left:x,top:y,width:w,height:h}});}
function lines(s,items,x=64,y=180,w=1100,size=28,gap=100){items.forEach((v,i)=>text(s,v,x,y+i*gap,w,gap-10,size));}
function node(s,t,x,y,w=220,h=85){const v=s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill:'#F3F6FA',line:{fill:'#AAB7C6',width:1}});v.text=t;v.text.style={typeface:'Arial',fontSize:24,bold:true,color:ink,alignment:'center',verticalAlignment:'middle',insets:10};return v;}
function arrow(s,a,b,from='right',to='left'){s.shapes.connect(a,b,{kind:'straight',fromSide:from,toSide:to,line:{fill:blue,width:2},tail:{type:'arrow'}});}
function table(s,rows,widths,y=180,h=380){const t=s.tables.add({rows:rows.length,columns:rows[0].length,left:64,top:y,width:1152,height:h,columnWidths:widths,values:rows});t.borders.assign({fill:'#D9D9D9',width:1,style:'solid'});for(let r=0;r<rows.length;r++)for(let c=0;c<rows[0].length;c++){const cell=t.getCell(r,c);cell.fill=r===0?'#153250':r%2?'#FFFFFF':'#F1F5F9';cell.text.style={typeface:'Arial',fontSize:24,color:r===0?'#FFFFFF':ink,bold:r===0,insets:14,verticalAlignment:'middle'};}return t;}
let s=slide('Aura eCommerce','Nhóm: Nguyễn Văn Hiền N23DCAT023 và Khuất Nguyễn Bảo Hiếu N23DCAT026. Cả hai trực tiếp thiết kế, phát triển website. Snapshot 10/11/2026, source 5b25b40. Phần hosting chưa triển khai.');
text(s,'Website bán thiết bị Apple',64,195,1100,85,58,true,blue);
text(s,'React  ·  Express  ·  SQL Server',64,315,1050,60,32,false,gray);
lines(s,['Nguyễn Văn Hiền     N23DCAT023','Khuất Nguyễn Bảo Hiếu     N23DCAT026'],64,470,1050,28,60);
s=slide('Phạm vi đồ án','Nguồn: docs/LECTURER_REQUIREMENTS_MAPPING.md, docs/ACCEPTANCE_SCOPE.md. Dùng dữ liệu minh họa, không tự nhận đại lý Apple.');
text(s,'Trải nghiệm mua hàng',64,180,535,55,32,true,blue);lines(s,['Tìm sản phẩm và chọn cấu hình','Giỏ hàng, báo giá, đặt COD','Hồ sơ và lịch sử đơn của khách'],64,260,535,28,100);
text(s,'Vận hành cửa hàng',675,180,535,55,32,true,blue);lines(s,['Sản phẩm, danh mục, tồn kho','Xử lý đơn và ghi nhận thu tiền','Tài khoản quản trị và doanh thu'],675,260,535,28,100);
s=slide('Vai trò và quyền truy cập','Nguồn: backend/src/auth/service.ts, admin-users.ts, checkout/management.ts. Customer/admin xác thực riêng. Quyền do backend kiểm tra.');
table(s,[['Vai trò','Chức năng chính'],['Vãng lai','Xem catalog và đặt COD bằng receipt'],['Khách hàng','Đặt hàng, xem và hủy đơn PENDING của mình'],['Editor','Catalog, đơn hàng, khách hàng chỉ đọc, báo cáo'],['Owner','Quyền editor và quản lý tài khoản admin']],[250,902],165,420);
s=slide('Kiến trúc ứng dụng','Nguồn: Dockerfile, compose.yaml, frontend/vite.config.ts, backend/src/app.ts. Frontend API không import mock. SQL runtime hạn chế quyền.');
const browser=node(s,'Trình duyệt\nReact',64,235),api=node(s,'API\nExpress',370,235),sql=node(s,'Dữ liệu\nSQL Server',676,235),worker=node(s,'Worker\nhết hạn giữ hàng',982,235,234);arrow(s,browser,api);arrow(s,api,sql);arrow(s,worker,sql,'left','right');
text(s,'HTTP cùng origin',65,365,280,50,23,false,gray);text(s,'Xác thực và nghiệp vụ',370,365,290,70,23,false,gray);text(s,'Transaction và ràng buộc',676,365,320,70,23,false,gray);
text(s,'Docker đóng gói ứng dụng và SQL Server cho môi trường local.',64,515,1100,80,30);
s=slide('Quan hệ dữ liệu cốt lõi','ERD rút gọn từ migrations 001–007. Đây là sơ đồ quan hệ chính, không liệt kê toàn bộ bảng/cột. order_items lưu snapshot; product_id/variant_id ở order_items không phải FK. sessions, media_images, events, payments, idempotency mô tả trong báo cáo.');
const c=node(s,'categories',64,175,230,70),pr=node(s,'products',385,175,230,70),sk=node(s,'inventory_skus',706,175,250,70);arrow(s,c,pr);arrow(s,pr,sk);
const cu=node(s,'customers',64,365,230,70),o=node(s,'orders',385,365,230,70),oi=node(s,'order_items',706,365,250,70);arrow(s,cu,o);arrow(s,o,oi);arrow(s,sk,oi,'bottom','top');
text(s,'1 : nhiều',300,160,80,35,18,false,gray);text(s,'1 : nhiều',620,160,80,35,18,false,gray);text(s,'0/1 khách',300,340,80,45,18,false,gray);
text(s,'SKU kết hợp cấu hình và màu của cùng sản phẩm.\nĐơn giữ tên, giá và thông tin nhận hàng tại thời điểm đặt.',64,535,1130,85,28);
s=slide('Checkout và giữ hàng','Nguồn: backend/src/checkout/quote.ts, orders.ts. Dùng transaction, idempotency và giá SQL. Giữ PENDING tối đa 24 giờ.');
lines(s,['01  Backend tính lại giá và tồn khả dụng','02  Khách xác nhận thông tin và tổng tiền','03  Transaction lưu đơn và giữ số lượng','04  Thử lại cùng mã yêu cầu trả về cùng đơn'],64,170,1150,30,95);
text(s,'Đúng 10 triệu: phí tiêu chuẩn 50.000 đồng. Trên 10 triệu: miễn phí.',64,585,1120,60,25,true,blue);
s=slide('Vòng đời đơn COD','Nguồn: checkout/management.ts và orders.ts. Bỏ CONFIRMED cũ khỏi sơ đồ luồng mới. Khách chỉ hủy PENDING chưa thanh toán. Quản trị có thể hủy PROCESSING chưa thu tiền. PAID sau DELIVERED, COMPLETED cần PAID.');
const names=['PENDING','PROCESSING','SHIPPED','DELIVERED','COMPLETED'];const boxes=names.map((n,i)=>node(s,n,64+i*236,180,208,70));boxes.slice(1).forEach((b,i)=>arrow(s,boxes[i],b));
text(s,'Giữ hàng',64,275,208,45,23,false,gray);text(s,'Chờ xuất kho',300,275,208,45,23,false,gray);text(s,'Trừ tồn',536,275,208,45,23,false,gray);text(s,'Ghi nhận PAID',772,275,208,45,23,false,gray);text(s,'Tính doanh thu',1008,275,208,45,23,false,gray);
table(s,[['Thao tác','on_hand','reserved'],['Tạo đơn','Giữ nguyên','Tăng'],['Hủy trước xuất kho','Giữ nguyên','Giảm'],['SHIPPED','Giảm','Giảm']],[600,276,276],375,240);
s=slide('Quản trị và bảo vệ dữ liệu','Nguồn: backend/src/auth, admin-users.ts, products-admin.ts, migrations/001_initial.sql. Ảnh: docs/qa/docker-e2e/products-desktop.png, dữ liệu kiểm thử cô lập.');
lines(s,['Phiên HttpOnly và mật khẩu băm scrypt','Backend kiểm tra quyền ở từng nghiệp vụ','Revision phát hiện cập nhật đồng thời','Lịch sử đơn chỉ thêm, không sửa/xóa'],64,170,515,27,105);
await image(s,'docs/qa/docker-e2e/products-desktop.png',620,170,610,450);
s=slide('Dữ liệu trình diễn riêng','Nguồn: deploy/demo/catalog.mjs, init.mjs và docs/qa/demo/sql-verification.json. Đơn tạo bằng service. Doanh thu mẫu ở ngày 10/11/2026. Số liệu thay đổi khi thao tác hoặc PENDING hết hạn.');
lines(s,['8 sản phẩm và 24 SKU','3 tài khoản theo vai trò','6 đơn với trạng thái khác nhau','25 triệu đồng doanh thu mẫu'],64,180,475,32,100);
await image(s,'docs/qa/demo/revenue-desktop.png',570,170,650,440);
s=slide('Bằng chứng kiểm thử','Nguồn: docs/qa/docker-e2e/results.json, docs/qa/demo/results.json và SQL verification. 41 frontend tests và boundary đã chạy ở phiên 10/11. Không cộng các số thành tổng số ca tương đương. Chưa có biên bản test tay cuối của nhóm.');
table(s,[['Bộ kiểm tra','Kết quả hiện có'],['Frontend','41 kiểm thử đạt'],['Docker E2E','24 nhóm đạt trên database cô lập'],['Bản demo','2 kiểm thử dữ liệu và 6 kiểm tra trình duyệt'],['SQL demo','Tồn kho đúng, không có quyền truy cập DB chính']],[340,812],170,390);
text(s,'Test tay cuối và diễn tập bảo vệ vẫn cần nhóm xác nhận.',64,595,1120,55,26,true,blue);
s=slide('Môi trường chạy và giới hạn','Nguồn: compose.yaml, compose.demo.yaml, docs/LOCAL_DEMO.md. Khác hostname để cookie không dùng chung giữa hai cổng. GHCR đang là bản cũ 09/11, source local mới chưa push.');
lines(s,['Local chính: 127.0.0.1:4000, AuraStoreDocker','Demo: localhost:4001, AuraDemoDocker','Hosting công khai còn chờ VPS và tên miền','OAuth, email tự động và thanh toán online chưa triển khai'],64,180,1150,29,100);
s=slide('Kịch bản trình diễn','Nguồn: docs/DEMO_AND_DEFENSE.md. Trước demo chuẩn bị tài khoản bằng Show-DemoAccounts.ps1 trên máy, không chiếu mật khẩu. Đặt đơn mới nếu cần trạng thái PENDING sau 24 giờ. Nhóm tự phân vai thuyết trình và tự giải thích code.');
lines(s,['Tìm sản phẩm và chọn cấu hình','Đăng nhập khách hàng, đặt COD','Quản trị xử lý đơn và ghi nhận tiền','Đối chiếu tồn kho, lịch sử và báo cáo'],64,170,1100,32,100);
text(s,'Demo tại localhost:4001',64,600,1100,50,28,true,blue);
for(let i=0;i<p.slides.items.length;i++){const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));}
const candidate=path.join(build,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);
await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:output,pythonExecutable:path.join(runtime,'python/python.exe'),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','3','--require-native-table-slide','7','--require-native-table-slide','10'],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,requiredNativeTableOwnerSlides:[3,7,10],receiptPath:path.join(build,'validation.json')});
console.log(JSON.stringify({slides:p.slides.items.length,output}));
