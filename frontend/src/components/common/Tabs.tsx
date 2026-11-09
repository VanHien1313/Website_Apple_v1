import { useId, type ReactNode } from 'react';
export interface TabItem { value: string; label: string; content: ReactNode }
export function Tabs({ items, value, onChange, label }: { items: TabItem[]; value: string; onChange: (value: string) => void; label: string }) {
  const id = useId();
  return <div><div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border-subtle">
    {items.map((item, index) => <button key={item.value} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1}
      className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold ${value === item.value ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}
      onClick={() => onChange(item.value)} onKeyDown={(event) => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % items.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else return;
        event.preventDefault(); onChange(items[next].value); document.getElementById(`${id}-tab-${next}`)?.focus();
      }}>{item.label}</button>)}
  </div>{items.map((item, index) => <div key={item.value} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={value !== item.value} className="pt-5">{item.content}</div>)}</div>;
}
