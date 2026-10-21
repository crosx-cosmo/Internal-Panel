import React from 'react';
import { cn } from '@/lib/utils';

interface CrosXLogoProps {
  className?: string;
  compact?: boolean;
}

export function CrosXLogo({ className, compact = false }: CrosXLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none shrink-0', className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
        <span className="font-mono text-sm font-bold tracking-tighter">CX</span>
      </div>
      {!compact && (
        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
          CrosX
        </span>
      )}
    </div>
  );
}
