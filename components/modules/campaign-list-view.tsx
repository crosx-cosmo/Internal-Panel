'use client';

import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  PlusCircle,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Pause,
  Play,
  Trash2,
  Sliders,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import {
  formatINR,
  formatCompactNumber,
  getCampaignRevenueInINR,
  getCampaignUnitPayoutInINR,
  getCampaignAdvertiserPayoutInINR,
  getCampaignReferralPayoutInINR,
  calculateProfitMargins,
  type CampaignRecord,
} from '@/lib/crosx-logic';
import { DataTable } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Checkbox,
} from '@/components/ui/controls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const EDIT_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Draft', value: 'draft' },
  { label: 'Completed', value: 'completed' },
];

export function CampaignListView() {
  const {
    campaigns,
    settings,
    updateCampaign,
    duplicateCampaign,
    deleteCampaign,
    setActiveSection,
    setEditingWizardCampaignId,
  } = useCrosXStore();

  const [viewingCampaign, setViewingCampaign] = useState<CampaignRecord | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRecord | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<CampaignRecord | null>(null);

  const columns = useMemo<ColumnDef<CampaignRecord>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all campaigns"
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${row.original.name}`}
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: 'Campaign & Offer ID',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-2.5">
              {c.logoAsset?.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logoAsset.dataUrl}
                  alt={c.name}
                  className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 font-mono text-[11px] font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  {(c.brand || c.name || 'CX').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {c.name}
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  {c.offerId || c.id} · {c.trackingMethod || 'S2S'} · {c.category}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'brand',
        header: 'Brand',
        cell: ({ row }) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {row.original.brand}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        accessorKey: 'clicks',
        header: 'Clicks',
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
            {formatCompactNumber(row.original.clicks)}
          </span>
        ),
      },
      {
        accessorKey: 'conversions',
        header: 'Conversions / Cap',
        cell: ({ row }) => {
          const c = row.original;
          const capLabel = c.unlimitedCap
            ? '∞'
            : formatCompactNumber(c.totalCap ?? c.dailyCap ?? 0);
          return (
            <div>
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                {formatCompactNumber(c.conversions)}
              </span>
              <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                {' '}
                / {capLabel}
              </span>
            </div>
          );
        },
      },
      {
        id: 'revenue',
        header: 'Revenue (INR)',
        accessorFn: (row) => getCampaignRevenueInINR(row, settings.exchangeRates),
        cell: ({ row }) => {
          const c = row.original;
          const revInr = getCampaignRevenueInINR(c, settings.exchangeRates);
          return (
            <div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatINR(revInr)}
              </div>
              {c.currency !== 'INR' && (
                <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                  {c.currency} {formatCompactNumber(c.revenue)} @ ₹{c.exchangeRateToInr}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'payoutAmount',
        header: 'Payout & Margin (INR)',
        accessorFn: (row) => getCampaignUnitPayoutInINR(row, settings.exchangeRates),
        cell: ({ row }) => {
          const c = row.original;
          const advInr = getCampaignAdvertiserPayoutInINR(c, settings.exchangeRates);
          const unitInr = getCampaignUnitPayoutInINR(c, settings.exchangeRates);
          const refInr = getCampaignReferralPayoutInINR(c, settings.exchangeRates);
          const margins = calculateProfitMargins(advInr, unitInr, refInr);
          return (
            <div>
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {c.payoutType} {formatINR(unitInr)}
              </span>
              <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                Adv: {formatINR(advInr)} ·{' '}
                <span
                  className={
                    margins.isNegativeGross
                      ? 'text-red-500 font-semibold'
                      : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  }
                >
                  {margins.isZeroAdvertiser ? 'N/A' : `${margins.grossMarginPercent}%`}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created Date',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {row.original.createdAt}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          const isActive = c.status === 'active';
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label={`View ${c.name}`}
                onClick={() => setViewingCampaign(c)}
                className="h-7 px-2 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${c.name}`}
                    className="h-7 w-7"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewingCampaign(c)}>
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingWizardCampaignId(c.id);
                      setActiveSection('campaign-create');
                    }}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Open in 6-Step Wizard V2</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingCampaign(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Quick Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const copy = duplicateCampaign(c.id);
                      if (copy) {
                        toast.success(
                          `Duplicated as ${copy.id} (Offer ID: ${copy.offerId})`
                        );
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Duplicate</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const nextStatus = isActive ? 'paused' : 'active';
                      updateCampaign(c.id, { status: nextStatus });
                      toast.success(
                        `Campaign ${c.id} ${nextStatus === 'active' ? 'resumed' : 'paused'}`
                      );
                    }}
                  >
                    {isActive ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause Campaign</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Resume Campaign</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeletingCampaign(c)}
                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      duplicateCampaign,
      updateCampaign,
      settings.exchangeRates,
      setEditingWizardCampaignId,
      setActiveSection,
    ]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            All Campaigns
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Manage active offers, Offer IDs, tracking protocols, INR-standardized payouts & margins, and total cap states.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingWizardCampaignId(null);
            setActiveSection('campaign-create');
          }}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Create Campaign</span>
        </Button>
      </div>

      <DataTable
        data={campaigns as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>, unknown>[]}
        searchPlaceholder="Search campaign name, Offer ID, brand, or vertical..."
        searchKeys={['name', 'id', 'offerId', 'brand', 'category', 'trackingMethod', 'payoutType']}
        dateKey="createdAt"
        exportFilename="crosx-campaigns-v2-inr.csv"
        facets={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Paused', value: 'paused' },
              { label: 'Draft', value: 'draft' },
              { label: 'Completed', value: 'completed' },
            ],
          },
          {
            key: 'trackingMethod',
            label: 'Method',
            options: [
              { label: 'S2S', value: 'S2S' },
              { label: 'GET', value: 'GET' },
              { label: 'Browser Pixel', value: 'Browser Pixel' },
              { label: 'CRM', value: 'CRM' },
              { label: 'Offer Code', value: 'Offer Code' },
            ],
          },
        ]}
        bulkActions={[
          {
            label: 'Pause Selected',
            variant: 'outline',
            onExecute: (rows, clear) => {
              rows.forEach((r) =>
                updateCampaign(String(r.id), { status: 'paused' })
              );
              toast.success(`Paused ${rows.length} campaign(s)`);
              clear();
            },
          },
          {
            label: 'Activate Selected',
            variant: 'default',
            onExecute: (rows, clear) => {
              rows.forEach((r) =>
                updateCampaign(String(r.id), { status: 'active' })
              );
              toast.success(`Activated ${rows.length} campaign(s)`);
              clear();
            },
          },
        ]}
      />

      {/* View Campaign Modal */}
      <Dialog
        open={!!viewingCampaign}
        onOpenChange={(open) => !open && setViewingCampaign(null)}
      >
        <DialogContent className="max-w-2xl">
          {viewingCampaign && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{viewingCampaign.name}</DialogTitle>
                  <Badge variant="info">{viewingCampaign.offerId || viewingCampaign.id}</Badge>
                  <Badge variant="neutral">{viewingCampaign.trackingMethod || 'S2S'}</Badge>
                </div>
                <DialogDescription>
                  {viewingCampaign.id} · {viewingCampaign.brand} · {viewingCampaign.category}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-4 dark:border-slate-800 dark:bg-[#090D16]">
                  <div>
                    <div className="text-[11px] text-slate-400">Status</div>
                    <div className="mt-1">
                      <StatusIndicator status={viewingCampaign.status} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Total Cap</div>
                    <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {viewingCampaign.unlimitedCap
                        ? 'Unlimited'
                        : formatCompactNumber(viewingCampaign.totalCap ?? viewingCampaign.dailyCap)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Conversions</div>
                    <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatCompactNumber(viewingCampaign.conversions)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Revenue (INR)</div>
                    <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(getCampaignRevenueInINR(viewingCampaign, settings.exchangeRates))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Tracking URL ({viewingCampaign.trackingMethod || 'S2S'})
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700 break-all dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-300">
                    {viewingCampaign.trackingUrl}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-[11px] text-slate-400">Advertiser Payout (INR)</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatINR(
                        getCampaignAdvertiserPayoutInINR(
                          viewingCampaign,
                          settings.exchangeRates
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">User Payout (INR)</div>
                    <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {viewingCampaign.payoutType}{' '}
                      {formatINR(
                        getCampaignUnitPayoutInINR(
                          viewingCampaign,
                          settings.exchangeRates
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Payable Event</div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {viewingCampaign.payableEventId || 'default_conversion'}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setViewingCampaign(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const camp = viewingCampaign;
                    setViewingCampaign(null);
                    setEditingWizardCampaignId(camp.id);
                    setActiveSection('campaign-create');
                  }}
                >
                  Edit in Wizard V2
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Edit Campaign Modal */}
      <Dialog
        open={!!editingCampaign}
        onOpenChange={(open) => !open && setEditingCampaign(null)}
      >
        <DialogContent>
          {editingCampaign && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Quick Edit · {editingCampaign.offerId || editingCampaign.id}
                </DialogTitle>
                <DialogDescription>
                  Update campaign name, status, payout amount, or total conversion cap.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateCampaign(editingCampaign.id, {
                    name: editingCampaign.name,
                    brand: editingCampaign.brand,
                    status: editingCampaign.status,
                    payoutAmount: Number(editingCampaign.payoutAmount),
                    totalCap: Number(editingCampaign.totalCap ?? editingCampaign.dailyCap),
                    dailyCap: Number(editingCampaign.totalCap ?? editingCampaign.dailyCap),
                  });
                  toast.success(`Saved changes to ${editingCampaign.id}`);
                  setEditingCampaign(null);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="edit-cmp-name">Campaign Name</Label>
                  <Input
                    id="edit-cmp-name"
                    value={editingCampaign.name}
                    onChange={(e) =>
                      setEditingCampaign({ ...editingCampaign, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-cmp-status">Status</Label>
                    <ThemedSelect
                      id="edit-cmp-status"
                      ariaLabel="Campaign Status"
                      value={editingCampaign.status}
                      onValueChange={(val) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          status: val as CampaignRecord['status'],
                        })
                      }
                      options={EDIT_STATUS_OPTIONS}
                      searchable={false}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-cmp-payout">
                      User Payout ({editingCampaign.currency})
                    </Label>
                    <Input
                      id="edit-cmp-payout"
                      type="number"
                      step="0.5"
                      value={editingCampaign.payoutAmount}
                      onChange={(e) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          payoutAmount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCampaign(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!deletingCampaign}
        onOpenChange={(open) => !open && setDeletingCampaign(null)}
      >
        <DialogContent>
          {deletingCampaign && (
            <>
              <DialogHeader>
                <DialogTitle>Delete Campaign {deletingCampaign.id}?</DialogTitle>
                <DialogDescription>
                  This will permanently remove &ldquo;{deletingCampaign.name}&rdquo; ({deletingCampaign.offerId}) and halt any active tracking redirects.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingCampaign(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteCampaign(deletingCampaign.id);
                    toast.success(`Deleted campaign ${deletingCampaign.id}`);
                    setDeletingCampaign(null);
                  }}
                >
                  Confirm Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
