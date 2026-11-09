import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { AsyncState } from '../components/common/AsyncState';
const AdminLayout = lazy(() => import('../components/layout/AdminLayout'));
const CustomerAuthPage = lazy(() => import('../pages/CustomerAuthPage'));
const AccountLayout = lazy(() => import('../pages/AccountLayout'));
const AccountOrdersPage = lazy(() => import('../pages/AccountOrdersPage'));
const AccountOrderDetailPage = lazy(() => import('../pages/AccountOrderDetailPage'));
const AccountSecurityPage = lazy(() => import('../pages/AccountSecurityPage'));
const AdminCustomersPage = lazy(() => import('../pages/admin/AdminCustomersPage'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('../pages/admin/AdminOrderDetailPage'));
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminGuard = lazy(() => import('../pages/admin/AdminGuard'));
const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage'));
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage'));
const AdminProductFormPage = lazy(() => import('../pages/admin/AdminProductFormPage'));
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminOverviewPage = lazy(() => import('../pages/admin/AdminOverviewPage'));
const DesignSystemPage = lazy(() => import('../pages/admin/DesignSystemPage'));
const StatusPage = lazy(() => import('../pages/StatusPage'));
const OrderConfirmationPage = lazy(() => import('../pages/OrderConfirmationPage'));
const HomePage = lazy(() => import('../pages/HomePage').then((module) => ({ default: module.HomePage })));
const CategoryPage = lazy(() => import('../pages/CategoryPage').then((module) => ({ default: module.CategoryPage })));
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })));
const CartPage = lazy(() => import('../pages/CartPage').then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/admin/login" element={<Suspense fallback={<AsyncState />}><AdminLoginPage /></Suspense>} />
      <Route element={<Suspense fallback={<AsyncState />}><AdminGuard /></Suspense>}>
      <Route path="/admin" element={<Suspense fallback={<AsyncState />}><AdminLayout /></Suspense>}>
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="customers/:id" element={<AdminCustomersPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:id/edit" element={<AdminProductFormPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="admin-users" element={<AdminUsersPage />} />
        <Route index element={<AdminOverviewPage />} />
        <Route path="design-system" element={<DesignSystemPage />} />
        <Route path="403" element={<StatusPage status={403} home="/admin" />} />
        <Route path="*" element={<StatusPage home="/admin" />} />
      </Route>
      </Route>
      <Route path="/" element={<Layout />}>
        <Route path="login" element={<CustomerAuthPage key="login" />} />
        <Route path="register" element={<CustomerAuthPage key="register" register />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<AccountOrdersPage />} />
          <Route path="orders/:id" element={<AccountOrderDetailPage />} />
          <Route path="security" element={<AccountSecurityPage />} />
        </Route>
        <Route index element={<HomePage />} />

        {/* 4 Core Category Routes */}
        <Route
          path="iphone"
          element={
            <CategoryPage
              category="iphone"
              title="iPhone"
              description="Chọn chiếc iPhone phù hợp với nhu cầu, cấu hình và ngân sách của bạn."
            />
          }
        />
        <Route
          path="ipad"
          element={
            <CategoryPage
              category="ipad"
              title="iPad"
              description="Sức mạnh đỉnh cao từ iPad Pro chip M4 siêu mỏng đến iPad Air M2 đa năng cho công việc và học tập."
            />
          }
        />
        <Route
          path="mac"
          element={
            <CategoryPage
              category="mac"
              title="Mac"
              description="Hiệu năng bứt phá, thời lượng pin cả ngày dài với MacBook Air M3, MacBook Pro M4 và Mac mini nhỏ gọn."
            />
          }
        />
        <Route
          path="watch"
          element={
            <CategoryPage
              category="watch"
              title="Apple Watch"
              description="Thiết bị chăm sóc sức khỏe, theo dõi luyện tập và an toàn hàng đầu thế giới: Apple Watch Ultra 2, Series 10 và SE."
            />
          }
        />

        <Route path="search" element={<CategoryPage title="Kết quả tìm kiếm" description="Tìm sản phẩm trên toàn bộ danh mục Aura." />} />

        {/* Dynamic Product Detail Route */}
        <Route path="product/:slug" element={<ProductDetailPage />} />

        {/* Commerce Routes */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation/:id" element={<OrderConfirmationPage />} />

        {/* Fallback */}
        <Route path="403" element={<StatusPage status={403} />} />
        <Route path="*" element={<StatusPage />} />
      </Route>
    </Routes>
  );
};
