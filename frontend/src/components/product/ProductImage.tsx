import { useState } from 'react';
import { ImageOff } from 'lucide-react';
interface Props { src: string; fallback?: string; alt: string; className?: string; eager?: boolean }
function ImageContent({ src, fallback, alt, className = '', eager = false }: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const current = [src, fallback].find((url) => url && !failed.includes(url));
  return <div className={`flex items-center justify-center overflow-hidden rounded-lg bg-white ${className}`}>
    {current ? <img src={current} alt={alt} width={650} height={650} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed((previous) => [...previous, current])} className="h-full w-full object-contain p-3" />
      : <div role="img" aria-label={`${alt}: chưa có ảnh`} className="flex flex-col items-center gap-2 p-4 text-center text-xs text-slate-500"><ImageOff size={26} aria-hidden="true" /><span>Ảnh đang cập nhật</span></div>}
  </div>;
}
export function ProductImage(props: Props) { return <ImageContent key={`${props.src}|${props.fallback}`} {...props} />; }
