import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
    default:
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300',
    info:
      'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-400',
    success:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400',
    warning:
      'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400',
    danger:
      'border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400',
    neutral:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-tight',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
