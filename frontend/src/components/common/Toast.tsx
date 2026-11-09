import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { X, CircleCheck } from 'lucide-react';
const ToastContext = createContext<((message: string) => void) | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<{ id: string; text: string }[]>([]);
  const notify = useCallback((text: string) => setMessages((previous) => [...previous.slice(-2), { id: crypto.randomUUID(), text }]), []);
  return <ToastContext.Provider value={notify}>{children}
    <div aria-live="polite" aria-relevant="additions" className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {messages.map((message) => <div key={message.id} className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-4 shadow-dropdown">
        <CircleCheck className="mt-1 h-5 w-5 shrink-0 text-success" aria-hidden="true" /><p className="min-w-0 flex-1 break-words text-sm leading-relaxed">{message.text}</p>
        <button className="ui-icon-button -m-2" type="button" aria-label="Đóng thông báo" onClick={() => setMessages((previous) => previous.filter((item) => item.id !== message.id))}><X size={16} aria-hidden="true" /></button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}
export function useToast() { const notify = useContext(ToastContext); if (!notify) throw new Error('useToast requires ToastProvider'); return notify; }
