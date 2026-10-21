'use client';

import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Radar,
  MousePointerClick,
  Repeat,
  Users,
  IndianRupee,
  Activity,
  Plus,
  Copy,
  Check,
  Play,
  Pause,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import {
  calculateTrackerMetrics,
  buildExampleTrackingUrl,
  interpolatePostbackUrl,
  formatINR,
  formatCompactNumber,
  filterRecordsByQueryAndFacets,
  type TrackerRecord,
  type TrackingMethod,
} from '@/lib/crosx-logic';
import { DataTable } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { GeminiAiOperationsPanel } from '@/components/shared/gemini-ai-panel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const METHOD_FILTER_OPTIONS = [
  { label: 'All Tracking Methods', value: 'all' },
  { label: 'S2S (Server-to-Server)', value: 'S2S' },
  { label: 'GET Redirect', value: 'GET' },
  { label: 'Browser Pixel', value: 'Browser Pixel' },
  { label: 'CRM Webhook', value: 'CRM' },
  { label: 'Offer Code', value: 'Offer Code' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Testing / Sandbox', value: 'testing' },
  { label: 'Paused', value: 'paused' },
];

export function TrackerView() {
  const {
    trackers,
    campaigns,
    addTracker,
    updateTrackerStatus,
    recordTrackerTestEvent,
    deleteTracker,
  } = useCrosXStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Tracker Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [trackerName, setTrackerName] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    campaigns[0]?.id ?? 'CMP-8492'
  );
  const [partnerSource, setPartnerSource] = useState('pub_aff_northstar');
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('S2S');
  const [postbackCallbackUrl, setPostbackCallbackUrl] = useState(
    'https://relay.partner-network.in/cb?click_id={c}&sub={x}&payout={payout}&event={event}'
  );

  // Diagnostic Sandbox Modal State
  const [sandboxTracker, setSandboxTracker] = useState<TrackerRecord | null>(
    null
  );
  const [sandboxEventType, setSandboxEventType] = useState<
    'click' | 'conversion' | 'referral'
  >('conversion');
  const [sandboxClickId, setSandboxClickId] = useState('cx_clk_994821a');
  const [sandboxSubId, setSandboxSubId] = useState('aff_in_top_01');
  const [sandboxPayoutInr, setSandboxPayoutInr] = useState('420');

  const summary = useMemo(() => calculateTrackerMetrics(trackers), [trackers]);

  const selectedCampaign = useMemo(
    () =>
      campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0],
    [campaigns, selectedCampaignId]
  );

  const previewTrackingUrl = useMemo(
    () =>
      buildExampleTrackingUrl(
        trackingMethod,
        selectedCampaign?.offerId || 'OFR-8492'
      ),
    [trackingMethod, selectedCampaign]
  );

  const filteredTrackers = useMemo(() => {
    return filterRecordsByQueryAndFacets(
      trackers as unknown as Record<string, unknown>[],
      {
        searchQuery,
        searchKeys: [
          'id',
          'name',
          'campaignName',
          'offerId',
          'partnerSource',
          'trackingMethod',
        ],
        facets: {
          trackingMethod: methodFilter,
          status: statusFilter,
        },
      }
    ) as unknown as TrackerRecord[];
  }, [trackers, searchQuery, methodFilter, statusFilter]);

  const handleCopyUrl = (url: string, id: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedId(id);
    toast.success(`Copied ${label} tracking URL`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCreateTrackerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackerName.trim() || trackerName.trim().length < 3) {
      toast.error('Enter a tracker name (at least 3 characters)');
      return;
    }
    if (!partnerSource.trim()) {
      toast.error('Enter a partner or referral source identifier');
      return;
    }

    const created = addTracker({
      name: trackerName.trim(),
      campaignId: selectedCampaign.id,
      offerId: selectedCampaign.offerId,
      campaignName: selectedCampaign.name,
      trackingMethod,
      partnerSource: partnerSource.trim(),
      primarySubIdParam: 'x',
      secondarySubIds: ['x1', 'x2'],
      trackingUrl: previewTrackingUrl,
      postbackCallbackUrl: postbackCallbackUrl.trim(),
      status: 'active',
    });

    toast.success(`Provisioned tracker ${created.id} (${created.offerId})`);
    setCreateModalOpen(false);
    setTrackerName('');
  };

  const handleExecuteSandboxPing = () => {
    if (!sandboxTracker) return;
    const payout = Number(sandboxPayoutInr) || 0;
    recordTrackerTestEvent(sandboxTracker.id, sandboxEventType, payout);
    toast.success(
      `Dispatched ${sandboxEventType.toUpperCase()} diagnostic event on ${sandboxTracker.id} (HTTP 200 OK · 14ms)`
    );
    setSandboxTracker(null);
  };

  const columns = useMemo<ColumnDef<TrackerRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tracker Name & ID',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {row.original.name}
            </div>
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.id} · Source: {row.original.partnerSource}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'campaignName',
        header: 'Campaign / Offer ID',
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <div className="truncate font-medium text-slate-900 dark:text-white">
              {row.original.campaignName}
            </div>
            <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
              {row.original.campaignId} · {row.original.offerId}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'trackingMethod',
        header: 'Method & Sub-IDs',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
              {row.original.trackingMethod}
            </div>
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {'{c} · {'}
              {row.original.primarySubIdParam}
              {'} · '}
              {row.original.secondarySubIds.map((s) => `{${s}}`).join(' ')}
            </div>
          </div>
        ),
      },
      {
        id: 'telemetry',
        header: 'Clicks / Conv. / Ref.',
        cell: ({ row }) => (
          <div className="font-mono text-xs tabular-nums">
            <span className="text-slate-900 dark:text-white font-semibold">
              {formatCompactNumber(row.original.clicks)}
            </span>{' '}
            /{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {formatCompactNumber(row.original.conversions)}
            </span>{' '}
            /{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {formatCompactNumber(row.original.referralConversions)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'avgLatencyMs',
        header: 'Avg Latency',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
              {row.original.avgLatencyMs}ms
            </div>
            <div className="text-[11px] text-slate-400">
              {row.original.lastPingAt}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'trackedPayoutInr',
        header: 'Tracked Payout (INR)',
        cell: ({ row }) => (
          <div className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatINR(row.original.trackedPayoutInr)}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Copy URL for tracker ${item.id}`}
                onClick={() =>
                  handleCopyUrl(item.trackingUrl, item.id, item.name)
                }
                className="h-7 px-2 text-xs"
              >
                {copiedId === item.id ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>Copy Link</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Test tracker ${item.id} in sandbox`}
                onClick={() => setSandboxTracker(item)}
                className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Test Ping</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={
                  item.status === 'active'
                    ? `Pause tracker ${item.id}`
                    : `Activate tracker ${item.id}`
                }
                onClick={() => {
                  const next = item.status === 'active' ? 'paused' : 'active';
                  updateTrackerStatus(item.id, next);
                  toast.success(`Tracker ${item.id} set to ${next}`);
                }}
                className="h-7 px-2 text-xs"
              >
                {item.status === 'active' ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-emerald-600" />
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Delete tracker ${item.id}`}
                onClick={() => {
                  deleteTracker(item.id);
                  toast.success(`Deleted tracker ${item.id}`);
                }}
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [copiedId, updateTrackerStatus, deleteTracker]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attribution & Referral Tracker Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Provision S2S, Redirect, Pixel, CRM, and Offer Code tracking links with dynamic Sub-ID macros and real-time INR callback telemetry.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Provision Tracker</span>
        </Button>
      </div>

      {/* 6 Telemetry Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Active Trackers</span>
              <Radar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary.activeTrackers} / {summary.totalTrackers}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Live routing endpoints
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tracked Clicks</span>
              <MousePointerClick className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatCompactNumber(summary.totalTrackedClicks)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Deduplicated ingress
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Conversions</span>
              <Repeat className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatCompactNumber(summary.totalTrackedConversions)}
            </div>
            <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {summary.conversionRatePercent}% CVR
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Referral Conv.</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatCompactNumber(summary.totalReferralConversions)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Attributed via tracker
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Avg S2S Latency</span>
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary.avgLatencyMs}ms
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              HTTP 200 OK SLA
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tracked Payouts (INR)</span>
              <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatINR(summary.totalTrackedPayoutInr)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Cumulative INR ledger
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gemini AI Studio Tracker & Attribution Intelligence */}
      <GeminiAiOperationsPanel defaultFocus="tracker_diagnostics" compact />

      {/* Trackers Table */}
      <DataTable
        data={trackers as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>, unknown>[]}
        searchPlaceholder="Search Tracker ID, Name, Offer ID, Source..."
        searchKeys={[
          'id',
          'name',
          'campaignName',
          'offerId',
          'partnerSource',
          'trackingMethod',
        ]}
        dateKey="createdAt"
        exportFilename="crosx-attribution-trackers-inr.csv"
        facets={[
          {
            key: 'trackingMethod',
            label: 'Method',
            options: [
              { label: 'S2S', value: 'S2S' },
              { label: 'GET Redirect', value: 'GET' },
              { label: 'Browser Pixel', value: 'Browser Pixel' },
              { label: 'CRM Webhook', value: 'CRM' },
              { label: 'Offer Code', value: 'Offer Code' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Testing', value: 'testing' },
              { label: 'Paused', value: 'paused' },
            ],
          },
        ]}
        emptyTitle="No matching trackers found"
        emptyDescription="Clear your filter criteria or provision a new campaign tracking endpoint."
      />

      {/* Provision New Tracker Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Provision Attribution & Referral Tracker</DialogTitle>
            <DialogDescription>
              Generate a dedicated S2S, Redirect, Pixel, CRM, or Offer Code endpoint bound to a CrosX Offer ID.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTrackerSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="trk-name">Tracker Name / Placement Label</Label>
              <Input
                id="trk-name"
                placeholder="e.g. FinPartners S2S High-Intent Router"
                value={trackerName}
                onChange={(e) => setTrackerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="trk-campaign">Linked Campaign & Offer ID</Label>
                <ThemedSelect
                  id="trk-campaign"
                  ariaLabel="Linked Campaign"
                  value={selectedCampaignId}
                  onValueChange={(val) => {
                    setSelectedCampaignId(val);
                    const found = campaigns.find((c) => c.id === val);
                    if (found) {
                      setTrackingMethod(found.trackingMethod);
                    }
                  }}
                  options={campaigns.map((c) => ({
                    label: `${c.name} (${c.offerId})`,
                    value: c.id,
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trk-method">Tracking Method</Label>
                <ThemedSelect
                  id="trk-method"
                  ariaLabel="Tracking Method"
                  value={trackingMethod}
                  onValueChange={(val) =>
                    setTrackingMethod(val as TrackingMethod)
                  }
                  options={METHOD_FILTER_OPTIONS.filter(
                    (o) => o.value !== 'all'
                  )}
                  searchable={false}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trk-source">Partner / Referral Source ID</Label>
              <Input
                id="trk-source"
                placeholder="e.g. pub_aff_northstar"
                value={partnerSource}
                onChange={(e) => setPartnerSource(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Generated Ingress Tracking URL (Live Preview)</Label>
              <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 break-all dark:border-slate-800">
                {previewTrackingUrl}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trk-callback">
                Partner Postback Callback URL
              </Label>
              <Input
                id="trk-callback"
                value={postbackCallbackUrl}
                onChange={(e) => setPostbackCallbackUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                <Plus className="h-3.5 w-3.5" />
                <span>Provision Tracker</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diagnostic Test Ping Sandbox Modal */}
      <Dialog
        open={!!sandboxTracker}
        onOpenChange={(open) => !open && setSandboxTracker(null)}
      >
        <DialogContent className="max-w-lg">
          {sandboxTracker && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Tracker Diagnostic Sandbox · {sandboxTracker.id}
                </DialogTitle>
                <DialogDescription>
                  Simulate an ingress click, payable conversion, or referral event and verify macro interpolation.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="sb-type">Simulated Event</Label>
                    <ThemedSelect
                      id="sb-type"
                      ariaLabel="Simulated Event"
                      value={sandboxEventType}
                      onValueChange={(val) =>
                        setSandboxEventType(
                          val as 'click' | 'conversion' | 'referral'
                        )
                      }
                      options={[
                        { label: 'Conversion Event', value: 'conversion' },
                        { label: 'Referral Conversion', value: 'referral' },
                        { label: 'Click Only', value: 'click' },
                      ]}
                      searchable={false}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sb-click">Click ID {'{c}'}</Label>
                    <Input
                      id="sb-click"
                      value={sandboxClickId}
                      onChange={(e) => setSandboxClickId(e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sb-payout">Payout (INR ₹)</Label>
                    <Input
                      id="sb-payout"
                      type="number"
                      value={sandboxPayoutInr}
                      onChange={(e) => setSandboxPayoutInr(e.target.value)}
                      className="h-9 font-mono text-xs tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sb-sub">Primary Sub ID {'{x}'}</Label>
                  <Input
                    id="sb-sub"
                    value={sandboxSubId}
                    onChange={(e) => setSandboxSubId(e.target.value)}
                    className="h-9 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Resolved Partner Callback Payload
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 break-all dark:border-slate-800">
                    {interpolatePostbackUrl(
                      sandboxTracker.postbackCallbackUrl,
                      {
                        c: sandboxClickId,
                        x: sandboxSubId,
                        offer_id: sandboxTracker.offerId,
                        payout: sandboxPayoutInr,
                        event:
                          sandboxEventType === 'referral'
                            ? 'referral_kyc_approved'
                            : 'kyc_approved',
                      }
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSandboxTracker(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecuteSandboxPing}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Execute Diagnostic Ping</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
