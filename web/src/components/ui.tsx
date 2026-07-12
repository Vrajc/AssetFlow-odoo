import { motion } from 'framer-motion';
import { X, Loader2, Inbox, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PillStyle } from '../lib/status';

/* --------------------------------- Button --------------------------------- */
type BtnVariant = 'primary' | 'ghost' | 'danger' | 'outline' | 'subtle';
export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-primary text-bg hover:bg-primary-hover font-semibold',
    ghost: 'text-txt-muted hover:text-txt hover:bg-white/5',
    danger: 'bg-danger/90 text-white hover:bg-danger',
    outline: 'border border-border text-txt hover:bg-white/5',
    subtle: 'bg-white/5 text-txt hover:bg-white/10',
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------------------------- Card ---------------------------------- */
export function Card({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`rounded-2xl border border-border bg-surface shadow-soft ${className}`}>
      {children}
    </div>
  );
}

/* ---------------------------------- Pill ---------------------------------- */
export function Pill({ style, className = '' }: { style?: PillStyle; className?: string }) {
  if (!style) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}
      style={{ background: style.bg, color: style.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.dot }} />
      {style.label}
    </span>
  );
}

/* --------------------------------- Inputs --------------------------------- */
export function Input({ label, error, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-txt-muted">{label}</span>}
      <input
        {...props}
        className={`w-full rounded-lg border bg-elevated px-3 py-2 text-sm text-txt placeholder:text-txt-muted/60 focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

/** Password field with a show/hide eye toggle. */
export function PasswordInput({ label, error, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-txt-muted">{label}</span>}
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className={`w-full rounded-lg border bg-elevated px-3 py-2 pr-10 text-sm text-txt placeholder:text-txt-muted/60 focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-txt-muted transition-colors hover:text-txt"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-txt-muted">{label}</span>}
      <select
        {...props}
        className={`w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-txt focus:border-primary ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-txt-muted">{label}</span>}
      <textarea
        {...props}
        className={`w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-txt placeholder:text-txt-muted/60 focus:border-primary ${className}`}
      />
    </label>
  );
}

/* ---------------------------------- Modal --------------------------------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`glass relative z-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-t-2xl sm:rounded-2xl border border-border shadow-soft max-h-[92vh] overflow-y-auto`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-txt-muted hover:text-txt"><X size={18} /></button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}

/* -------------------------------- Skeleton -------------------------------- */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-white/5 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

/* ------------------------------- Empty state ------------------------------ */
export function EmptyState({ title, hint, icon, action }: { title: string; hint?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-2xl bg-white/5 p-4 text-txt-muted">{icon ?? <Inbox size={28} />}</div>
      <div>
        <p className="font-medium text-txt">{title}</p>
        {hint && <p className="mt-1 text-sm text-txt-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return <Loader2 className="animate-spin text-primary" size={22} />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-txt-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
