import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';

interface FieldProps { label: string; hint?: string; error?: string }
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return <p id={id} className="text-sm text-danger" role="alert">{children}</p>;
}
function Description({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return <>{hint && <p id={`${id}-hint`} className="text-sm text-secondary">{hint}</p>}{error && <FieldError id={`${id}-error`}>{error}</FieldError>}</>;
}
function describedBy(id: string, hint?: string, error?: string, extra?: string) {
  return [extra, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}
export function Input({ label, hint, error, id: providedId, className = '', ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-semibold">{label}{props.required && <span aria-hidden="true" className="text-danger"> *</span>}</label>
    <input {...props} id={id} className={`ui-input ${className}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={describedBy(id, hint, error, props['aria-describedby'])} />
    <Description id={id} hint={hint} error={error} />
  </div>;
}
export function Select({ label, hint, error, id: providedId, className = '', children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-semibold">{label}</label>
    <select {...props} id={id} className={`ui-input ${className}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={describedBy(id, hint, error, props['aria-describedby'])}>{children}</select>
    <Description id={id} hint={hint} error={error} />
  </div>;
}
type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode };
function Choice({ type, label, className = '', ...props }: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  return <label className={`flex min-h-11 items-center gap-3 text-sm ${props.disabled ? 'opacity-50' : 'cursor-pointer'}`}>
    <input {...props} type={type} className={`h-5 w-5 shrink-0 accent-accent ${className}`} /><span>{label}</span>
  </label>;
}
export const Checkbox = (props: ChoiceProps) => <Choice {...props} type="checkbox" />;
export const Radio = (props: ChoiceProps) => <Choice {...props} type="radio" />;
