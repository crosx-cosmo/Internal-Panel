import React from 'react';
import { CheckCircle2, Clock, PauseCircle, AlertTriangle, XCircle, FileEdit, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusValue =
  | 'active'
  | 'paused'
  | 'testing'
  | 'flagged'
  | 'draft'
  | 'completed'
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'unique'
  | 'duplicate'
  | 'filtered'
  | 'approved'
  | 'chargeback'
  | 'disabled'
  | 'revoked'
  | 'archived';

interface StatusIndicatorProps {
  status: StatusValue;
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config: Record<
    StatusValue,
    { label: string; colorClass: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    active: {
      label: 'Active',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      Icon: CheckCircle2,
    },
    testing: {
      label: 'Testing',
      colorClass: 'text-blue-600 dark:text-blue-400',
      Icon: Clock,
    },
    flagged: {
      label: 'Flagged',
      colorClass: 'text-red-600 dark:text-red-400',
      Icon: AlertTriangle,
    },
    verified: {
      label: 'Verified',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      Icon: CheckCircle2,
    },
    approved: {
      label: 'Approved',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      Icon: CheckCircle2,
    },
    unique: {
      label: 'Unique',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      Icon: CheckCircle2,
    },
    paused: {
      label: 'Paused',
      colorClass: 'text-amber-600 dark:text-amber-400',
      Icon: PauseCircle,
    },
    pending: {
      label: 'Pending',
      colorClass: 'text-amber-600 dark:text-amber-400',
      Icon: Clock,
    },
    duplicate: {
      label: 'Duplicate',
      colorClass: 'text-amber-600 dark:text-amber-400',
      Icon: AlertTriangle,
    },
    draft: {
      label: 'Draft',
      colorClass: 'text-slate-600 dark:text-slate-400',
      Icon: FileEdit,
    },
    completed: {
      label: 'Completed',
      colorClass: 'text-blue-600 dark:text-blue-400',
      Icon: CheckCircle2,
    },
    archived: {
      label: 'Archived',
      colorClass: 'text-slate-500 dark:text-slate-400',
      Icon: Archive,
    },
    disabled: {
      label: 'Disabled',
      colorClass: 'text-slate-500 dark:text-slate-400',
      Icon: PauseCircle,
    },
    rejected: {
      label: 'Rejected',
      colorClass: 'text-red-600 dark:text-red-400',
      Icon: XCircle,
    },
    filtered: {
      label: 'Filtered',
      colorClass: 'text-red-600 dark:text-red-400',
      Icon: XCircle,
    },
    chargeback: {
      label: 'Chargeback',
      colorClass: 'text-red-600 dark:text-red-400',
      Icon: XCircle,
    },
    revoked: {
      label: 'Revoked',
      colorClass: 'text-red-600 dark:text-red-400',
      Icon: XCircle,
    },
  };

  const entry = config[status] || config.draft;
  const Icon = entry.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap',
        entry.colorClass,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{entry.label}</span>
    </span>
  );
}
