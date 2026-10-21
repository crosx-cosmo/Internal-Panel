'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Ban,
  Terminal,
  Check,
  Code2,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { Checkbox } from '@/components/ui/controls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { toast } from 'sonner';

const AVAILABLE_SCOPES = [
  'campaigns:read',
  'campaigns:write',
  'clicks:write',
  'conversions:write',
  'reports:read',
  'postbacks:trigger',
];

const API_ENV_OPTIONS = [
  { label: 'Production (cx_live_)', value: 'live' },
  { label: 'Sandbox / Staging (cx_test_)', value: 'sandbox' },
];

const API_REFERENCE_ENDPOINTS = [
  {
    method: 'GET',
    path: '/v1/campaigns',
    summary: 'List active campaigns, INR-standardized payout rates, and daily conversion caps.',
    curl: `curl -X GET "https://api.crosx.internal/v1/campaigns?status=active" \\
  -H "Authorization: Bearer cx_live_98a4_secret" \\
  -H "Accept: application/json"`,
    response: `{
  "object": "list",
  "data": [
    {
      "id": "CMP-8492",
      "name": "Vanguard NeoBank Premier Card",
      "payout_type": "CPA",
      "payout_amount": 5712.00,
      "currency": "INR",
      "daily_cap": 800
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/v1/conversions/ingest',
    summary: 'Record a verified server-to-server conversion event by click_id in INR.',
    curl: `curl -X POST "https://api.crosx.internal/v1/conversions/ingest" \\
  -H "Authorization: Bearer cx_live_98a4_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "click_id": "cx_clk_9948210a",
    "campaign_id": "CMP-8492",
    "event_type": "KYC_Approved",
    "payout": 5712.00,
    "currency": "INR"
  }'`,
    response: `{
  "conversion_id": "conv_8821909",
  "status": "approved",
  "settled_payout_inr": 5712.00,
  "postback_dispatched": true,
  "latency_ms": 14
}`,
  },
  {
    method: 'POST',
    path: '/v1/submissions/validate',
    summary: 'Validate and ingest lead attributes against a bound CrosX Template.',
    curl: `curl -X POST "https://api.crosx.internal/v1/submissions/validate" \\
  -H "Authorization: Bearer cx_live_98a4_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "TPL-401",
    "campaign_id": "CMP-8492",
    "payload": {
      "full_name": "Aarav Mehta",
      "work_email": "aarav@enterprise.in",
      "annual_income_inr": 1800000
    }
  }'`,
    response: `{
  "submission_id": "SUB-99219",
  "schema_valid": true,
  "status": "verified"
}`,
  },
];

export function ApiView() {
  const { apiKeys, createApiKey, revokeApiKey } = useCrosXStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState<'live' | 'sandbox'>('live');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'campaigns:read',
    'conversions:write',
  ]);
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, label: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCreateKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim() || keyName.trim().length < 3) {
      toast.error('Enter a descriptive name for the API key');
      return;
    }
    const { rawSecret } = createApiKey(keyName.trim(), keyEnv, selectedScopes);
    setNewlyCreatedSecret(rawSecret);
    setKeyName('');
    toast.success('API key provisioned');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            API Keys & Developer Reference
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Provision scoped bearer tokens for programmatic campaign management, S2S ingestion, and BI warehouse exports.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setNewlyCreatedSecret(null);
            setCreateModalOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create API Key</span>
        </Button>
      </div>

      {/* API Keys Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Provisioned API Keys</CardTitle>
          <CardDescription>
            Keys authenticate requests via the <code className="font-mono text-xs">Authorization: Bearer</code> HTTP header.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-[#090D16]/60 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Key Name & Scopes</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Token Prefix</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Created Date</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Last Used</th>
                <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/70">
              {apiKeys.map((k) => (
                <tr
                  key={k.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {k.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {k.scopes.join(' · ')}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {k.maskedKey}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusIndicator status={k.status} />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {k.createdAt}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {k.lastUsed}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyText(
                            `${k.prefix}_secret_token_${k.id.toLowerCase()}`,
                            k.name,
                            k.id
                          )
                        }
                        className="h-7 px-2.5 text-xs"
                      >
                        {copiedId === k.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>Copy Key</span>
                      </Button>

                      {k.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            revokeApiKey(k.id);
                            toast.success(`Revoked API key ${k.prefix}`);
                          }}
                          className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Revoke</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* API Documentation / Reference UI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CrosX Core API Reference (v1 · INR Standard)</CardTitle>
              <CardDescription>
                Base URL: <code className="font-mono text-blue-600 dark:text-blue-400">https://api.crosx.internal/v1</code> · Content-Type: <code className="font-mono">application/json</code>
              </CardDescription>
            </div>
            <Code2 className="h-5 w-5 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {API_REFERENCE_ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#090D16]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {ep.path}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {ep.summary}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Terminal className="h-3 w-3" /> cURL Request
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(ep.curl, `${ep.method} ${ep.path} snippet`, ep.path)
                      }
                      className="text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                    >
                      Copy Snippet
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] text-slate-200 dark:border-slate-800">
                    {ep.curl}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    200 OK Response Payload
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 dark:border-slate-800">
                    {ep.response}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Generate a scoped bearer key for external services or warehouse pipelines.
            </DialogDescription>
          </DialogHeader>

          {newlyCreatedSecret ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
                Save this secret key now. For security, the full token will not be shown again.
              </div>
              <div className="space-y-1.5">
                <Label>Secret API Token</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={newlyCreatedSecret}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      handleCopyText(newlyCreatedSecret, 'new API secret', 'new-secret')
                    }
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" onClick={() => setCreateModalOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateKeySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="api-key-name">Key Name / Description</Label>
                <Input
                  id="api-key-name"
                  placeholder="e.g. BigQuery Attribution Sync Worker"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="api-key-env">Environment</Label>
                <ThemedSelect
                  id="api-key-env"
                  ariaLabel="API Key Environment"
                  value={keyEnv}
                  onValueChange={(val) =>
                    setKeyEnv(val as 'live' | 'sandbox')
                  }
                  options={API_ENV_OPTIONS}
                  searchable={false}
                />
              </div>

              <div className="space-y-2">
                <Label>Permission Scopes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map((scope) => {
                    const checked = selectedScopes.includes(scope);
                    return (
                      <label
                        key={scope}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs font-mono cursor-pointer dark:border-slate-800"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val) => {
                            if (val) {
                              setSelectedScopes((prev) => [...prev, scope]);
                            } else {
                              setSelectedScopes((prev) =>
                                prev.filter((s) => s !== scope)
                              );
                            }
                          }}
                        />
                        <span>{scope}</span>
                      </label>
                    );
                  })}
                </div>
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
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Generate Key</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
