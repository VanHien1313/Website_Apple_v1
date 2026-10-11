# 🍎 Aura — Website Thương Mại Điện Tử Đại Lý Ủy Quyền Apple Cao Cấp

![React 19](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Hệ thống website thương mại điện tử chuyên biệt dành cho các sản phẩm công nghệ Apple chính hãng (Aura Apple Authorized Reseller). Giao diện được thiết kế theo tiêu chuẩn hiện đại cao cấp (*Direction C — Modern Apple Commerce*), lấy cảm hứng từ Apple Store, TopZone, Thế Giới Di Động và CellphoneS, mang đến trải nghiệm mua sắm trực quan, mượt mà và đẳng cấp.

---

## 📑 Mục Lục
- [1. Tính Năng Nổi Bật](#1-tính-năng-nổi-bật)
- [2. Cấu Trúc Dự Án](#2-cấu-trúc-dự-án)
- [3. Công Nghệ Sử Dụng](#3-công-nghệ-sử-dụng)
- [4. Hướng Dẫn Cài Đặt & Chạy](#4-hướng-dẫn-cài-đặt--chạy)
- [5. Luồng Mua Sắm & Trải Nghiệm](#5-luồng-mua-sắm--trải-nghiệm)
- [6. Tài Liệu Hệ Thống & Kế Hoạch Tích Hợp](#6-tài-liệu-hệ-thống--kế-hoạch-tích-hợp)

---

## 1. Tính Năng Nổi Bật

### 🖥️ Giao diện & Trải nghiệm Người Dùng (UI/UX)
- **Thiết kế chuẩn Apple Commerce:** Tông màu sang trọng (90% nền xám mềm/trắng, 8% đen tối giản, 2% xanh cobalt nhận diện thương hiệu).
- **Dark Mode & Light Mode:** Chuyển đổi chủ đề sáng/tối tức thì với bộ tokens màu sắc chuyên sâu.
- **Hoàn toàn Responsive:** Tối ưu hiển thị mượt mà trên mọi thiết bị: Desktop, Tablet và Mobile.
- **Micro-interactions:** Hiệu ứng hover sản phẩm, animation chuyển cảnh, thanh thông báo trượt và toast notification mượt mà.

### 📱 Danh mục & Khám phá Sản phẩm
- **4 Ngành hàng cốt lõi:** iPhone, iPad, Mac và Apple Watch.
- **Bộ lọc đa tiêu chí:** Lọc sản phẩm theo phân khúc dòng máy (Pro Series, Standard, Air, Ultra...), lọc theo khoảng giá, và sắp xếp linh hoạt (Giá tăng/giảm, Mới nhất, Bán chạy).
- **Thẻ sản phẩm chuẩn TopZone:** Hiển thị nhãn trả góp 0%, tag công nghệ màn hình, pill chọn dung lượng, chấm đổi màu xem nhanh ảnh sản phẩm, huy hiệu giảm giá.

### 🔍 Trang Chi Tiết Sản Phẩm (PDP)
- **Thư viện ảnh studio cân đối:** Hình ảnh sản phẩm chất lượng cao (650x650px PNG nền trong suốt) được căn chỉnh tỷ lệ chuẩn xác, không bị phóng to hay cắt xén.
- **Lightbox phóng to chi tiết:** Cho phép click phóng to toàn màn hình để soi cận cảnh từng góc máy và màu sắc.
- **Cấu hình đa dạng:** Chọn biến thể dung lượng (128GB, 256GB, 512GB, 1TB...) và màu sắc kèm cập nhật giá tiền tự động.
- **Bảng thông số kỹ thuật đa tầng:** Tóm tắt thông số chính và modal xem chi tiết đầy đủ (Chip, RAM, Camera, Màn hình, Pin, Cổng kết nối...).

### 🛒 Giỏ Hàng & Quy Trình Thanh Toán (Cart & Checkout)
- **Quản lý giỏ hàng thông minh:** Thêm, bớt, tăng giảm số lượng, tự động tính tổng tiền, chiết khấu và miễn phí ship; lưu trữ trạng thái bền vững qua `localStorage`.
- **Form thanh toán chuẩn hóa:** Điền thông tin giao hàng, validation số điện thoại/email, lựa chọn phương thức thanh toán (COD, VNPay Sandbox, MoMo Sandbox).
- **Xác nhận đơn hàng:** Xuất mã đơn hàng định danh (`APL-2026-XXXX`) và làm mới giỏ hàng sau khi đặt thành công.

---

## 2. Cấu Trúc Dự Án

Dự án được cấu trúc rõ ràng theo mô hình phân tách Frontend và Tài liệu thiết kế hệ thống:

```text
Apple_Web/
├── frontend/                       # Toàn bộ mã nguồn giao diện người dùng
│   ├── src/
│   │   ├── assets/                 # Hình ảnh, biểu tượng tĩnh
│   │   ├── components/             # Reusable UI components
│   │   │   ├── common/             # Button, PriceDisplay, ThemeToggle, EmptyState...
│   │   │   ├── layout/             # Header, Navbar, Footer, AnnouncementBar...
│   │   │   └── product/            # ProductCard, ProductGrid, FilterSidebar, FilterDrawer...
│   │   ├── data/                   # Dữ liệu chuẩn hóa (mockProducts, specifications)
│   │   ├── pages/                  # Trang chính (Home, Category, ProductDetail, Cart, Checkout)
│   │   ├── services/               # Lớp trừu tượng dịch vụ (productService, orderService)
│   │   ├── store/                  # Quản lý trạng thái toàn cục (CartContext)
│   │   ├── styles/                 # Tailwind design tokens & CSS biến
│   │   ├── types/                  # Định nghĩa TypeScript Domain Models
│   │   └── utils/                  # Format tiền tệ, định dạng ngày, thông số kỹ thuật
│   ├── public/                     # Static public assets
│   ├── index.html                  # File HTML entry point
│   ├── vite.config.ts              # Cấu hình Vite
│   ├── tailwind.config.js          # Cấu hình Tailwind CSS
│   ├── tsconfig.json               # Cấu hình TypeScript
│   └── package.json                # Dependencies của Frontend
│
├── docs/                           # Tài liệu kỹ thuật kiến trúc & tích hợp
│   ├── ARCHITECTURE.md             # Kiến trúc hệ thống tổng thể & phân tầng
│   ├── API_CONTRACT.md             # Đặc tả hợp đồng API RESTful (chuẩn bị kết nối Backend)
│   ├── INTEGRATION_PLAN.md         # Kế hoạch tích hợp OAuth (Google) & Cổng thanh toán
│   └── PHASE_1_TO_8_COMPLETION_REPORT.md  # Báo cáo kết quả kiểm thử E2E Frontend
│
├── .gitignore                      # Cấu hình loại trừ file khi đẩy lên GitHub
├── package.json                    # Root scripts chuyển tiếp (npm run dev, build)
└── README.md                       # Tài liệu hướng dẫn dự án (file này)
```

---

## 3. Công Nghệ Sử Dụng

| Lớp kiến trúc | Công nghệ / Thư viện | Mục đích |
| :--- | :--- | :--- |
| **Framework UI** | `React 19` | Xây dựng giao diện Single Page Application (SPA) hiệu năng cao |
| **Ngôn ngữ** | `TypeScript 5.7` | Định kiểu tĩnh chặt chẽ, an toàn dữ liệu cho toàn bộ domain models |
| **Build Tool** | `Vite 6` | Bundler siêu tốc, Hot Module Replacement (HMR) tức thì |
| **Định tuyến** | `React Router v7` | Điều hướng trang mượt mà không tải lại trang |
| **Styling** | `Tailwind CSS 3.4` + `PostCSS` | Hệ thống atomic CSS, responsive utility và tokens tùy chỉnh |
| **Biểu tượng** | `Lucide React` | Bộ icon SVG hiện đại, tinh gọn chuẩn giao diện công nghệ |
| **Trạng thái** | `React Context` + `useReducer` | Quản lý giỏ hàng toàn cục, đồng bộ dữ liệu `localStorage` |

---

## 4. Hướng Dẫn Cài Đặt & Chạy

### Yêu cầu môi trường
- **Node.js:** Phiên bản `18.x` trở lên (Khuyến nghị `20.x` hoặc `22.x` / `24.x`).
- **Trình quản lý gói:** `npm`, `yarn` hoặc `pnpm`.

### Bước 1: Clone kho mã nguồn về máy
```bash
git clone https://github.com/<tai-khoan-cua-ban>/Apple_Web.git
cd Apple_Web
```

### Bước 2: Cài đặt Dependencies
Bạn có thể cài đặt trực tiếp từ thư mục `frontend`:
```bash
cd frontend
npm install
```

### Bước 3: Khởi chạy môi trường phát triển (Development)
Tại thư mục gốc `Apple_Web` (hoặc bên trong `frontend`):
```bash
npm run dev
```

Mở trình duyệt và truy cập:
👉 **`http://localhost:3000/`**

### Bước 4: Biên dịch sản xuất (Production Build)
```bash
npm run build
```
Bản build tối ưu hóa sẽ được tạo trong thư mục `frontend/dist/`.

Để xem thử bản build sản xuất:
```bash
npm run preview
```

---

## 5. Luồng Mua Sắm & Trải Nghiệm

1. **Khám phá:** Khách hàng vào trang chủ xem các bộ sưu tập flagship Apple hoặc bấm chọn ngành hàng trên thanh Menu (`iPhone`, `iPad`, `Mac`, `Watch`).
2. **Lọc & Tìm kiếm:** Lọc sản phẩm theo dòng sản phẩm và mức giá phù hợp.
3. **Cấu hình thiết bị:** Bấm xem trực tiếp một sản phẩm để chọn màu sắc, dung lượng lưu trữ, xem ảnh phóng to và thông số kỹ thuật.
4. **Giỏ hàng:** Nhấn *"Thêm vào giỏ"*, điều chỉnh số lượng hoặc kiểm tra lại tổng tiền tại trang `/cart`.
5. **Thanh toán:** Nhấn *"Mua ngay"* hoặc *"Tiến hành thanh toán"*, điền thông tin người nhận và chọn phương thức thanh toán.
6. **Xác nhận:** Nhận thông báo xác nhận đơn hàng thành công kèm mã tra cứu đơn hàng riêng biệt.

---

## 6. Tài Liệu Hệ Thống & Kế Hoạch Tích Hợp

Dự án được thiết kế theo phương pháp **Frontend-First, Integration-Ready**. Lớp giao tiếp dữ liệu đã được trừu tượng hóa qua các Service (`productService`, `orderService`):
- Khi tích hợp Backend thực tế (Node.js/Express, NestJS, Spring Boot hoặc Go), chỉ cần chuyển đổi endpoint trong thư mục `src/services/` mà không cần thay đổi bất kỳ component UI nào.
- Tham khảo thêm tài liệu chi tiết trong thư mục `docs/`:
  - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Kiến trúc phân tầng và luồng dữ liệu.
  - [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md): Hợp đồng đặc tả các endpoint REST API.
  - [`docs/INTEGRATION_PLAN.md`](docs/INTEGRATION_PLAN.md): Kế hoạch tích hợp Google OAuth 2.0 & cổng VNPay / MoMo.

---

© 2026 **Aura Apple Authorized Reseller**. All rights reserved.
