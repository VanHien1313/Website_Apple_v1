import React from 'react';
import { ShieldCheck, Truck, RotateCcw } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="bg-[#070c16] text-white/80 text-[11px] sm:text-xs py-2 px-4 border-b border-white/[0.06] transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 font-normal tracking-tight">
        {/* Core claim */}
        <div className="flex items-center gap-1.5 mx-auto md:mx-0">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-light shrink-0" />
          <span className="font-medium text-white">Đại lý Ủy quyền Apple Chính Thức tại Việt Nam</span>
        </div>

        {/* Desktop supporting pillars */}
        <div className="hidden md:flex items-center gap-6 text-white/70">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span>Miễn phí giao hàng từ 10.000.000₫</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>30 ngày 1 đổi 1 lỗi nhà sản xuất</span>
          </div>
          <span className="text-white/20">|</span>
          <span className="text-white font-semibold">Hotline: 1900.6868</span>
        </div>
      </div>
    </div>
  );
};
