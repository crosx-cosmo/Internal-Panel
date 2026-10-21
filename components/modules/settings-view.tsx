'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Sliders,
  Sun,
  Moon,
  Bell,
  Shield,
  Cpu,
  Save,
  Check,
  IndianRupee,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import type { SupportedCurrency } from '@/lib/crosx-logic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { Switch, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/controls';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SETTLEMENT_CURRENCY_OPTIONS = [
  { label: 'INR (₹ · Indian Rupee — Default)', value: 'INR', description: 'Standardized reporting & payout currency' },
  { label: 'USD ($ · Converted to INR)', value: 'USD', description: 'Converted via reference FX rate' },
  { label: 'EUR (€ · Converted to INR)', value: 'EUR', description: 'Converted via reference FX rate' },
  { label: 'GBP (£ · Converted to INR)', value: 'GBP', description: 'Converted via reference FX rate' },
];

export function SettingsView() {
  const { settings, updateSettings } = useCrosXStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [draft, setDraft] = useState(settings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(draft);
    toast.success('System preferences and INR exchange rates saved and applied');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Settings
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Configure workspace defaults, INR currency standardization & FX rates, appearance theme, alert routing, and security policies.
          </p>
        </div>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" />
          <span>Save All Settings</span>
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="general" className="gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            <span>General & Currency (INR)</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Sun className="h-3.5 w-3.5" />
            <span>Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            <span>System Preferences</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. GENERAL & CURRENCY */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Workspace & INR Currency Standardization</CardTitle>
              <CardDescription>
                Default organization name, Indian Rupee (INR) settlement standard, and explicit reference FX conversion rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="set-ws-name">Workspace / Network Name</Label>
                <Input
                  id="set-ws-name"
                  value={draft.workspaceName}
                  onChange={(e) =>
                    setDraft({ ...draft, workspaceName: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-curr">Default Settlement & Reporting Currency</Label>
                  <ThemedSelect
                    id="set-curr"
                    ariaLabel="Default Settlement Currency"
                    value={draft.defaultCurrency}
                    onValueChange={(val) =>
                      setDraft({
                        ...draft,
                        defaultCurrency: val as SupportedCurrency,
                      })
                    }
                    options={SETTLEMENT_CURRENCY_OPTIONS}
                    searchable={false}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="set-attr-win">Default Attribution Window (Days)</Label>
                  <Input
                    id="set-attr-win"
                    type="number"
                    value={draft.defaultAttributionWindow}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        defaultAttributionWindow: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* Reference FX Conversion Table to INR */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-[#090D16]">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <IndianRupee className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Reference Exchange Rates to INR (₹)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Foreign-denominated campaign contracts and conversion records are converted to INR using these explicit rates rather than relabeling symbols.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(['USD', 'EUR', 'GBP'] as const).map((curr) => (
                    <div key={curr} className="space-y-1">
                      <Label htmlFor={`fx-rate-${curr}`} className="text-[11px]">
                        1 {curr} in INR (₹)
                      </Label>
                      <Input
                        id={`fx-rate-${curr}`}
                        type="number"
                        step="0.25"
                        value={draft.exchangeRates[curr]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            exchangeRates: {
                              ...draft.exchangeRates,
                              [curr]: Number(e.target.value) || 1,
                            },
                          })
                        }
                        className="h-8 font-mono text-xs tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. APPEARANCE */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Interface Density</CardTitle>
              <CardDescription>
                Switch between CrosX Dark Mode and Light Mode or adjust data table row spacing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer',
                    resolvedTheme === 'dark'
                      ? 'border-blue-600 bg-blue-50/20 dark:border-blue-500 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                      <Moon className="h-4 w-4 text-blue-500" />
                      <span>CrosX Dark Mode</span>
                    </div>
                    {resolvedTheme === 'dark' && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Deep slate canvas (#090D16) with high-contrast tabular metrics for extended AdOps monitoring.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer',
                    resolvedTheme === 'light'
                      ? 'border-blue-600 bg-blue-50/40 dark:border-blue-500'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>CrosX Light Mode</span>
                    </div>
                    {resolvedTheme === 'light' && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Clean daylight surfaces (#FFFFFF) with crisp borders and editorial typography.
                  </p>
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Compact Data Grid Density
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Reduce vertical row padding across All Campaigns and Reports tables
                  </div>
                </div>
                <Switch
                  aria-label="Compact Data Grid Density"
                  checked={draft.compactTableDensity}
                  onCheckedChange={(val) => {
                    setDraft({ ...draft, compactTableDensity: val });
                    updateSettings({ compactTableDensity: val });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. NOTIFICATIONS */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Alerting & Operational Notifications</CardTitle>
              <CardDescription>
                Configure automated alerts for daily cap exhaustion and S2S postback failures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Slack Ops Channel Webhook Alerts
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dispatch instant alerts when partner S2S endpoints return 5xx errors
                  </div>
                </div>
                <Switch
                  aria-label="Slack Ops Channel Webhook Alerts"
                  checked={draft.slackWebhookAlerts}
                  onCheckedChange={(val) =>
                    setDraft({ ...draft, slackWebhookAlerts: val })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Daily Executive Reconciliation Digest (INR)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Send 06:00 IST summary of gross INR revenue, partner payouts, and chargebacks
                  </div>
                </div>
                <Switch
                  aria-label="Daily Executive Reconciliation Digest"
                  checked={draft.dailyDigestEmail}
                  onCheckedChange={(val) =>
                    setDraft({ ...draft, dailyDigestEmail: val })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-cap-alert">
                  Daily Cap Warning Threshold (%)
                </Label>
                <Input
                  id="set-cap-alert"
                  type="number"
                  min={50}
                  max={100}
                  value={draft.capThresholdAlertPercent}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      capThresholdAlertPercent: Number(e.target.value),
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. SECURITY */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Network & Traffic Security Policies</CardTitle>
              <CardDescription>
                Enforce automated click deduplication, proxy/VPN filtering, and strict CIDR verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Strict Disposable Domain & Datacenter IP Filtering
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically reject clicks and submissions originating from known ASN proxy ranges
                  </div>
                </div>
                <Switch
                  aria-label="Strict Disposable Domain Filtering"
                  checked={draft.strictFraudFiltering}
                  onCheckedChange={(val) =>
                    setDraft({ ...draft, strictFraudFiltering: val })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. SYSTEM PREFERENCES */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System & Postback Queue Preferences</CardTitle>
              <CardDescription>
                Configure exponential backoff retries and telemetry retention parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Auto-Retry Failed S2S Postbacks (Exponential Backoff)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Retry non-2xx partner callbacks up to 5 times over 30 minutes
                  </div>
                </div>
                <Switch
                  aria-label="Auto-Retry Failed S2S Postbacks"
                  checked={draft.autoRetryFailedPostbacks}
                  onCheckedChange={(val) =>
                    setDraft({ ...draft, autoRetryFailedPostbacks: val })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
