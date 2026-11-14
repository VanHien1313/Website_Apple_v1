import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { X, CircleCheck, ArrowRight } from 'lucide-react';
type ToastAction = { label: string; to: string };
type ToastMessage = { id: string; text: string; action?: ToastAction };
const ToastContext = createContext<((message: string, action?: ToastAction) => void) | null>(null);
function ToastItem({ message, dismiss }: { message: ToastMessage; dismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(message.id), 4000);
    return () => window.clearTimeout(timer);
  }, [message.id, dismiss]);
  return <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-4 shadow-dropdown">
    <CircleCheck className="mt-1 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
    <div className="min-w-0 flex-1"><p className="break-words text-sm leading-relaxed">{message.text}</p>
      {message.action && <Link to={message.action.to} onClick={() => dismiss(message.id)} className="mt-1 inline-flex min-h-9 items-center gap-2 rounded text-sm font-semibold text-accent hover:underline">{message.action.label}<ArrowRight size={15} aria-hidden="true" /></Link>}
    </div>
    <button className="ui-icon-button -m-2" type="button" aria-label="Đóng thông báo" onClick={() => dismiss(message.id)}><X size={16} aria-hidden="true" /></button>
  </div>;
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const dismiss = useCallback((id: string) => setMessages(previous => previous.filter(item => item.id !== id)), []);
  const notify = useCallback((text: string, action?: ToastAction) => setMessages((previous) => [...previous.slice(-2), { id: crypto.randomUUID(), text, action }]), []);
  return <ToastContext.Provider value={notify}>{children}
    <div aria-live="polite" aria-relevant="additions" className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {messages.map((message) => <ToastItem key={message.id} message={message} dismiss={dismiss} />)}
    </div>
  </ToastContext.Provider>;
}
export function useToast() { const notify = useContext(ToastContext); if (!notify) throw new Error('useToast requires ToastProvider'); return notify; }
