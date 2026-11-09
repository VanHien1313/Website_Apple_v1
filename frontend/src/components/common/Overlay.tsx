import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface OverlayProps { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }
let scrollLocks = 0;
let previousOverflow = '';
function lockScroll() {
  if (scrollLocks++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
  return () => { if (--scrollLocks === 0) document.body.style.overflow = previousOverflow; };
}
function Overlay({ open, onClose, title, description, children, footer, placement }: OverlayProps & { placement: 'center' | 'left' | 'right' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const unlock = lockScroll();
    return () => { dialog.close(); unlock(); if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, [open]);
  return createPortal(<dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
    className={`ui-overlay ui-overlay-${placement}`}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]'))
        .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <div className="flex h-full max-h-[inherit] flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle p-5 sm:p-6">
        <div><h2 id={`${id}-title`} className="text-lg font-bold">{title}</h2>{description && <p id={`${id}-description`} className="mt-2 text-sm text-secondary">{description}</p>}</div>
        <button type="button" className="ui-icon-button shrink-0" onClick={onClose} aria-label={`Đóng ${title}`} autoFocus><X size={20} aria-hidden="true" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
      {footer && <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border-subtle p-5 sm:p-6">{footer}</div>}
    </div>
  </dialog>, document.body);
}
export function Dialog(props: OverlayProps) { return <Overlay {...props} placement="center" />; }
export function Drawer({ side = 'right', ...props }: OverlayProps & { side?: 'left' | 'right' }) { return <Overlay {...props} placement={side} />; }
