import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Truck, RefreshCw, CreditCard } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-subtle border-t border-border-subtle mt-20 text-xs text-secondary">
      {/* Trust Pillars */}
      <div className="border-b border-border-subtle py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1e] dark:border dark:border-white/10 shadow-sm flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-accent stroke-[1.8]" />
            </div>
            <div>
              <div className="font-semibold text-primary text-sm">Chính Hãng 100%</div>
              <div>Bảo hành Apple toàn cầu</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1e] dark:border dark:border-white/10 shadow-sm flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-accent stroke-[1.8]" />
            </div>
            <div>
              <div className="font-semibold text-primary text-sm">Giao Hàng Miễn Phí</div>
              <div>Đơn hàng từ 10.000.000₫</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1e] dark:border dark:border-white/10 shadow-sm flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-accent stroke-[1.8]" />
            </div>
            <div>
              <div className="font-semibold text-primary text-sm">1 Đổi 1 Trong 30 Ngày</div>
              <div>Khi có lỗi nhà sản xuất</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1e] dark:border dark:border-white/10 shadow-sm flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-accent stroke-[1.8]" />
            </div>
            <div>
              <div className="font-semibold text-primary text-sm">Trả Góp 0%</div>
              <div>Thủ tục nhanh chóng qua thẻ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Column 1: Categories */}
        <div className="space-y-3">
          <h4 className="font-bold text-primary text-sm">Sản Phẩm Apple</h4>
          <ul className="space-y-2">
            <li><Link to="/iphone" className="hover:text-primary transition-colors">iPhone 16 Series & Pro</Link></li>
            <li><Link to="/ipad" className="hover:text-primary transition-colors">iPad Pro M4 & iPad Air M2</Link></li>
            <li><Link to="/mac" className="hover:text-primary transition-colors">MacBook Pro & MacBook Air</Link></li>
            <li><Link to="/watch" className="hover:text-primary transition-colors">Apple Watch Ultra 2 & Series 10</Link></li>
          </ul>
        </div>

        {/* Column 2: Policies */}
        <div className="space-y-3">
          <h4 className="font-bold text-primary text-sm">Chính Sách & Hỗ Trợ</h4>
          <ul className="space-y-2">
            <li><span className="cursor-pointer hover:text-primary">Chính sách bảo hành ủy quyền</span></li>
            <li><span className="cursor-pointer hover:text-primary">Chính sách vận chuyển & giao nhận</span></li>
            <li><span className="cursor-pointer hover:text-primary">Chính sách đổi trả sản phẩm</span></li>
            <li><span className="cursor-pointer hover:text-primary">Bảo mật thông tin khách hàng</span></li>
          </ul>
        </div>

        {/* Column 3: Contact & Hours */}
        <div className="space-y-3">
          <h4 className="font-bold text-primary text-sm">Liên Hệ & Cửa Hàng</h4>
          <ul className="space-y-2">
            <li>Tổng đài mua hàng: <strong className="text-primary">1900.6868</strong></li>
            <li>Hỗ trợ kỹ thuật: <strong className="text-primary">1900.6869</strong></li>
            <li>Email: <span className="text-accent">support@aurastudio.vn</span></li>
            <li>Giờ mở cửa: 08:30 - 21:30 hàng ngày</li>
          </ul>
        </div>

        {/* Column 4: Academic Attribution */}
        <div className="space-y-3">
          <h4 className="font-bold text-primary text-sm">Về Dự Án</h4>
          <p className="leading-relaxed">
            Dự án Lập trình Web Đại học — Chuyên đề Thương mại Điện tử Thiết bị Apple.
          </p>
          <div className="pt-2">
            <span className="inline-block px-2.5 py-1 bg-white dark:bg-[#1c1c1e] border border-border-subtle rounded-md text-[11px] font-medium text-primary">
              Frontend-First Architecture
            </span>
          </div>
        </div>
      </div>

      {/* Certifications and APR Authority Strip */}
      <div className="border-t border-border-subtle py-5 bg-white/40 dark:bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1c1c1e] border border-border-subtle font-bold text-primary flex items-center gap-1.5 shadow-2xs">
              <span></span>
              <span>Apple Authorised Reseller</span>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1c1c1e] border border-border-subtle font-semibold text-secondary shadow-2xs">
              Aura Care — Apple Service Partner
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1c1c1e] border border-border-subtle font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs">
              ✓ Đã thông báo Bộ Công Thương
            </span>
          </div>

          <div className="text-secondary text-center sm:text-right">
            Hệ thống cửa hàng Apple Mono Store chuẩn quốc tế
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border-subtle py-6 text-center text-secondary/70">
        <div className="max-w-7xl mx-auto px-4">
          © {new Date().getFullYear()} Aura Apple Studio. All rights reserved. Apple, iPhone, iPad, Mac và Apple Watch là nhãn hiệu đã đăng ký của Apple Inc.
        </div>
      </div>
    </footer>
  );
};
