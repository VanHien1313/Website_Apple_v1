export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-surface-subtle motion-safe:animate-pulse ${className}`} />;
}
