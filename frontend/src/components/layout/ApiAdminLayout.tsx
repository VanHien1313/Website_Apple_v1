import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LayoutDashboard, Package, Shapes, ShoppingBag, Users, ChartNoAxesCombined, ShieldCheck, ImagePlus, LogOut, ArrowUpRight } from 'lucide-react';
import { request, HttpError } from '../../services/api/http';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { AsyncState } from '../common/AsyncState';
import { Drawer } from '../common/Overlay';
import { ThemeToggle } from '../common/ThemeToggle';
export interface AdminProfile { name: string; email: string; role: string }
const links = [
  { to:'/admin',label:'Tổng quan',icon:LayoutDashboard },{ to:'/admin/products',label:'Sản phẩm',icon:Package },{ to:'/admin/categories',label:'Danh mục',icon:Shapes },{ to:'/admin/orders',label:'Đơn hàng',icon:ShoppingBag },{ to:'/admin/customers',label:'Khách hàng',icon:Users },{ to:'/admin/reports',label:'Doanh thu',icon:ChartNoAxesCombined },{ to:'/admin/media',label:'Ảnh sản phẩm',icon:ImagePlus },{ to:'/admin/security',label:'Bảo mật',icon:ShieldCheck },
];
export default function ApiAdminLayout() {
  const location=useLocation(),navigate=useNavigate();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
  const load=useCallback((signal:AbortSignal)=>request<AdminProfile>('/admin/auth/me',{signal}),[location.key]);
  const {data,loading,error,retry}=useAsyncResource(load);
  useEffect(()=>{setOpen(false);window.scrollTo(0,0);},[location.pathname]);
  if(error instanceof HttpError && error.status===401)return <Navigate to="/admin/login" replace />;
  if(loading||error||!data)return <AsyncState error={error} onRetry={retry}/>;
  const entries=[...links,...(data.role==='owner'?[{to:'/admin/users',label:'Đội ngũ quản trị',icon:Users}]:[])];
  const navigation=<nav aria-label="Điều hướng quản trị" className="admin-navigation">{entries.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/admin'} onClick={()=>setOpen(false)} className={({isActive})=>isActive?'is-active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>;
  const identity=<div className="admin-sidebar-account"><div className="admin-identity-row"><span className="admin-avatar">{data.name.trim().slice(0,1).toUpperCase()}</span><div><strong>{data.name}</strong><small>{data.role==='owner'?'Chủ cửa hàng':'Biên tập viên'}</small></div></div><button disabled={busy} onClick={async()=>{setBusy(true);try{await request('/admin/auth/logout',{method:'POST'});navigate('/admin/login',{replace:true});}catch(e){setFailure((e as Error).message);}finally{setBusy(false);}}}><LogOut size={16}/>{busy?'Đang đăng xuất…':'Đăng xuất'}</button>{failure&&<p role="alert" className="text-danger text-xs">{failure}</p>}</div>;
  return <div className="admin-workspace"><a href="#admin-content" className="ui-skip-link">Đến nội dung quản trị</a><header className="admin-topbar"><div className="flex items-center gap-3"><button className="ui-icon-button lg:hidden" aria-label="Mở menu quản trị" aria-haspopup="dialog" onClick={()=>setOpen(true)}><Menu size={21}/></button><Link to="/admin" className="admin-brand">Aura<span>.</span></Link><span className="admin-brand-label">KHÔNG GIAN QUẢN TRỊ</span></div><div className="flex items-center gap-2"><ThemeToggle/><Link to="/" className="admin-store-link">Về cửa hàng<ArrowUpRight size={16}/></Link></div></header><div className="admin-workspace-grid"><aside className="admin-sidebar"><p className="admin-nav-caption">ĐIỀU HÀNH CỬA HÀNG</p>{navigation}{identity}</aside><main id="admin-content" tabIndex={-1} className="admin-main"><Outlet context={data}/></main></div><Drawer open={open} onClose={()=>setOpen(false)} side="left" title="Quản trị Aura">{navigation}{identity}</Drawer></div>;
}
