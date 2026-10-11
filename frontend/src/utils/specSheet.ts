import { Product, SpecGroup } from '../types/product';

/**
 * Returns comprehensive, authentic Vietnamese e-commerce spec sheets (TGDD / CellphoneS style)
 * for all Apple product categories.
 */
export function getProductDetailedSpecs(product: Product): SpecGroup[] {
  if (product.detailedSpecs && product.detailedSpecs.length > 0) {
    return product.detailedSpecs;
  }

  if (product.category === 'iphone') {
    const isPro = product.name.includes('Pro');
    const is16 = product.name.includes('16');
    const is15 = product.name.includes('15');
    const isMax = product.name.includes('Max') || product.name.includes('Plus');

    return [
      {
        groupName: 'Màn hình',
        items: [
          { label: 'Công nghệ màn hình', value: isPro ? 'Super Retina XDR OLED (Tấm nền ProMotion)' : 'Super Retina XDR OLED' },
          { label: 'Độ phân giải', value: isMax ? '2868 x 1320 Pixels' : '2556 x 1179 Pixels' },
          { label: 'Kích thước màn hình', value: isMax ? (is16 ? '6.9 inch' : '6.7 inch') : (is16 ? '6.3 inch' : '6.1 inch') },
          { label: 'Tần số quét', value: isPro ? '120 Hz (Tần số thích ứng ProMotion 1 - 120Hz)' : '60 Hz' },
          { label: 'Độ sáng tối đa', value: is16 ? '2000 nits (ngoài trời) • 1 nit tối thiểu' : '2000 nits (ngoài trời)' },
          { label: 'Mặt kính cảm ứng', value: is16 ? 'Ceramic Shield thế hệ mới nhất (Bền hơn 50%)' : 'Kính cường lực Ceramic Shield' },
          { label: 'Tính năng màn hình', value: isPro ? 'Màn hình Luôn Bật (Always-On), Dynamic Island, True Tone, Dải màu rộng DCI-P3, HDR10, Dolby Vision' : 'Dynamic Island, True Tone, Dải màu rộng DCI-P3, HDR' },
        ],
      },
      {
        groupName: 'Camera sau',
        items: [
          { label: 'Độ phân giải camera', value: isPro ? (is16 ? 'Chính 48 MP & Phụ 48 MP, 12 MP (Tele 5x)' : 'Chính 48 MP & Phụ 12 MP, 12 MP (Tele 5x)') : 'Chính 48 MP & Phụ 12 MP (Góc siêu rộng)' },
          { label: 'Quay phim', value: isPro ? '4K 120 fps Dolby Vision, 4K 60 fps ProRes, Quay video không gian Spatial Video cho Apple Vision Pro' : '4K 60 fps Dolby Vision, Chế độ Điện Ảnh (Cinematic Mode 4K)' },
          { label: 'Đèn Flash', value: 'Đèn flash True Tone thích ứng' },
          { label: 'Tính năng camera', value: 'Nút Điều khiển Camera (Camera Control), Chống rung quang học dịch chuyển cảm biến thế hệ mới (Sensor-shift OIS), Chụp đêm (Night mode), Deep Fusion, Phong cách nhiếp ảnh thế hệ mới, Chụp ảnh Macro' },
        ],
      },
      {
        groupName: 'Camera trước',
        items: [
          { label: 'Độ phân giải', value: '12 MP (Khẩu độ f/1.9)' },
          { label: 'Tính năng', value: 'Tự động lấy nét theo pha Focus Pixels, HDR thông minh 5, Chân dung xóa phông với Focus and Depth Control' },
          { label: 'Quay video trước', value: 'Quay video 4K ở tốc độ 24 fps, 25 fps, 30 fps hoặc 60 fps' },
        ],
      },
      {
        groupName: 'Hệ điều hành & Vi xử lý (CPU)',
        items: [
          { label: 'Hệ điều hành', value: 'iOS 18 (Hỗ trợ Apple Intelligence)' },
          { label: 'Chip xử lý (CPU)', value: isPro ? (is16 ? 'Apple A18 Pro 6 nhân (3nm thế hệ 2)' : 'Apple A17 Pro 6 nhân (3nm)') : (is16 ? 'Apple A18 6 nhân' : (is15 ? 'Apple A16 Bionic 6 nhân' : 'Apple A15 Bionic 6 nhân')) },
          { label: 'Tốc độ CPU', value: '2 nhân hiệu năng cao + 4 nhân tiết kiệm điện' },
          { label: 'Chip đồ họa (GPU)', value: isPro ? 'Apple GPU 6 nhân (Hỗ trợ Ray Tracing phần cứng)' : 'Apple GPU 5 nhân' },
          { label: 'Bộ xử lý thần kinh (NPU)', value: 'Neural Engine 16 lõi xử lý AI tốc độ cao' },
        ],
      },
      {
        groupName: 'Bộ nhớ & Lưu trữ',
        items: [
          { label: 'Dung lượng RAM', value: is16 ? '8 GB' : (isPro ? '8 GB' : '6 GB') },
          { label: 'Dung lượng lưu trữ', value: isPro ? '256 GB / 512 GB / 1 TB' : '128 GB / 256 GB / 512 GB' },
          { label: 'Thẻ nhớ ngoài', value: 'Không hỗ trợ' },
        ],
      },
      {
        groupName: 'Kết nối & Mạng',
        items: [
          { label: 'Mạng di động', value: 'Hỗ trợ 5G đa băng tần tốc độ cao' },
          { label: 'Số khe SIM', value: '1 Nano SIM & 1 eSIM hoặc 2 eSIM kích hoạt đồng thời' },
          { label: 'Wi-Fi', value: is16 ? 'Wi-Fi 7 (802.11be) với 2x2 MIMO' : 'Wi-Fi 6E (802.11ax)' },
          { label: 'Bluetooth', value: 'v5.3' },
          { label: 'Cổng kết nối / sạc', value: isPro ? 'Type-C (Chuẩn USB 3, tốc độ truyền dữ liệu đến 10Gb/s)' : 'Type-C (Chuẩn USB 2, tốc độ truyền 480Mb/s)' },
          { label: 'Định vị GPS', value: 'GPS tần số kép chuẩn xác, GLONASS, Galileo, QZSS, BeiDou, NavIC' },
        ],
      },
      {
        groupName: 'Pin & Công nghệ sạc',
        items: [
          { label: 'Thời lượng sử dụng pin', value: isMax ? 'Xem video lên đến 33 giờ • Nghe nhạc lên đến 105 giờ' : 'Xem video lên đến 27 giờ • Nghe nhạc lên đến 85 giờ' },
          { label: 'Cổng sạc', value: 'USB Type-C' },
          { label: 'Công nghệ sạc nhanh', value: 'Sạc nhanh có dây: Đạt 50% pin trong 30 phút (với củ sạc 20W trở lên)' },
          { label: 'Sạc không dây', value: 'Sạc không dây MagSafe lên đến 25W (với củ sạc 30W), Sạc không dây Qi2 lên đến 15W' },
        ],
      },
      {
        groupName: 'Thiết kế, Trọng lượng & Tiện ích',
        items: [
          { label: 'Chất liệu khung viền', value: isPro ? 'Khung Titan Cấp 5 (Grade 5 Titanium) phay xước nhẹ' : 'Khung Nhôm chuẩn hàng không vũ trụ' },
          { label: 'Mặt lưng', value: 'Mặt kính nhám cao cấp Ceramic Shield' },
          { label: 'Kích thước & Trọng lượng', value: isMax ? '163.0 x 77.6 x 8.25 mm • Nặng 227 g' : '149.6 x 71.5 x 8.25 mm • Nặng 199 g' },
          { label: 'Chống nước, kháng bụi', value: 'IP68 (Độ sâu tối đa 6 mét trong vòng 30 phút theo chuẩn IEC 60529)' },
          { label: 'Bảo mật sinh trắc học', value: 'Mở khóa khuôn mặt Face ID 3D' },
          { label: 'Tính năng đặc biệt', value: 'Nút Tác vụ (Action Button), Nút Điều khiển Camera (Camera Control), Phát hiện va chạm xe, SOS khẩn cấp qua vệ tinh' },
        ],
      },
    ];
  }

  if (product.category === 'ipad') {
    const isPro = product.name.includes('Pro');
    const isAir = product.name.includes('Air');

    return [
      {
        groupName: 'Màn hình',
        items: [
          { label: 'Công nghệ màn hình', value: isPro ? 'Ultra Retina XDR (Công nghệ hai lớp Tandem OLED)' : 'Liquid Retina IPS LCD' },
          { label: 'Độ phân giải', value: isPro ? '2752 x 2064 Pixels (264 ppi)' : '2360 x 1640 Pixels (264 ppi)' },
          { label: 'Kích thước màn hình', value: isPro ? '11 inch hoặc 13 inch' : '11 inch hoặc 13 inch' },
          { label: 'Tần số quét', value: isPro ? '120 Hz ProMotion thích ứng 10 - 120Hz' : '60 Hz' },
          { label: 'Độ sáng', value: isPro ? '1000 nits toàn màn hình • 1600 nits đỉnh HDR' : '500 - 600 nits' },
          { label: 'Công nghệ hiển thị', value: 'True Tone, Dải màu rộng DCI-P3, Lớp phủ kháng dầu chống in dấu vân tay, Tùy chọn mặt kính nano-texture' },
        ],
      },
      {
        groupName: 'Vi xử lý & Đồ họa',
        items: [
          { label: 'Chip xử lý (CPU)', value: isPro ? 'Apple M4 (9 lõi hoặc 10 lõi CPU thế hệ mới)' : (isAir ? 'Apple M2 (8 lõi CPU)' : 'Apple A14 Bionic') },
          { label: 'Chip đồ họa (GPU)', value: isPro ? '10 lõi GPU (Hỗ trợ dò tia Ray Tracing tốc độ cao phần cứng)' : 'Apple GPU 10 lõi' },
          { label: 'Neural Engine', value: isPro ? '16 lõi (Xử lý 38 nghìn tỷ phép tính mỗi giây)' : '16 lõi' },
        ],
      },
      {
        groupName: 'Bộ nhớ & Lưu trữ',
        items: [
          { label: 'RAM', value: isPro ? '8 GB (phiên bản 256GB/512GB) • 16 GB (phiên bản 1TB/2TB)' : '8 GB' },
          { label: 'Bộ nhớ trong', value: '128 GB / 256 GB / 512 GB / 1 TB' },
        ],
      },
      {
        groupName: 'Camera & Âm thanh',
        items: [
          { label: 'Camera sau', value: '12 MP góc rộng (f/1.8), Zoom kỹ thuật số 5x, Đèn flash True Tone thích ứng' },
          { label: 'Camera trước', value: '12 MP Ultra Wide nằm ở cạnh ngang, tính năng Center Stage sân khấu trung tâm' },
          { label: 'Cảm biến phụ', value: isPro ? 'Cảm biến LiDAR Scanner quét chiều sâu 3D' : 'Không có' },
          { label: 'Hệ thống loa', value: '4 loa stereo âm trường rộng rãi, hỗ trợ Spatial Audio' },
          { label: 'Microphone', value: '4 micro chuẩn phòng thu lọc tiếng ồn' },
        ],
      },
      {
        groupName: 'Kết nối & Phụ kiện tương thích',
        items: [
          { label: 'Cổng kết nối', value: isPro ? 'Thunderbolt 3 / USB 4 (Băng thông lên đến 40 Gb/s)' : 'USB-C (Chuẩn USB 3, 10 Gb/s)' },
          { label: 'Wi-Fi', value: 'Wi-Fi 6E (802.11ax) đa luồng MIMO' },
          { label: 'Bluetooth', value: 'v5.3' },
          { label: 'Bút cảm ứng tương thích', value: 'Apple Pencil Pro, Apple Pencil (USB-C)' },
          { label: 'Bàn phím tương thích', value: 'Magic Keyboard mới với dải phím chức năng' },
        ],
      },
      {
        groupName: 'Pin & Thiết kế',
        items: [
          { label: 'Thời lượng pin', value: 'Lướt web bằng Wi-Fi hoặc xem video lên đến 10 giờ liên tục' },
          { label: 'Độ mỏng ấn tượng', value: isPro ? 'Chỉ 5.1 mm (Thiết bị mỏng nhất lịch sử Apple)' : '6.1 mm' },
          { label: 'Chất liệu vỏ', value: 'Nhôm tái chế 100% nguyên khối siêu bền' },
          { label: 'Bảo mật', value: isPro ? 'Nhận diện khuôn mặt Face ID' : 'Cảm biến vân tay Touch ID tích hợp nút nguồn' },
        ],
      },
    ];
  }

  if (product.category === 'mac') {
    const isPro = product.name.includes('Pro');
    const isAir = product.name.includes('Air');
    const isMini = product.name.includes('mini');
    const isStudio = product.name.includes('Studio');

    return [
      {
        groupName: 'Màn hình hiển thị',
        items: [
          { label: 'Công nghệ màn hình', value: isPro ? 'Liquid Retina XDR (Mini-LED, 1.000.000:1)' : (isAir ? 'Liquid Retina IPS' : 'Không kèm màn hình (Xuất màn hình ngoài)') },
          { label: 'Kích thước', value: isPro ? '14.2 inch hoặc 16.2 inch' : (isAir ? '13.6 inch hoặc 15.3 inch' : (isStudio ? 'Hỗ trợ tối đa 5 màn hình ngoài' : 'Hỗ trợ tối đa 3 màn hình ngoài')) },
          { label: 'Độ phân giải', value: isPro ? '3024 x 1964 Pixels (ProMotion 120Hz)' : '2560 x 1664 Pixels' },
          { label: 'Độ sáng', value: isPro ? '1000 nits liên tục • 1600 nits đỉnh HDR' : '500 nits' },
          { label: 'Tần số quét', value: isPro ? '120 Hz ProMotion thích ứng' : '60 Hz' },
        ],
      },
      {
        groupName: 'Bộ vi xử lý (CPU & GPU)',
        items: [
          { label: 'Chip xử lý (CPU)', value: isPro ? 'Apple M4 / M4 Pro / M4 Max (Lên đến 14 lõi hoặc 16 lõi)' : (isAir ? 'Apple M3 8 nhân' : (isMini ? 'Apple M4 10 nhân' : 'Apple M2 Max 12 nhân')) },
          { label: 'Chip đồ họa (GPU)', value: isPro ? 'Lên đến 20 lõi hoặc 40 lõi GPU (Dò tia Ray Tracing tốc độ cao phần cứng)' : 'Apple GPU 8 lõi hoặc 10 lõi' },
          { label: 'Neural Engine', value: '16 lõi Neural Engine thế hệ mới' },
          { label: 'Băng thông bộ nhớ', value: isPro ? '150 GB/s (M4 Pro) đến 546 GB/s (M4 Max)' : '100 GB/s Unified Memory' },
        ],
      },
      {
        groupName: 'Bộ nhớ & Lưu trữ',
        items: [
          { label: 'RAM Unified Memory', value: isPro ? '16 GB / 24 GB / 36 GB / 48 GB / 128 GB' : '16 GB / 24 GB' },
          { label: 'Ổ cứng SSD', value: '512 GB / 1 TB / 2 TB / 4 TB / 8 TB chuẩn NVMe tốc độ cao' },
        ],
      },
      {
        groupName: 'Cổng giao tiếp & Kết nối',
        items: [
          { label: 'Cổng Thunderbolt / USB-C', value: isPro ? '3x Thunderbolt 5 (Tốc độ truyền dữ liệu 120 Gb/s)' : '2x Thunderbolt / USB 4 (40 Gb/s)' },
          { label: 'Cổng xuất hình ảnh', value: isPro ? 'HDMI 2.1 (Hỗ trợ 8K 60Hz hoặc 4K 240Hz)' : 'Xuất tối đa 2 màn hình ngoài khi gập máy' },
          { label: 'Khe thẻ nhớ & Cổng sạc', value: isPro ? 'Khe thẻ nhớ SDXC, Cổng sạc MagSafe 3, Giắc tai nghe 3.5mm' : 'Cổng sạc MagSafe 3, Giắc cắm tai nghe 3.5mm' },
          { label: 'Không dây', value: 'Wi-Fi 6E (802.11ax), Bluetooth 5.3' },
        ],
      },
      {
        groupName: 'Bàn phím, Camera & Pin',
        items: [
          { label: 'Camera / Webcam', value: '12MP Center Stage với tính năng Desk View, quay video 1080p HD' },
          { label: 'Bàn phím', value: 'Magic Keyboard có đèn nền, Cảm biến vân tay Touch ID' },
          { label: 'Thời lượng pin', value: isPro ? 'Lên đến 24 giờ sử dụng liên tục (Kỷ lục dòng Mac)' : (isAir ? 'Lên đến 18 giờ làm việc' : 'Dùng nguồn điện trực tiếp') },
          { label: 'Trọng lượng & Kích thước', value: isPro ? '1.55 kg (14 inch) hoặc 2.14 kg (16 inch)' : (isAir ? 'Chỉ 1.24 kg • Dày 1.13 cm' : 'Chỉ 0.67 kg • Kích thước 12.7 x 12.7 cm') },
        ],
      },
    ];
  }

  // Watch
  const isUltra = product.name.includes('Ultra');
  const isS10 = product.name.includes('10');

  return [
    {
      groupName: 'Màn hình & Mặt kính',
      items: [
        { label: 'Công nghệ màn hình', value: isUltra ? 'OLED Retina Luôn Bật (Always-On)' : (isS10 ? 'Màn hình OLED góc rộng sáng hơn 40%' : 'OLED Retina Always-On') },
        { label: 'Kích thước mặt', value: isUltra ? '49 mm' : (isS10 ? '42 mm hoặc 46 mm' : '40 mm hoặc 44 mm') },
        { label: 'Độ sáng tối đa', value: isUltra ? '3000 nits đỉnh ngoài trời • 1 nit tối thiểu' : '2000 nits' },
        { label: 'Mặt kính', value: isUltra ? 'Mặt kính Sapphire phẳng chống trầy xước va đập' : 'Kính cường lực Ion-X hoặc Tinh thể Sapphire' },
      ],
    },
    {
      groupName: 'Bộ xử lý & Cảm biến sức khỏe',
      items: [
        { label: 'Vi xử lý', value: isS10 ? 'Apple S10 SiP (Lõi tứ Neural Engine)' : 'Apple S9 SiP' },
        { label: 'Bộ nhớ trong', value: '64 GB' },
        { label: 'Cảm biến sức khỏe', value: 'Cảnh báo ngưng thở khi ngủ (Sleep Apnea), Cảm biến đo điện tâm đồ (ECG), Cảm biến nồng độ oxy trong máu (SpO2), Cảm biến nhiệt độ nước và nhiệt độ cơ thể' },
        { label: 'Tính năng an toàn', value: 'Còi báo động SOS 86-decibel, Phát hiện ngã (Fall Detection), Phát hiện va chạm xe ô tô (Crash Detection)' },
      ],
    },
    {
      groupName: 'Pin & Sạc',
      items: [
        { label: 'Thời lượng pin', value: isUltra ? '36 giờ sử dụng bình thường • 72 giờ ở chế độ Tiết kiệm pin' : '18 giờ sử dụng cả ngày • 36 giờ chế độ Tiết kiệm pin' },
        { label: 'Công nghệ sạc', value: isS10 ? 'Sạc siêu nhanh: Đạt 80% pin chỉ trong 30 phút' : 'Sạc nhanh từ tính USB-C' },
      ],
    },
    {
      groupName: 'Độ bền & Kết nối',
      items: [
        { label: 'Chống nước', value: isUltra ? 'Chống nước 100m • Chứng nhận lặn quốc tế EN13319 đến độ sâu 40m' : 'Chống nước 50m (Chuẩn ISO 22810:2010)' },
        { label: 'Chất liệu khung vỏ', value: isUltra ? 'Titanium tự nhiên cấp hàng không vũ trụ' : 'Nhôm bóng Jet Black hoặc Titanium' },
        { label: 'Kết nối mạng', value: 'GPS tần số kép chuẩn xác, LTE 4G eSIM (tùy chọn phiên bản Cellular), Wi-Fi, Bluetooth 5.3' },
        { label: 'Tính năng cử chỉ', value: 'Thao tác Chạm Hai Lần (Double Tap) điều khiển bằng ngón tay' },
      ],
    },
  ];
}
