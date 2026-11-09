import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAdminSession } from '../../services/adminService';
export default function AdminGuard() {
  const [, refresh] = useState(0); const location = useLocation();
  useEffect(() => { const id = setInterval(() => refresh((v) => v + 1), 15000); return () => clearInterval(id); }, []);
  const user = getAdminSession();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (location.pathname.startsWith('/admin/admin-users') && user.role !== 'owner') return <Navigate to="/admin/403" replace />;
  return <Outlet />;
}
