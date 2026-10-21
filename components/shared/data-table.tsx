'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  Search,
  SlidersHorizontal,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  RefreshCw,
  Calendar,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/controls';
import { filterRecordsByQueryAndFacets } from '@/lib/crosx-logic';
import { useCrosXStore } from '@/lib/store-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface FacetFilterConfig<T> {
  key: keyof T;
  label: string;
  options: { label: string; value: string }[];
}

export interface BulkActionConfig<T> {
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  onExecute: (selectedRows: T[], clearSelection: () => void) => void;
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  searchKeys: (keyof T)[];
  facets?: FacetFilterConfig<T>[];
  dateKey?: keyof T;
  bulkActions?: BulkActionConfig<T>[];
  exportFilename?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  enableStateSimulation?: boolean;
}

const DATE_PRESET_OPTIONS = [
  { label: 'All Dates', value: 'all' },
  { label: 'Last 24 Hours', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
];

const PAGE_SIZE_OPTIONS = [
  { label: '5 / page', value: '5' },
  { label: '10 / page', value: '10' },
  { label: '20 / page', value: '20' },
  { label: '50 / page', value: '50' },
];

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchPlaceholder = 'Filter records...',
  searchKeys,
  facets = [],
  dateKey,
  bulkActions = [],
  exportFilename = 'crosx-export.csv',
  emptyTitle = 'No matching records found',
  emptyDescription = 'Adjust your active filters or search query to view records.',
  onEmptyAction,
  emptyActionLabel = 'Reset Filters',
  enableStateSimulation = true,
}: DataTableProps<T>) {
  const { settings } = useCrosXStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFacets, setActiveFacets] = useState<Partial<Record<keyof T, string>>>({});
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | '90d'>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [simulatedState, setSimulatedState] = useState<'normal' | 'loading' | 'empty' | 'error'>('normal');

  const filteredData = useMemo(() => {
    if (simulatedState === 'empty') return [];
    return filterRecordsByQueryAndFacets(data, {
      searchQuery,
      searchKeys,
      facets: activeFacets,
      dateKey,
      datePreset,
    });
  }, [data, searchQuery, searchKeys, activeFacets, dateKey, datePreset, simulatedState]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    datePreset !== 'all' ||
    Object.values(activeFacets).some((v) => v && v !== 'all');

  const resetAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setActiveFacets({});
    setSimulatedState('normal');
  };

  const handleExportCsv = () => {
    const rowsToExport = selectedRows.length > 0 ? selectedRows : filteredData;
    if (rowsToExport.length === 0) {
      toast.error('No records available to export');
      return;
    }
    const headers = Object.keys(rowsToExport[0]);
    const csvLines = [
      headers.join(','),
      ...rowsToExport.map((row) =>
        headers
          .map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${rowsToExport.length} records (INR standardized) to ${exportFilename}`);
  };

  return (
    <div className="space-y-3">
      {/* Filter & Controls Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {dateKey && (
            <div className="w-auto min-w-[148px]">
              <ThemedSelect
                ariaLabel="Date range filter"
                value={datePreset}
                onValueChange={(val) =>
                  setDatePreset(val as 'all' | 'today' | '7d' | '30d' | '90d')
                }
                options={DATE_PRESET_OPTIONS}
                prefixIcon={<Calendar className="h-3.5 w-3.5" />}
                searchable={false}
                triggerClassName="h-9 text-xs"
              />
            </div>
          )}

          {facets.map((facet) => (
            <div key={String(facet.key)} className="w-auto min-w-[145px]">
              <ThemedSelect
                ariaLabel={`Filter by ${facet.label}`}
                prefixLabel={facet.label}
                value={activeFacets[facet.key] ?? 'all'}
                onValueChange={(val) =>
                  setActiveFacets((prev) => ({
                    ...prev,
                    [facet.key]: val,
                  }))
                }
                options={[{ label: 'All', value: 'all' }, ...facet.options]}
                triggerClassName="h-9 text-xs"
              />
            </div>
          ))}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {enableStateSimulation && (
            <div
              role="group"
              aria-label="View state mode"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-[#090D16]"
            >
              {(['normal', 'loading', 'empty', 'error'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSimulatedState(mode)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors cursor-pointer whitespace-nowrap',
                    simulatedState === mode
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {mode === 'normal' ? 'Live Data' : mode}
                </button>
              ))}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(val) => column.toggleVisibility(!!val)}
                  >
                    {column.id.replace(/([A-Z])/g, ' $1').trim()}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2.5 dark:bg-blue-500/10">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
            <span className="font-mono font-semibold tabular-nums">
              {selectedRows.length}
            </span>
            <span>row{selectedRows.length > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.variant ?? 'default'}
                onClick={() => action.onExecute(selectedRows, () => setRowSelection({}))}
                className="h-7 text-xs"
              >
                {action.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
              className="h-7 text-xs"
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {/* Table Surface */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800/90 dark:bg-[#0F1623]">
        {simulatedState === 'error' ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Attribution Telemetry Stream Interrupted
            </h4>
            <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              Unable to synchronize partition shard from the regional read replica. Verify your network status or retry the query.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulatedState('normal')}
              className="mt-4"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Query</span>
            </Button>
          </div>
        ) : simulatedState === 'loading' ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            <div className="grid grid-cols-6 gap-4 bg-slate-50/70 px-4 py-3 dark:bg-[#090D16]/60">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3.5 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, rIdx) => (
              <div
                key={rIdx}
                className="grid grid-cols-6 gap-4 px-4 py-3.5 items-center"
              >
                {Array.from({ length: 6 }).map((__, cIdx) => (
                  <div
                    key={cIdx}
                    className="h-4 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Inbox className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {emptyTitle}
            </h4>
            <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              {emptyDescription}
            </p>
            {(hasActiveFilters || simulatedState === 'empty' || onEmptyAction) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (hasActiveFilters || simulatedState === 'empty') {
                    resetAllFilters();
                  } else if (onEmptyAction) {
                    onEmptyAction();
                  }
                }}
                className="mt-4"
              >
                {hasActiveFilters || simulatedState === 'empty'
                  ? 'Reset All Filters'
                  : emptyActionLabel}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800/90 dark:bg-[#090D16]/60"
                  >
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className="h-10 px-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap select-none"
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              <span>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/70">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      'transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/40 data-[state=selected]:bg-blue-50/60 dark:data-[state=selected]:bg-blue-950/30',
                      settings.compactTableDensity ? 'h-9' : 'h-11'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-4 align-middle whitespace-nowrap',
                          settings.compactTableDensity ? 'py-1.5' : 'py-2.5'
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {simulatedState === 'normal' && table.getRowModel().rows.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/90 dark:bg-[#090D16]/40">
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Showing{' '}
              <span className="font-medium text-slate-900 dark:text-slate-200">
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-slate-900 dark:text-slate-200">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  filteredData.length
                )}
              </span>{' '}
              of{' '}
              <span className="font-medium text-slate-900 dark:text-slate-200">
                {filteredData.length}
              </span>{' '}
              records
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Rows:</span>
                <div className="w-28">
                  <ThemedSelect
                    ariaLabel="Rows per page"
                    size="sm"
                    searchable={false}
                    value={String(table.getState().pagination.pageSize)}
                    onValueChange={(val) => table.setPageSize(Number(val))}
                    options={PAGE_SIZE_OPTIONS}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous page"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {Math.max(1, table.getPageCount())}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next page"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
