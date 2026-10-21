'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  badge?: string;
}

export interface ThemedSelectProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  prefixLabel?: string;
  prefixIcon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
  triggerClassName?: string;
}

export function ThemedSelect({
  id,
  ariaLabel,
  value,
  onValueChange,
  options,
  placeholder = 'Select option...',
  prefixLabel,
  prefixIcon,
  searchable,
  searchPlaceholder = 'Search options...',
  disabled = false,
  size = 'default',
  className,
  triggerClassName,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const shouldShowSearch = searchable ?? options.length > 5;

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
      if (shouldShowSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 10);
      }
    }
  }, [open, options, value, shouldShowSearch]);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setFocusedIndex((prev) =>
          filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setFocusedIndex((prev) =>
          filteredOptions.length > 0
            ? (prev - 1 + filteredOptions.length) % filteredOptions.length
            : 0
        );
      }
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const target = filteredOptions[focusedIndex];
      if (target) {
        handleSelect(target.value);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel || prefixLabel || placeholder}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className={cn(
            'group inline-flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white text-left font-medium text-slate-900 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/80 cursor-pointer whitespace-nowrap',
            size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs sm:text-sm',
            triggerClassName,
            className
          )}
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            {prefixIcon && (
              <span className="text-slate-400 dark:text-slate-500 shrink-0">
                {prefixIcon}
              </span>
            )}
            {prefixLabel && (
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 shrink-0">
                {prefixLabel}:
              </span>
            )}
            <span
              className={cn(
                'truncate',
                selectedOption
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.badge && (
              <span className="hidden sm:inline-flex shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {selectedOption.badge}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300',
              open && 'rotate-180 text-blue-600 dark:text-blue-400'
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={5}
          collisionPadding={12}
          onKeyDown={handleKeyDown}
          className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[calc(100vw-1.5rem)] sm:max-w-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-slate-900 shadow-xl duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-slate-800 dark:bg-[#0F1623] dark:text-slate-100"
        >
          {shouldShowSearch && (
            <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-1.5 dark:border-slate-800/80">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
              />
            </div>
          )}

          <div
            role="listbox"
            aria-label={ariaLabel || prefixLabel || placeholder}
            className="max-h-64 overflow-y-auto py-0.5 space-y-0.5"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isFocused = idx === focusedIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-blue-50/90 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : isFocused
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{opt.label}</span>
                        {opt.badge && (
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-normal text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <div className="mt-0.5 truncate text-[10px] font-normal text-slate-400 dark:text-slate-500">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
