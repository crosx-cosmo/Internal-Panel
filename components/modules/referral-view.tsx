'use client';

import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Repeat,
  IndianRupee,
  Plus,
  Download,
  Eye,
  Check,
  X,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import {
  calculateReferralMetrics,
  getReferralPayoutInINR,
  formatINR,
  filterRecordsByQueryAndFacets,
  DEFAULT_ADVANCED_OPTIONS,
  type ReferralRecord,
  type ReferralStatus,
  type CampaignAdvancedOptions,
} from '@/lib/crosx-logic';
import { DataTable } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { GeminiAiOperationsPanel } from '@/components/shared/gemini-ai-panel';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
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

export function ReferralView() {
  const {
    referrals,
    campaigns,
    settings,
    updateCampaign,
    addReferral,
    updateReferralStatus,
    deleteReferral,
  } = useCrosXStore();

  const [searchQuery] = useState('');
  const [statusFilter] = useState<string>('all');
  const [campaignFilter] = useState<string>('all');
  const [inspectingReferral, setInspectingReferral] =
    useState<ReferralRecord | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Referral Program Configuration State (bound to selected campaign / offer)
  const [configCampaignId, setConfigCampaignId] = useState<string>(
    campaigns[0]?.id ?? 'CMP-8492'
  );
  const activeConfigCampaign = useMemo(
    () =>
      campaigns.find((c) => c.id === configCampaignId) ?? campaigns[0],
    [campaigns, configCampaignId]
  );

  const [progEnabled, setProgEnabled] = useState<boolean>(
    activeConfigCampaign?.advancedOptions?.referralFeaturesEnabled ?? true
  );
  const [progRewardInr, setProgRewardInr] = useState<string>(
    String(activeConfigCampaign?.referralPayout ?? 420)
  );
  const [progAttribution, setProgAttribution] = useState<
    CampaignAdvancedOptions['referralAttributionModel']
  >(
    activeConfigCampaign?.advancedOptions?.referralAttributionModel ??
      'first_referrer'
  );
  const [progEligibilityEvent, setProgEligibilityEvent] = useState<string>(
    activeConfigCampaign?.advancedOptions?.referralLinkedEventId ||
      activeConfigCampaign?.payableEventId ||
      'kyc_approved'
  );
  const [progSameUpiPolicy, setProgSameUpiPolicy] = useState<
    CampaignAdvancedOptions['sameUpiPolicyAction']
  >(
    activeConfigCampaign?.advancedOptions?.sameUpiPolicyAction ??
      'manual_fraud_review'
  );
  const [progApprovalPolicy, setProgApprovalPolicy] = useState<string>(
    'manual_review'
  );
  const [progWindowDays, setProgWindowDays] = useState<string>('30_days');

  const handleSelectConfigCampaign = (campId: string) => {
    setConfigCampaignId(campId);
    const found = campaigns.find((c) => c.id === campId);
    if (found) {
      setProgEnabled(found.advancedOptions?.referralFeaturesEnabled ?? true);
      setProgRewardInr(String(found.referralPayout ?? 420));
      setProgAttribution(
        found.advancedOptions?.referralAttributionModel ?? 'first_referrer'
      );
      setProgEligibilityEvent(
        found.advancedOptions?.referralLinkedEventId ||
          found.payableEventId ||
          'kyc_approved'
      );
      setProgSameUpiPolicy(
        found.advancedOptions?.sameUpiPolicyAction ?? 'manual_fraud_review'
      );
    }
  };

  const handleSaveProgramConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfigCampaign) return;
    const numericReward = Number(progRewardInr);
    if (!Number.isFinite(numericReward) || numericReward < 0) {
      toast.error('Enter a valid non-negative INR referral reward amount');
      return;
    }
    updateCampaign(activeConfigCampaign.id, {
      referralPayout: numericReward,
      advancedOptions: {
        ...(activeConfigCampaign.advancedOptions || DEFAULT_ADVANCED_OPTIONS),
        referralFeaturesEnabled: progEnabled,
        referralAttributionModel: progAttribution,
        referralLinkedEventId: progEligibilityEvent,
        sameUpiIdEnabled: true,
        sameUpiPolicyAction: progSameUpiPolicy,
      },
    });
    toast.success(
      `Updated referral program rules for ${activeConfigCampaign.name} (${activeConfigCampaign.offerId})`
    );
  };

  // Create Referral Form State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id ?? 'CMP-8492'
  );
  const [referrerName, setReferrerName] = useState('');
  const [referrerEmail, setReferrerEmail] = useState('');
  const [referredUserName, setReferredUserName] = useState('');
  const [referredUserEmail, setReferredUserEmail] = useState('');
  const [payoutAmountInr, setPayoutAmountInr] = useState('420');
  const [sameUpiFlagged, setSameUpiFlagged] = useState(false);
  const [notes, setNotes] = useState('');

  const metrics = useMemo(
    () => calculateReferralMetrics(referrals, settings.exchangeRates),
    [referrals, settings.exchangeRates]
  );

  const campaignOptions = useMemo(
    () => [
      { label: 'All Campaigns', value: 'all' },
      ...campaigns.map((c) => ({
        label: `${c.name} (${c.offerId})`,
        value: c.id,
      })),
    ],
    [campaigns]
  );

  const filteredReferrals = useMemo(() => {
    return filterRecordsByQueryAndFacets(
      referrals as unknown as Record<string, unknown>[],
      {
        searchQuery,
        searchKeys: [
          'id',
          'referrerName',
          'referrerEmail',
          'referredUserName',
          'referredUserEmail',
          'campaignName',
          'offerId',
        ],
        facets: {
          status: statusFilter,
          campaignId: campaignFilter,
        },
      }
    ) as unknown as ReferralRecord[];
  }, [referrals, searchQuery, statusFilter, campaignFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Referral ID',
      'Campaign ID',
      'Offer ID',
      'Campaign Name',
      'Referrer',
      'Referred User',
      'Linked Event',
      'Attribution',
      'Payout (INR)',
      'Same UPI Flag',
      'Status',
      'Created At',
    ];
    const rows = filteredReferrals.map((r) => [
      r.id,
      r.campaignId,
      r.offerId,
      `"${r.campaignName}"`,
      `"${r.referrerName} (${r.referrerEmail})"`,
      `"${r.referredUserName} (${r.referredUserEmail})"`,
      r.linkedEventIdentifier,
      r.attributionModel,
      getReferralPayoutInINR(r, settings.exchangeRates),
      r.sameUpiFlagged ? 'FLAGGED' : 'CLEAN',
      r.status,
      r.createdAt,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'crosx-referral-ledger-inr.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredReferrals.length} referral records (INR)`);
  };

  const handleCreateReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referrerName.trim() || !referredUserName.trim()) {
      toast.error('Enter both Referrer and Referred User names');
      return;
    }
    const camp =
      campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0];
    const numericPayout = Number(payoutAmountInr);
    if (!Number.isFinite(numericPayout) || numericPayout < 0) {
      toast.error('Enter a valid INR referral payout amount');
      return;
    }

    const created = addReferral({
      campaignId: camp.id,
      offerId: camp.offerId,
      campaignName: camp.name,
      referrerName: referrerName.trim(),
      referrerId: `PRT-${Math.floor(220 + Math.random() * 700)}`,
      referrerEmail:
        referrerEmail.trim() ||
        `${referrerName.trim().toLowerCase().replace(/\s+/g, '.')}@partner.in`,
      referredUserName: referredUserName.trim(),
      referredUserEmail:
        referredUserEmail.trim() ||
        `${referredUserName.trim().toLowerCase().replace(/\s+/g, '.')}@user.in`,
      referredUpiHash: sameUpiFlagged
        ? 'upi_sha256_dup_collision'
        : `upi_sha256_${Math.random().toString(16).slice(2, 10)}`,
      sameUpiFlagged,
      linkedEventIdentifier:
        camp.advancedOptions?.referralLinkedEventId ||
        camp.payableEventId ||
        'kyc_approved',
      attributionModel:
        camp.advancedOptions?.referralAttributionModel || 'first_referrer',
      conversionCompleted: !sameUpiFlagged,
      payoutAmount: numericPayout,
      currency: 'INR',
      status: sameUpiFlagged ? 'rejected' : 'pending',
      notes:
        notes.trim() ||
        (sameUpiFlagged
          ? 'Flagged by Same UPI ID validation policy.'
          : 'Logged manually via Referral Operations console.'),
    });

    toast.success(`Recorded referral ${created.id} (${camp.offerId})`);
    setCreateModalOpen(false);
    setReferrerName('');
    setReferrerEmail('');
    setReferredUserName('');
    setReferredUserEmail('');
    setSameUpiFlagged(false);
    setNotes('');
  };

  const columns = useMemo<ColumnDef<ReferralRecord>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Referral ID',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
              {row.original.id}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {row.original.createdAt.slice(0, 10)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'referrerName',
        header: 'Referrer',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {row.original.referrerName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.referrerId} · {row.original.referrerEmail}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'referredUserName',
        header: 'Referred User & UPI Check',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {row.original.referredUserName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.referredUserEmail} ·{' '}
              <span
                className={
                  row.original.sameUpiFlagged
                    ? 'font-semibold text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {row.original.sameUpiFlagged ? 'Same-UPI Collision' : 'UPI Unique'}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'campaignName',
        header: 'Campaign / Offer ID',
        cell: ({ row }) => (
          <div className="max-w-[210px]">
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
        accessorKey: 'linkedEventIdentifier',
        header: 'Linked Event & Rule',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
              {row.original.linkedEventIdentifier}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.attributionModel === 'first_referrer'
                ? 'First Referrer'
                : 'Last Referrer'}{' '}
              · {row.original.conversionCompleted ? 'Converted' : 'Unconverted'}
            </div>
          </div>
        ),
      },
      {
        id: 'payoutInr',
        header: 'Referral Payout (INR)',
        cell: ({ row }) => {
          const inr = getReferralPayoutInINR(
            row.original,
            settings.exchangeRates
          );
          return (
            <div className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatINR(inr)}
            </div>
          );
        },
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
                variant="ghost"
                size="sm"
                aria-label={`Inspect referral ${item.id}`}
                onClick={() => setInspectingReferral(item)}
                className="h-7 px-2 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Inspect</span>
              </Button>
              {item.status !== 'approved' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Approve referral ${item.id}`}
                  onClick={() => {
                    updateReferralStatus([item.id], 'approved');
                    toast.success(`Approved referral ${item.id}`);
                  }}
                  className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </Button>
              )}
              {item.status !== 'rejected' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Reject referral ${item.id}`}
                  onClick={() => {
                    updateReferralStatus([item.id], 'rejected');
                    toast.success(`Rejected referral ${item.id}`);
                  }}
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [settings.exchangeRates, updateReferralStatus]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Referral Management & Attribution Ledger
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Administer partner & user referral programs, verify Same-UPI VPA uniqueness policies, and settle referral payouts in INR (₹).
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {metrics.pendingReferrals > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const pendingIds = referrals
                  .filter((r) => r.status === 'pending')
                  .map((r) => r.id);
                updateReferralStatus(pendingIds, 'approved');
                toast.success(
                  `Batch approved ${pendingIds.length} pending referral(s)`
                );
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Approve Pending ({metrics.pendingReferrals})</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Referral</span>
          </Button>
        </div>
      </div>

      {/* 6 Required Dashboard Metrics Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total Referrals</span>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.totalReferrals}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Active referral ledger
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Pending Referrals</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.pendingReferrals}
            </div>
            <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {formatINR(metrics.pendingPayoutTotalInr)} queued
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Approved Referrals</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.approvedReferrals}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Verified KYC & event
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Rejected Referrals</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.rejectedReferrals}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {metrics.flaggedSameUpiCount} Same-UPI flagged
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Referral Conversions</span>
              <Repeat className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.referralConversions}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Downstream event fired
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Referral Payouts (INR)</span>
              <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatINR(metrics.approvedPayoutTotalInr)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Settled in Indian Rupees
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gemini AI Studio Referral & Fraud Intelligence */}
      <GeminiAiOperationsPanel defaultFocus="referral_audit" compact />

      {/* Referral Management Data Table */}
      <DataTable
        data={referrals as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>, unknown>[]}
        searchPlaceholder="Search Referral ID, Referrer, User, Offer ID..."
        searchKeys={[
          'id',
          'referrerName',
          'referrerEmail',
          'referredUserName',
          'referredUserEmail',
          'campaignName',
          'offerId',
        ]}
        dateKey="createdAt"
        exportFilename="crosx-referral-ledger-inr.csv"
        facets={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Approved', value: 'approved' },
              { label: 'Pending Review', value: 'pending' },
              { label: 'Rejected', value: 'rejected' },
            ],
          },
          {
            key: 'attributionModel',
            label: 'Attribution',
            options: [
              { label: 'First Referrer', value: 'first_referrer' },
              { label: 'Last Referrer', value: 'last_referrer' },
            ],
          },
        ]}
        emptyTitle="No matching referral records"
        emptyDescription="Adjust your status or attribution filter, or log a new referral attribution record."
      />

      {/* Referral Program Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                Referral Program Configuration & Attribution Governance
              </CardTitle>
              <CardDescription className="text-xs">
                Configure campaign-level referral eligibility rules, INR reward amounts, attribution windows, and Same-UPI duplicate prevention.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={progEnabled}
                aria-label="Enable or disable referral functionality"
                onClick={() => setProgEnabled((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  progEnabled
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    progEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                <span>
                  {progEnabled
                    ? 'Referral Program Active'
                    : 'Referral Program Paused'}
                </span>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProgramConfig} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="cfg-campaign">
                  Applicable Campaign / Offer
                </Label>
                <ThemedSelect
                  id="cfg-campaign"
                  ariaLabel="Applicable Campaign or Offer"
                  value={configCampaignId}
                  onValueChange={handleSelectConfigCampaign}
                  options={campaigns.map((c) => ({
                    label: `${c.name} (${c.offerId})`,
                    value: c.id,
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfg-reward">
                  Referral Reward Amount (INR ₹)
                </Label>
                <Input
                  id="cfg-reward"
                  type="number"
                  min={0}
                  value={progRewardInr}
                  onChange={(e) => setProgRewardInr(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfg-eligibility">
                  Referral Eligibility Rule (Linked Event)
                </Label>
                <ThemedSelect
                  id="cfg-eligibility"
                  ariaLabel="Referral Eligibility Rule"
                  value={progEligibilityEvent}
                  onValueChange={setProgEligibilityEvent}
                  options={[
                    {
                      label: 'Card Issued & Activated (card_issued)',
                      value: 'card_issued',
                    },
                    {
                      label: 'Verified KYC & Activation (kyc_approved)',
                      value: 'kyc_approved',
                    },
                    {
                      label: 'Cluster Deployed (cluster_deployed)',
                      value: 'cluster_deployed',
                    },
                    {
                      label: 'First Deposit ≥ ₹2,000 (first_deposit_2000)',
                      value: 'first_deposit_2000',
                    },
                    {
                      label: 'Merchant MID Approved (mid_approved)',
                      value: 'mid_approved',
                    },
                    {
                      label: 'Policy Issued & Bound (policy_bound)',
                      value: 'policy_bound',
                    },
                  ]}
                  searchable={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfg-attribution">Attribution Rule</Label>
                <ThemedSelect
                  id="cfg-attribution"
                  ariaLabel="Attribution Rule"
                  value={progAttribution}
                  onValueChange={(v) =>
                    setProgAttribution(
                      v as CampaignAdvancedOptions['referralAttributionModel']
                    )
                  }
                  options={[
                    {
                      label: 'First Referrer Wins (first_referrer)',
                      value: 'first_referrer',
                    },
                    {
                      label: 'Last Referrer Wins (last_referrer)',
                      value: 'last_referrer',
                    },
                  ]}
                  searchable={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfg-dup">
                  Duplicate & Same-UPI Prevention
                </Label>
                <ThemedSelect
                  id="cfg-dup"
                  ariaLabel="Duplicate and Same-UPI Prevention"
                  value={progSameUpiPolicy}
                  onValueChange={(v) =>
                    setProgSameUpiPolicy(
                      v as CampaignAdvancedOptions['sameUpiPolicyAction']
                    )
                  }
                  options={[
                    {
                      label: 'Manual Fraud Review (manual_fraud_review)',
                      value: 'manual_fraud_review',
                    },
                    {
                      label: 'Restrict Payout Until KYC (restrict_payout_until_kyc)',
                      value: 'restrict_payout_until_kyc',
                    },
                    {
                      label: 'Audit Log Only (audit_log_only)',
                      value: 'audit_log_only',
                    },
                  ]}
                  searchable={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfg-approval">Referral Approval Status Policy</Label>
                <ThemedSelect
                  id="cfg-approval"
                  ariaLabel="Referral Approval Status Policy"
                  value={progApprovalPolicy}
                  onValueChange={setProgApprovalPolicy}
                  options={[
                    {
                      label: 'Manual Fraud Queue Review',
                      value: 'manual_review',
                    },
                    {
                      label: 'Auto-Approve Verified S2S KYC Event',
                      value: 'auto_approve_kyc',
                    },
                  ]}
                  searchable={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfg-window">Referral Attribution Window</Label>
                <ThemedSelect
                  id="cfg-window"
                  ariaLabel="Referral Attribution Window"
                  value={progWindowDays}
                  onValueChange={setProgWindowDays}
                  options={[
                    { label: '7 Days Click-to-KYC', value: '7_days' },
                    { label: '14 Days Standard Window', value: '14_days' },
                    { label: '30 Days Enterprise Window', value: '30_days' },
                    { label: '60 Days Extended B2B Window', value: '60_days' },
                  ]}
                  searchable={false}
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" size="sm" className="w-full h-9">
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Program Rules</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Referral Inspector Modal */}
      <Dialog
        open={!!inspectingReferral}
        onOpenChange={(open) => !open && setInspectingReferral(null)}
      >
        <DialogContent className="max-w-lg">
          {inspectingReferral && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Referral Attribution Inspector · {inspectingReferral.id}
                </DialogTitle>
                <DialogDescription>
                  {inspectingReferral.campaignName} ({inspectingReferral.campaignId} ·{' '}
                  {inspectingReferral.offerId})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-[#090D16]">
                  <div>
                    <div className="text-[11px] text-slate-500">Referrer Partner</div>
                    <div className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {inspectingReferral.referrerName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {inspectingReferral.referrerId} · {inspectingReferral.referrerEmail}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Referred User</div>
                    <div className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {inspectingReferral.referredUserName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {inspectingReferral.referredUserEmail}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">
                      Referral Payout (INR)
                    </div>
                    <div className="mt-1 font-mono text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatINR(
                        getReferralPayoutInINR(
                          inspectingReferral,
                          settings.exchangeRates
                        )
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">
                      Same-UPI VPA Hash Check
                    </div>
                    <div className="mt-1 font-mono text-xs font-semibold">
                      {inspectingReferral.sameUpiFlagged ? (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <ShieldAlert className="h-3.5 w-3.5" /> Collision Flagged
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Verified Unique ({inspectingReferral.referredUpiHash})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 space-y-1 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Audit & Verification Notes
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {inspectingReferral.notes}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    deleteReferral(inspectingReferral.id);
                    setInspectingReferral(null);
                    toast.success(`Deleted referral ${inspectingReferral.id}`);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Record</span>
                </Button>

                <div className="flex items-center gap-2">
                  {inspectingReferral.status !== 'approved' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        updateReferralStatus([inspectingReferral.id], 'approved');
                        setInspectingReferral({
                          ...inspectingReferral,
                          status: 'approved' as ReferralStatus,
                        });
                        toast.success(`Approved ${inspectingReferral.id}`);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Payout</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectingReferral(null)}
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Log / Create Referral Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Referral Attribution Record</DialogTitle>
            <DialogDescription>
              Record a partner or user referral against an active CrosX campaign with INR payout standardization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReferralSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ref-campaign">Target Campaign & Offer ID</Label>
              <ThemedSelect
                id="ref-campaign"
                ariaLabel="Target Campaign"
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
                options={campaigns.map((c) => ({
                  label: `${c.name} (${c.offerId})`,
                  value: c.id,
                }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ref-referrer-name">Referrer Name</Label>
                <Input
                  id="ref-referrer-name"
                  placeholder="e.g. Vikramaditya Rao"
                  value={referrerName}
                  onChange={(e) => setReferrerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-referrer-email">Referrer Email</Label>
                <Input
                  id="ref-referrer-email"
                  placeholder="e.g. v.rao@finpartners.in"
                  value={referrerEmail}
                  onChange={(e) => setReferrerEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ref-user-name">Referred User Name</Label>
                <Input
                  id="ref-user-name"
                  placeholder="e.g. Kavya Nair"
                  value={referredUserName}
                  onChange={(e) => setReferredUserName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-payout-inr">Referral Payout (INR ₹)</Label>
                <Input
                  id="ref-payout-inr"
                  type="number"
                  min={0}
                  value={payoutAmountInr}
                  onChange={(e) => setPayoutAmountInr(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ref-notes">Verification Notes</Label>
              <Input
                id="ref-notes"
                placeholder="e.g. Video KYC verified via S2S callback"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                <span>Save Referral</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
