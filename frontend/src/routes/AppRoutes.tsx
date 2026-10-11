import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { HomePage } from '../pages/HomePage';
import { CategoryPage } from '../pages/CategoryPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />

        {/* 4 Core Category Routes */}
        <Route
          path="iphone"
          element={
            <CategoryPage
              category="iphone"
              title="iPhone Chính Hãng"
              description="Khám phá dòng iPhone 16 Pro Max, iPhone 16 Pro và các thế hệ mới nhất với chế độ bảo hành chính hãng Apple 12 tháng."
            />
          }
        />
        <Route
          path="ipad"
          element={
            <CategoryPage
              category="ipad"
              title="iPad & Phụ Kiện Sáng Tạo"
              description="Sức mạnh đỉnh cao từ iPad Pro chip M4 siêu mỏng đến iPad Air M2 đa năng cho công việc và học tập."
            />
          }
        />
        <Route
          path="mac"
          element={
            <CategoryPage
              category="mac"
              title="Mac & Hệ Sinh Thái Apple Silicon"
              description="Hiệu năng bứt phá, thời lượng pin cả ngày dài với MacBook Air M3, MacBook Pro M4 và Mac mini nhỏ gọn."
            />
          }
        />
        <Route
          path="watch"
          element={
            <CategoryPage
              category="watch"
              title="Apple Watch Thông Minh"
              description="Thiết bị chăm sóc sức khỏe, theo dõi luyện tập và an toàn hàng đầu thế giới: Apple Watch Ultra 2, Series 10 và SE."
            />
          }
        />

        {/* Dynamic Product Detail Route */}
        <Route path="product/:slug" element={<ProductDetailPage />} />

        {/* Commerce Routes */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
