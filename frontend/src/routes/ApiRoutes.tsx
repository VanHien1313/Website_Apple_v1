import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { AsyncState } from '../components/common/AsyncState';

const Account = lazy(() => import('../pages/ApiAccountPage'));
const Home = lazy(() => import('../pages/ApiHomePage'));
const Cart = lazy(() => import('../pages/ApiCartPage'));
const Checkout = lazy(() => import('../pages/ApiCheckoutPage'));
const Confirmation = lazy(() => import('../pages/ApiOrderConfirmationPage'));
const Orders = lazy(() => import('../pages/ApiOrdersPage'));
const Reports = lazy(() => import('../pages/ApiReportsPage'));
const Categories = lazy(() => import('../pages/ApiCategoriesPage'));
const AdminUsers = lazy(() => import('../pages/ApiAdminUsersPage'));
const Customers = lazy(() => import('../pages/ApiCustomersPage'));
const Products = lazy(() => import('../pages/ApiProductsPage'));
const ProductEditor = lazy(() => import('../pages/ApiProductEditorPage'));
const Status = lazy(() => import('../pages/StatusPage'));
const AdminLayout = lazy(() => import('../components/layout/ApiAdminLayout'));
const Information = lazy(() => import('../pages/StoreInformationPage'));
const Category = lazy(() => import('../pages/CategoryPage').then((module) => ({ default: module.CategoryPage })));
const Product = lazy(() => import('../pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })));
const categories = [
  ['iphone', 'iPhone'], ['ipad', 'iPad'], ['mac', 'Mac'], ['watch', 'Apple Watch'],
] as const;

/** API-only route graph: never import demo screens or their browser repositories here. */
function LegacyProductLink() { const { id } = useParams(); return <Navigate to={`/admin/products/${encodeURIComponent(id ?? '')}`} replace />; }
export function AppRoutes() {
  return <Routes>
    <Route path="/admin/login" element={<Suspense fallback={<AsyncState />}><Account /></Suspense>} />
    <Route element={<Suspense fallback={<AsyncState />}><AdminLayout /></Suspense>}>
    <Route path="/admin" element={<Account />} />
    <Route path="/admin/customers" element={<Suspense fallback={<AsyncState />}><Customers /></Suspense>} />
    <Route path="/admin/customers/:id" element={<Suspense fallback={<AsyncState />}><Customers /></Suspense>} />
    <Route path="/admin/users" element={<Suspense fallback={<AsyncState />}><AdminUsers /></Suspense>} />
    <Route path="/admin/products" element={<Suspense fallback={<AsyncState />}><Products /></Suspense>} />
    <Route path="/admin/products/new" element={<Suspense fallback={<AsyncState />}><ProductEditor /></Suspense>} />
    <Route path="/admin/products/:id" element={<Suspense fallback={<AsyncState />}><ProductEditor /></Suspense>} />
    <Route path="/admin/categories" element={<Suspense fallback={<AsyncState />}><Categories /></Suspense>} />
    <Route path="/admin/reports" element={<Suspense fallback={<AsyncState />}><Reports /></Suspense>} />
    <Route path="/admin/orders" element={<Suspense fallback={<AsyncState />}><Orders admin /></Suspense>} />
    <Route path="/admin/orders/:id" element={<Suspense fallback={<AsyncState />}><Orders admin /></Suspense>} />
    <Route path="/admin/admin-users" element={<Navigate to="/admin/users" replace />} />
    <Route path="/admin/products/:id/edit" element={<LegacyProductLink />} />
    <Route path="/admin/*" element={<Status home="/admin" />} />
    </Route>
    <Route path="/" element={<Layout />}>
      <Route index element={<Home />} />
      {['login', 'register', 'account'].map((path) => <Route key={path} path={path} element={<Account />} />)}
      <Route path="account/security" element={<Navigate to="/account#security" replace />} />
      <Route path="about" element={<Information />} />
      <Route path="contact" element={<Information contact />} />
      <Route path="account/orders" element={<Orders />} />
      <Route path="account/orders/:id" element={<Orders />} />
      {categories.map(([id, name]) => <Route key={id} path={id} element={<Category category={id} title={name} description={`Khám phá ${name} theo cấu hình và ngân sách của bạn.`} />} />)}
      <Route path="search" element={<Category title="Kết quả tìm kiếm" description="Tìm sản phẩm trên toàn bộ danh mục Aura." />} />
      <Route path="product/:slug" element={<Product />} />
      <Route path="cart" element={<Cart />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="order-confirmation/:id" element={<Confirmation />} />
      <Route path="403" element={<Status status={403} />} />
      <Route path="*" element={<Status />} />
    </Route>
  </Routes>;
}
