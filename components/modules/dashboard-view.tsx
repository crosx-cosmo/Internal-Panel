'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Megaphone,
  IndianRupee,
  MousePointerClick,
  Repeat,
  ArrowUpRight,
  PlusCircle,
  Webhook,
  FileCode2,
  FileSpreadsheet,
  Sliders,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import {
  calculateDashboardKPIs,
  formatINR,
  formatCompactINR,
  formatCompactNumber,
  getCampaignRevenueInINR,
  getCampaignUnitPayoutInINR,
} from '@/lib/crosx-logic';
import { PERFORMANCE_TIME_SERIES } from '@/lib/mock-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { cn } from '@/lib/utils';

export function DashboardView() {
  const { campaigns, activityLogs, settings, setActiveSection } = useCrosXStore();
  const [chartMetric, setChartMetric] = useState<'financial' | 'traffic'>('financial');
  const [timeWindow, setTimeWindow] = useState<'7d' | '14d'>('14d');

  const kpis = useMemo(
    () => calculateDashboardKPIs(campaigns, settings.exchangeRates),
    [campaigns, settings.exchangeRates]
  );

  const chartData = useMemo(() => {
    return timeWindow === '7d'
      ? PERFORMANCE_TIME_SERIES.slice(-7)
      : PERFORMANCE_TIME_SERIES;
  }, [timeWindow]);

  const topCampaigns = useMemo(() => {
    return [...campaigns]
      .sort(
        (a, b) =>
          getCampaignRevenueInINR(b, settings.exchangeRates) -
          getCampaignRevenueInINR(a, settings.exchangeRates)
      )
      .slice(0, 5);
  }, [campaigns, settings.exchangeRates]);

  const categoryAnalytics = useMemo(() => {
    const map = new Map<
      string,
      { category: string; revenueInr: number; conversions: number; clicks: number }
    >();
    for (const c of campaigns) {
      const existing = map.get(c.category) ?? {
        category: c.category,
        revenueInr: 0,
        conversions: 0,
        clicks: 0,
      };
      existing.revenueInr += getCampaignRevenueInINR(c, settings.exchangeRates);
      existing.conversions += c.conversions;
      existing.clicks += c.clicks;
      map.set(c.category, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.revenueInr - a.revenueInr);
  }, [campaigns, settings.exchangeRates]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Network Operations Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Real-time attribution performance, INR-standardized campaign yield, and S2S postback telemetry across active offers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSection('reports-conversion')}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Conversion Ledger</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSection('campaign-all')}
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span>All Campaigns ({campaigns.length})</span>
          </Button>
        </div>
      </div>

      {/* 4 Core KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Campaign</span>
            <Megaphone className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {kpis.totalCampaigns}
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              {kpis.activeCampaigns} active · {kpis.totalCampaigns - kpis.activeCampaigns} paused/draft
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Across 6 vertical categories · 99.98% tracking uptime
          </div>
        </Card>

        <Card className="p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Revenue (INR)</span>
            <IndianRupee className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <div className="font-mono text-lg sm:text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {formatINR(kpis.totalRevenue)}
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +14.8%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Net margin {kpis.netMargin}% · Avg EPC {formatINR(kpis.epc)}
          </div>
        </Card>

        <Card className="p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Click</span>
            <MousePointerClick className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {formatCompactNumber(kpis.totalClicks)}
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +9.2%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            16ms median redirect latency · 96.4% unique traffic
          </div>
        </Card>

        <Card className="p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Conversion</span>
            <Repeat className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {formatCompactNumber(kpis.totalConversions)}
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +18.4%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Mean CVR {kpis.conversionRate}% · Partner Payout {formatCompactINR(kpis.totalPayout)}
          </div>
        </Card>
      </div>

      {/* Performance Overview + Revenue/Conversion Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div>
              <CardTitle>Performance Overview (INR)</CardTitle>
              <CardDescription>
                Daily gross revenue (₹), partner payout (₹), and click-to-conversion trajectory.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-[#090D16] shrink-0">
                <button
                  type="button"
                  onClick={() => setChartMetric('financial')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                    chartMetric === 'financial'
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  Revenue & Payout (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('traffic')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                    chartMetric === 'traffic'
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  Clicks & Conversions
                </button>
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-[#090D16] shrink-0">
                <button
                  type="button"
                  onClick={() => setTimeWindow('7d')}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                    timeWindow === '7d'
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setTimeWindow('14d')}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                    timeWindow === '14d'
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  14D
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMetric === 'financial' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => formatCompactINR(Number(val))}
                    />
                    <RechartsTooltip
                      formatter={(val: unknown) => [formatINR(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: '#0F1623',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Gross Revenue (INR)"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#revGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="payout"
                      name="Partner Payout (INR)"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#payGrad)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${(Number(val) / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0F1623',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Bar
                      dataKey="clicks"
                      name="Total Clicks"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="conversions"
                      name="Verified Conversions"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue & Conversion Analytics by Vertical */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle>Revenue / Conversion Analytics</CardTitle>
            <CardDescription>
              Vertical share by INR gross revenue and conversion efficiency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryAnalytics.map((item) => {
              const sharePercent =
                kpis.totalRevenue > 0
                  ? Math.round((item.revenueInr / kpis.totalRevenue) * 100)
                  : 0;
              const cvr =
                item.clicks > 0
                  ? ((item.conversions / item.clicks) * 100).toFixed(2)
                  : '0.00';
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.category}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                      {formatINR(item.revenueInr)} · {cvr}% CVR
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.max(6, sharePercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                    <span>{formatCompactNumber(item.conversions)} conversions</span>
                    <span>{sharePercent}% of network revenue</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Campaigns Table + Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Performing Campaigns */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Top Performing Campaigns (INR)</CardTitle>
              <CardDescription>
                Ranked by attributed gross revenue in Indian Rupees (₹) and daily conversion velocity.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection('campaign-all')}
              className="text-xs"
            >
              View All ({campaigns.length})
            </Button>
          </CardHeader>
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-[#090D16]/60 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Campaign</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Clicks</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Conversions</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Revenue (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {topCampaigns.map((camp) => {
                  const unitInr = getCampaignUnitPayoutInINR(camp, settings.exchangeRates);
                  const revInr = getCampaignRevenueInINR(camp, settings.exchangeRates);
                  return (
                    <tr
                      key={camp.id}
                      onClick={() => setActiveSection('campaign-all')}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {camp.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {camp.id} · {camp.brand} · {camp.payoutType} {formatINR(unitInr)}
                          {camp.currency !== 'INR' ? ` (${camp.currency} ${camp.payoutAmount})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusIndicator status={camp.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCompactNumber(camp.clicks)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCompactNumber(camp.conversions)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatINR(revInr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions + Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Direct operational shortcuts for AdOps teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection('campaign-create')}
                className="justify-start h-9 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Launch Campaign</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection('postback-global')}
                className="justify-start h-9 text-xs"
              >
                <Webhook className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Test Postback</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection('template-create')}
                className="justify-start h-9 text-xs"
              >
                <FileCode2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Build Template</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection('api')}
                className="justify-start h-9 text-xs"
              >
                <Sliders className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                <span>API Keys</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Real-time audit trail of operator & engine events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {activityLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-0.5 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 dark:border-slate-800/60"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {log.target}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    By {log.actor}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
