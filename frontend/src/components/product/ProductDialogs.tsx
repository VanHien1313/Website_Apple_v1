import { Dialog } from '../common/Overlay';
import type { Product } from '../../types/product';
import { ProductImage } from './ProductImage';
interface ModalProps { open: boolean; onClose: () => void }
export function ProductSpecsDialog({ open, onClose, product }: ModalProps & { product: Product }) {
  return <Dialog open={open} onClose={onClose} title={`Thông số: ${product.name}`}><div className="space-y-6">{(product.detailedSpecs ?? [{ groupName: 'Thông số sản phẩm', items: product.keySpecs }]).map((group) => <section key={group.groupName}><h3 className="mb-3 text-sm font-bold text-accent">{group.groupName}</h3><dl className="divide-y divide-border-subtle rounded-lg border border-border-subtle">{group.items.map((item) => <div key={item.label} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_2fr]"><dt className="text-secondary">{item.label}</dt><dd className="break-words leading-relaxed">{item.value}</dd></div>)}</dl></section>)}</div></Dialog>;
}
export function ProductGalleryDialog({ open, onClose, name, images, activeImage, onSelect }: ModalProps & { name: string; images: string[]; activeImage: string; onSelect: (image: string) => void }) {
  return <Dialog open={open} onClose={onClose} title={name}><ProductImage src={activeImage} alt={name} className="aspect-square w-full" /><div className="mt-4 flex gap-3 overflow-x-auto p-1">{images.map((image, index) => <button key={image} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-pressed={image === activeImage} onClick={() => onSelect(image)} className={`h-16 w-16 shrink-0 rounded-md border p-1 ${image === activeImage ? 'border-accent' : 'border-border-subtle'}`}><ProductImage src={image} alt="" className="h-full w-full" /></button>)}</div></Dialog>;
}
