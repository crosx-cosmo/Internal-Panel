'use client';

import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Globe,
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Power,
  Send,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import {
  interpolatePostbackUrl,
  isValidIPv4OrCIDR,
  formatINR,
} from '@/lib/crosx-logic';
import type { IpWhitelistRecord } from '@/lib/mock-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { Switch } from '@/components/ui/controls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PostbackViewProps {
  subSection: 'global' | 'ip';
}

const HTTP_METHOD_OPTIONS = [
  { label: 'POST (JSON / Form)', value: 'POST' },
  { label: 'GET (Query String)', value: 'GET' },
];

const TEST_EVENT_STATUS_OPTIONS = [
  { label: 'approved (Conversion Approved)', value: 'approved' },
  { label: 'verified (Lead Verified)', value: 'verified' },
  { label: 'rejected (Rejected / Chargeback)', value: 'rejected' },
];

const IP_ENV_OPTIONS = [
  { label: 'Production', value: 'Production' },
  { label: 'Partner Relay', value: 'Partner Relay' },
  { label: 'Staging', value: 'Staging' },
];

export function PostbackView({ subSection }: PostbackViewProps) {
  const {
    postbackConfig,
    updatePostbackConfig,
    ipWhitelist,
    addIpWhitelist,
    toggleIpStatus,
    deleteIpWhitelist,
    setActiveSection,
  } = useCrosXStore();

  // Global Postback Local Form State
  const [configDraft, setConfigDraft] = useState(postbackConfig);
  const [testClickId, setTestClickId] = useState('cx_clk_9948210a');
  const [testPayout, setTestPayout] = useState('5712.00');
  const [testStatus, setTestStatus] = useState('approved');
  const [testResult, setTestResult] = useState<{
    resolvedUrl: string;
    statusCode: number;
    latencyMs: number;
    responseBody: string;
    timestamp: string;
  } | null>(null);

  // IP Whitelist Modal State
  const [addIpOpen, setAddIpOpen] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newIpDesc, setNewIpDesc] = useState('');
  const [newIpEnv, setNewIpEnv] = useState<IpWhitelistRecord['environment']>('Production');
  const [ipError, setIpError] = useState<string | null>(null);

  const handleSaveGlobalPostback = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      new URL(configDraft.url);
    } catch {
      toast.error('Enter a valid Global Postback URL starting with https:// or http://');
      return;
    }
    updatePostbackConfig(configDraft);
    toast.success('Global Postback configuration saved');
  };

  const handleRunTestPostback = () => {
    const resolved = interpolatePostbackUrl(configDraft.url, {
      click_id: testClickId,
      campaign_id: 'CMP-8492',
      payout: testPayout,
      currency: 'INR',
      status: testStatus,
      sub_id: 'ns_in_search_88',
      conversion_id: 'conv_test_9912',
    });

    const latency = Math.floor(14 + Math.random() * 12);
    const numericPayout = Number(testPayout) || 0;
    setTestResult({
      resolvedUrl: resolved,
      statusCode: 200,
      latencyMs: latency,
      responseBody: JSON.stringify(
        {
          ack: true,
          partner_tx: `ptx_${Date.now()}`,
          click_id: testClickId,
          status: testStatus,
          currency: 'INR',
          credited_payout_inr: numericPayout,
          formatted_payout: formatINR(numericPayout),
        },
        null,
        2
      ),
      timestamp: new Date().toISOString(),
    });
    toast.success(`Test Postback returned HTTP 200 OK in ${latency}ms (${formatINR(numericPayout)})`);
  };

  const handleAddIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIpError(null);
    if (!isValidIPv4OrCIDR(newIpAddress)) {
      setIpError('Enter a valid IPv4 address (e.g. 52.89.214.238) or CIDR block (e.g. 185.220.101.0/24).');
      return;
    }
    if (!newIpDesc || newIpDesc.trim().length < 4) {
      setIpError('Provide a descriptive label for this IP or gateway.');
      return;
    }

    const added = addIpWhitelist({
      ipAddress: newIpAddress.trim(),
      description: newIpDesc.trim(),
      environment: newIpEnv,
      status: 'active',
    });

    toast.success(`Whitelisted ${added.ipAddress}`);
    setNewIpAddress('');
    setNewIpDesc('');
    setAddIpOpen(false);
  };

  const ipColumns = useMemo<ColumnDef<IpWhitelistRecord>[]>(
    () => [
      {
        accessorKey: 'ipAddress',
        header: 'IP Address / CIDR',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {row.original.ipAddress}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-800 dark:text-slate-200">
              {row.original.description}
            </div>
            <div className="text-[11px] text-slate-400">
              {row.original.id} · {row.original.environment}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        accessorKey: 'addedDate',
        header: 'Added Date',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {row.original.addedDate}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toggleIpStatus(item.id);
                  toast.success(
                    `${item.ipAddress} ${item.status === 'active' ? 'disabled' : 'activated'}`
                  );
                }}
                className="h-7 px-2.5 text-xs"
              >
                <Power className="h-3 w-3" />
                <span>{item.status === 'active' ? 'Disable' : 'Enable'}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${item.ipAddress}`}
                onClick={() => {
                  deleteIpWhitelist(item.id);
                  toast.success(`Removed ${item.ipAddress} from whitelist`);
                }}
                className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [toggleIpStatus, deleteIpWhitelist]
  );

  return (
    <div className="space-y-6">
      {/* Header + Sub-module Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {subSection === 'global'
              ? 'Global Postback Configuration'
              : 'Postback IP Whitelist'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Manage server-to-server (S2S) callback endpoints, INR payout macro parameters, event routing, and CIDR ingress ACLs.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-[#090D16]">
          <button
            type="button"
            onClick={() => setActiveSection('postback-global')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              subSection === 'global'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Global Postback</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('postback-ip')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              subSection === 'ip'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>IP Whitelist ({ipWhitelist.length})</span>
          </button>
        </div>
      </div>

      {subSection === 'global' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Columns: Global Postback Form */}
          <form onSubmit={handleSaveGlobalPostback} className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Endpoint & Dispatch Rules</CardTitle>
                  <CardDescription>
                    Configure the master S2S URL and HTTP method for real-time partner attribution notifications.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {configDraft.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <Switch
                    aria-label="Enable Global Postback"
                    checked={configDraft.enabled}
                    onCheckedChange={(val) =>
                      setConfigDraft({ ...configDraft, enabled: val })
                    }
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pb-method">HTTP Method</Label>
                    <ThemedSelect
                      id="pb-method"
                      ariaLabel="HTTP Method"
                      value={configDraft.method}
                      onValueChange={(val) =>
                        setConfigDraft({
                          ...configDraft,
                          method: val as 'GET' | 'POST',
                        })
                      }
                      options={HTTP_METHOD_OPTIONS}
                      searchable={false}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="pb-url">Global Postback Endpoint URL</Label>
                    <Input
                      id="pb-url"
                      value={configDraft.url}
                      onChange={(e) =>
                        setConfigDraft({ ...configDraft, url: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Macro Token Insertion */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dynamic Parameter Mapping
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {configDraft.parameters.map((param, idx) => (
                      <div
                        key={param.key}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-[#090D16]"
                      >
                        <div>
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">
                            {param.key}
                          </div>
                          <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                            {param.macro}
                          </div>
                        </div>
                        <Switch
                          aria-label={`Toggle parameter ${param.key}`}
                          checked={param.enabled}
                          onCheckedChange={(checked) => {
                            const nextParams = [...configDraft.parameters];
                            nextParams[idx] = { ...param, enabled: checked };
                            setConfigDraft({ ...configDraft, parameters: nextParams });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Mapping */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lifecycle Event Triggers
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {[
                      {
                        key: 'onClick' as const,
                        title: 'On Unique Click',
                        desc: 'Fire callback immediately upon click_id generation',
                      },
                      {
                        key: 'onSubmission' as const,
                        title: 'On Lead Submission',
                        desc: 'Fire when intake schema passes validation',
                      },
                      {
                        key: 'onConversionApproved' as const,
                        title: 'On Conversion Approved',
                        desc: 'Standard S2S payout event notification (INR)',
                      },
                      {
                        key: 'onConversionRejected' as const,
                        title: 'On Conversion Rejected / Chargeback',
                        desc: 'Notify partner of clawback or KYC failure',
                      },
                    ].map((evt) => (
                      <div
                        key={evt.key}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            {evt.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {evt.desc}
                          </div>
                        </div>
                        <Switch
                          aria-label={evt.title}
                          checked={configDraft.eventMapping[evt.key]}
                          onCheckedChange={(val) =>
                            setConfigDraft({
                              ...configDraft,
                              eventMapping: {
                                ...configDraft.eventMapping,
                                [evt.key]: val,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Configuration Status: Verified · TLS 1.3 Active
                    </span>
                  </div>
                  <Button type="submit" size="sm">
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Configuration</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Right Column: Live Test Postback Console */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle>Test Postback Simulator (INR)</CardTitle>
              <CardDescription>
                Dispatch a synthetic S2S payload to verify macro interpolation and partner endpoint response.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="test-click-id">Sample Click ID ({'{click_id}'})</Label>
                <Input
                  id="test-click-id"
                  value={testClickId}
                  onChange={(e) => setTestClickId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="test-payout">Payout INR ({'{payout}'})</Label>
                  <Input
                    id="test-payout"
                    value={testPayout}
                    onChange={(e) => setTestPayout(e.target.value)}
                    className="font-mono text-xs tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="test-status">Event ({'{status}'})</Label>
                  <ThemedSelect
                    id="test-status"
                    ariaLabel="Test Event Status"
                    value={testStatus}
                    onValueChange={setTestStatus}
                    options={TEST_EVENT_STATUS_OPTIONS}
                    searchable={false}
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleRunTestPostback}
                className="w-full"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Fire Test Postback</span>
              </Button>

              {testResult && (
                <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-[#090D16]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      HTTP {testResult.statusCode} OK
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {testResult.latencyMs}ms
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400">
                      RESOLVED REQUEST URL
                    </div>
                    <div className="font-mono text-[11px] text-slate-700 break-all dark:text-slate-300">
                      {testResult.resolvedUrl}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400">
                      PARTNER RESPONSE PAYLOAD
                    </div>
                    <pre className="overflow-x-auto rounded border border-slate-200 bg-white p-2 font-mono text-[11px] text-slate-800 dark:border-slate-800 dark:bg-[#0F1623] dark:text-slate-200">
                      {testResult.responseBody}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddIpOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              <span>Whitelist IP / CIDR</span>
            </Button>
          </div>

          <DataTable
            data={ipWhitelist as unknown as Record<string, unknown>[]}
            columns={
              ipColumns as unknown as ColumnDef<Record<string, unknown>, unknown>[]
            }
            searchPlaceholder="Search IP address, CIDR, or gateway description..."
            searchKeys={['ipAddress', 'description', 'environment', 'id']}
            dateKey="addedDate"
            exportFilename="crosx-ip-whitelist.csv"
            facets={[
              {
                key: 'status',
                label: 'Status',
                options: [
                  { label: 'Active', value: 'active' },
                  { label: 'Disabled', value: 'disabled' },
                ],
              },
              {
                key: 'environment',
                label: 'Environment',
                options: [
                  { label: 'Production', value: 'Production' },
                  { label: 'Partner Relay', value: 'Partner Relay' },
                  { label: 'Staging', value: 'Staging' },
                ],
              },
            ]}
          />

          <Dialog open={addIpOpen} onOpenChange={setAddIpOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add IP Address to Whitelist</DialogTitle>
                <DialogDescription>
                  Only whitelisted IPv4 addresses or CIDR blocks are permitted to sign S2S conversion postbacks.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddIpSubmit} className="space-y-4">
                {ipError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                    {ipError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="new-ip-addr">IPv4 Address or CIDR Block</Label>
                  <Input
                    id="new-ip-addr"
                    placeholder="e.g. 198.51.100.42 or 10.24.0.0/16"
                    value={newIpAddress}
                    onChange={(e) => setNewIpAddress(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-ip-env">Environment</Label>
                  <ThemedSelect
                    id="new-ip-env"
                    ariaLabel="Gateway Environment"
                    value={newIpEnv}
                    onValueChange={(val) =>
                      setNewIpEnv(val as IpWhitelistRecord['environment'])
                    }
                    options={IP_ENV_OPTIONS}
                    searchable={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-ip-desc">Gateway Description</Label>
                  <Input
                    id="new-ip-desc"
                    placeholder="e.g. Mercury Treasury Mumbai Webhook Cluster"
                    value={newIpDesc}
                    onChange={(e) => setNewIpDesc(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddIpOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Add to Whitelist
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
