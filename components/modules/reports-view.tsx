'use client';

import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FileSpreadsheet,
  MousePointerClick,
  Repeat,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import type {
  SubmissionRecord,
  ClickRecord,
  ConversionRecord,
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/crosx-logic';
import { DataTable } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { Checkbox } from '@/components/ui/controls';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportsViewProps {
  reportType: 'submission' | 'click' | 'conversion';
}

export function ReportsView({ reportType }: ReportsViewProps) {
  const {
    submissions,
    updateSubmissionStatus,
    clicks,
    conversions,
    updateConversionStatus,
    campaigns,
    settings,
    setActiveSection,
  } = useCrosXStore();

  const campaignOptions = useMemo(
    () =>
      campaigns.map((c) => ({
        label: `${c.id} · ${c.name}`,
        value: c.id,
      })),
    [campaigns]
  );

  const sourceOptions = [
    { label: 'pub_aff_northstar', value: 'pub_aff_northstar' },
    { label: 'pub_dev_syndicate', value: 'pub_dev_syndicate' },
    { label: 'pub_native_scale', value: 'pub_native_scale' },
    { label: 'pub_b2b_intent', value: 'pub_b2b_intent' },
    { label: 'pub_social_pulse', value: 'pub_social_pulse' },
  ];

  // Submission Columns
  const submissionColumns = useMemo<ColumnDef<SubmissionRecord>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all submissions"
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select submission ${row.original.id}`}
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'id',
        header: 'Submission ID',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {row.original.id}
          </span>
        ),
      },
      {
        accessorKey: 'campaignId',
        header: 'Campaign',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.campaignName}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {row.original.campaignId}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source / SubID',
        cell: ({ row }) => (
          <div className="font-mono text-xs">
            <div className="text-slate-700 dark:text-slate-200">{row.original.source}</div>
            <div className="text-[11px] text-slate-400">{row.original.subId}</div>
          </div>
        ),
      },
      {
        accessorKey: 'leadEmail',
        header: 'Lead Identifier',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-slate-700 dark:text-slate-300">
              {row.original.leadEmail}
            </div>
            <div className="text-[11px] text-slate-400">
              {row.original.country} · {row.original.device}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'payloadSummary',
        header: 'Schema Attributes',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {row.original.payloadSummary}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp (UTC)',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {row.original.timestamp.replace('T', ' ').replace('Z', '')}
          </span>
        ),
      },
    ],
    []
  );

  // Click Columns
  const clickColumns = useMemo<ColumnDef<ClickRecord>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all clicks"
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select click ${row.original.clickId}`}
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'clickId',
        header: 'Click Token',
        cell: ({ row }) => (
          <div>
            <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
              {row.original.clickId}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {row.original.id}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'campaignId',
        header: 'Campaign',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.campaignName}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {row.original.campaignId}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Publisher Source',
        cell: ({ row }) => (
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {row.original.source}
          </span>
        ),
      },
      {
        accessorKey: 'ipAddress',
        header: 'Client IP & Geo',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-slate-700 dark:text-slate-300">
              {row.original.ipAddress}
            </div>
            <div className="text-[11px] text-slate-400">{row.original.country}</div>
          </div>
        ),
      },
      {
        accessorKey: 'device',
        header: 'Device / OS',
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-300">
            {row.original.device} · {row.original.os}
          </span>
        ),
      },
      {
        accessorKey: 'latencyMs',
        header: 'Redirect Latency',
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
            {row.original.latencyMs}ms
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Traffic Quality',
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp (UTC)',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {row.original.timestamp.replace('T', ' ').replace('Z', '')}
          </span>
        ),
      },
    ],
    []
  );

  // Conversion Columns
  const conversionColumns = useMemo<ColumnDef<ConversionRecord>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all conversions"
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select conversion ${row.original.conversionId}`}
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'conversionId',
        header: 'Conversion / Click ID',
        cell: ({ row }) => (
          <div>
            <div className="font-mono font-semibold text-slate-900 dark:text-white">
              {row.original.conversionId}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              click: {row.original.clickId}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'campaignId',
        header: 'Campaign',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.campaignName}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {row.original.campaignId}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => (
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {row.original.source}
          </span>
        ),
      },
      {
        accessorKey: 'eventType',
        header: 'Conversion Event',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {row.original.eventType}
          </span>
        ),
      },
      {
        accessorKey: 'payout',
        header: 'Payout (INR)',
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <div>
              <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                {formatCurrency(rec.payout, rec.sourceCurrency, settings.exchangeRates)}
              </div>
              {rec.sourceCurrency !== 'INR' && (
                <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                  {rec.sourceCurrency} {rec.payout} @ ₹{rec.exchangeRateToInr}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'revenue',
        header: 'Revenue (INR)',
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(rec.revenue, rec.sourceCurrency, settings.exchangeRates)}
              </div>
              {rec.sourceCurrency !== 'INR' && (
                <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                  {rec.sourceCurrency} {rec.revenue} @ ₹{rec.exchangeRateToInr}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'postbackFired',
        header: 'S2S Callback',
        cell: ({ row }) =>
          row.original.postbackFired ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Dispatched
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" /> Queued
            </span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp (UTC)',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {row.original.timestamp.replace('T', ' ').replace('Z', '')}
          </span>
        ),
      },
    ],
    [settings.exchangeRates]
  );

  return (
    <div className="space-y-6">
      {/* Header + Report Type Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {reportType === 'submission' && 'Submission Telemetry Report'}
            {reportType === 'click' && 'Real-Time Click Stream Report'}
            {reportType === 'conversion' && 'Conversion Attribution Ledger (INR)'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Unified reporting engine with multi-facet filtering, INR-standardized financials, S2S status verification, and CSV export.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Report module switcher"
          className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-[#090D16]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={reportType === 'submission'}
            onClick={() => setActiveSection('reports-submission')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              reportType === 'submission'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Submission</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={reportType === 'click'}
            onClick={() => setActiveSection('reports-click')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              reportType === 'click'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            )}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            <span>Click</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={reportType === 'conversion'}
            onClick={() => setActiveSection('reports-conversion')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              reportType === 'conversion'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            )}
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>Conversion</span>
          </button>
        </div>
      </div>

      {/* Contextual Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Stream Records
          </div>
          <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
            {reportType === 'submission'
              ? submissions.length
              : reportType === 'click'
              ? clicks.length
              : conversions.length}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            Indexed in real-time partition shard
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Verified / Approved Ratio
          </div>
          <div className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {reportType === 'submission'
              ? `${Math.round(
                  (submissions.filter((s) => s.status === 'verified').length /
                    Math.max(1, submissions.length)) *
                    100
                )}%`
              : reportType === 'click'
              ? `${Math.round(
                  (clicks.filter((c) => c.status === 'unique').length /
                    Math.max(1, clicks.length)) *
                    100
                )}%`
              : `${Math.round(
                  (conversions.filter((c) => c.status === 'approved').length /
                    Math.max(1, conversions.length)) *
                    100
                )}%`}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            Passed automated fraud & schema checks
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            S2S Postback Sync Latency
          </div>
          <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
            16.4ms
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            p95 edge-to-partner delivery
          </div>
        </Card>
      </div>

      {/* Shared TanStack Table Architecture */}
      {reportType === 'submission' && (
        <DataTable
          data={submissions as unknown as Record<string, unknown>[]}
          columns={
            submissionColumns as unknown as ColumnDef<Record<string, unknown>, unknown>[]
          }
          searchPlaceholder="Search submission ID, email, source, or payload..."
          searchKeys={['id', 'campaignName', 'source', 'subId', 'leadEmail', 'payloadSummary']}
          dateKey="timestamp"
          exportFilename="crosx-submissions-report.csv"
          facets={[
            { key: 'campaignId', label: 'Campaign', options: campaignOptions },
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Verified', value: 'verified' },
                { label: 'Pending', value: 'pending' },
                { label: 'Rejected', value: 'rejected' },
              ],
            },
            { key: 'source', label: 'Source', options: sourceOptions },
          ]}
          bulkActions={[
            {
              label: 'Mark Verified',
              variant: 'default',
              onExecute: (rows, clear) => {
                updateSubmissionStatus(
                  rows.map((r) => String(r.id)),
                  'verified'
                );
                toast.success(`Verified ${rows.length} submission(s)`);
                clear();
              },
            },
            {
              label: 'Reject Selected',
              variant: 'destructive',
              onExecute: (rows, clear) => {
                updateSubmissionStatus(
                  rows.map((r) => String(r.id)),
                  'rejected'
                );
                toast.success(`Rejected ${rows.length} submission(s)`);
                clear();
              },
            },
          ]}
        />
      )}

      {reportType === 'click' && (
        <DataTable
          data={clicks as unknown as Record<string, unknown>[]}
          columns={
            clickColumns as unknown as ColumnDef<Record<string, unknown>, unknown>[]
          }
          searchPlaceholder="Search click_id, IP address, OS, or source..."
          searchKeys={['clickId', 'id', 'campaignName', 'source', 'ipAddress', 'country']}
          dateKey="timestamp"
          exportFilename="crosx-clicks-report.csv"
          facets={[
            { key: 'campaignId', label: 'Campaign', options: campaignOptions },
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Unique', value: 'unique' },
                { label: 'Duplicate', value: 'duplicate' },
                { label: 'Filtered', value: 'filtered' },
              ],
            },
            { key: 'source', label: 'Source', options: sourceOptions },
          ]}
        />
      )}

      {reportType === 'conversion' && (
        <DataTable
          data={conversions as unknown as Record<string, unknown>[]}
          columns={
            conversionColumns as unknown as ColumnDef<Record<string, unknown>, unknown>[]
          }
          searchPlaceholder="Search conversion_id, click_id, event, or source..."
          searchKeys={['conversionId', 'clickId', 'campaignName', 'source', 'eventType']}
          dateKey="timestamp"
          exportFilename="crosx-conversions-report-inr.csv"
          facets={[
            { key: 'campaignId', label: 'Campaign', options: campaignOptions },
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Approved', value: 'approved' },
                { label: 'Pending', value: 'pending' },
                { label: 'Chargeback', value: 'chargeback' },
              ],
            },
            { key: 'source', label: 'Source', options: sourceOptions },
          ]}
          bulkActions={[
            {
              label: 'Approve Conversions',
              variant: 'default',
              onExecute: (rows, clear) => {
                updateConversionStatus(
                  rows.map((r) => String(r.id)),
                  'approved'
                );
                toast.success(`Approved ${rows.length} conversion(s)`);
                clear();
              },
            },
            {
              label: 'Mark Chargeback',
              variant: 'destructive',
              onExecute: (rows, clear) => {
                updateConversionStatus(
                  rows.map((r) => String(r.id)),
                  'chargeback'
                );
                toast.success(`Flagged ${rows.length} conversion(s) as chargeback`);
                clear();
              },
            },
          ]}
        />
      )}
    </div>
  );
}
