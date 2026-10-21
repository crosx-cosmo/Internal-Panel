'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import {
  calculateDashboardKPIs,
  calculateReferralMetrics,
  calculateTrackerMetrics,
  formatINR,
} from '@/lib/crosx-logic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GeminiInsightResult {
  title: string;
  summary: string;
  statusAssessment: 'nominal' | 'attention_required' | 'action_recommended';
  keyFindings: string[];
  recommendedActions: string[];
  modelUsed: string;
  generatedAt: string;
}

export function GeminiAiOperationsPanel({
  defaultFocus = 'referral_audit',
  compact = false,
}: {
  defaultFocus?: 'referral_audit' | 'tracker_diagnostics' | 'campaign_economics';
  compact?: boolean;
}) {
  const { campaigns, referrals, trackers, settings } = useCrosXStore();
  const [focusArea, setFocusArea] = useState<string>(defaultFocus);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<GeminiInsightResult | null>(null);
  const didInitialFetch = useRef(false);

  const runAnalysis = async (
    selectedFocus: string,
    promptOverride?: string,
    silent = false
  ) => {
    setLoading(true);
    setFocusArea(selectedFocus);
    try {
      const kpis = calculateDashboardKPIs(campaigns, settings.exchangeRates);
      const refMetrics = calculateReferralMetrics(referrals, settings.exchangeRates);
      const trkMetrics = calculateTrackerMetrics(trackers);

      const snapshot = {
        totalCampaigns: kpis.totalCampaigns,
        activeCampaigns: kpis.activeCampaigns,
        totalRevenueFormatted: formatINR(kpis.totalRevenue),
        totalPayoutFormatted: formatINR(kpis.totalPayout),
        netMarginPercent: kpis.netMargin,
        totalReferrals: refMetrics.totalReferrals,
        pendingReferrals: refMetrics.pendingReferrals,
        approvedReferrals: refMetrics.approvedReferrals,
        rejectedReferrals: refMetrics.rejectedReferrals,
        referralConversions: refMetrics.referralConversions,
        approvedPayoutFormatted: formatINR(refMetrics.approvedPayoutTotalInr),
        pendingPayoutFormatted: formatINR(refMetrics.pendingPayoutTotalInr),
        flaggedSameUpiCount: refMetrics.flaggedSameUpiCount,
        totalTrackers: trkMetrics.totalTrackers,
        activeTrackers: trkMetrics.activeTrackers,
        avgLatencyMs: trkMetrics.avgLatencyMs,
        totalTrackedPayoutFormatted: formatINR(trkMetrics.totalTrackedPayoutInr),
      };

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focusArea: selectedFocus,
          customPrompt: promptOverride !== undefined ? promptOverride : customPrompt,
          snapshot,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as GeminiInsightResult;
      setInsight(data);
      if (!silent) {
        toast.success('Gemini AI operational analysis updated');
      }
    } catch {
      if (!silent) {
        toast.error('Unable to reach Gemini AI endpoint');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!didInitialFetch.current) {
      didInitialFetch.current = true;
      void runAnalysis(defaultFocus, '', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFocus]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) {
      runAnalysis(focusArea, '');
      return;
    }
    runAnalysis('custom_query', customPrompt.trim());
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className={cn('pb-3', compact && 'p-4 pb-3')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                Gemini AI Studio — Operations & Attribution Intelligence
              </CardTitle>
              <CardDescription className="text-xs">
                Server-side <code className="font-mono text-[11px]">@google/genai</code> diagnostics across INR referral ledgers, Same-UPI fraud flags, and S2S trackers.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={focusArea === 'referral_audit' && insight ? 'default' : 'outline'}
              disabled={loading}
              onClick={() => runAnalysis('referral_audit', '')}
              className="h-7 px-2.5 text-xs"
            >
              <RefreshCw className={cn('h-3 w-3', loading && focusArea === 'referral_audit' && 'animate-spin')} />
              <span>Audit Referrals & UPI</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={focusArea === 'tracker_diagnostics' && insight ? 'default' : 'outline'}
              disabled={loading}
              onClick={() => runAnalysis('tracker_diagnostics', '')}
              className="h-7 px-2.5 text-xs"
            >
              <RefreshCw className={cn('h-3 w-3', loading && focusArea === 'tracker_diagnostics' && 'animate-spin')} />
              <span>Analyze Trackers</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={focusArea === 'campaign_economics' && insight ? 'default' : 'outline'}
              disabled={loading}
              onClick={() => runAnalysis('campaign_economics', '')}
              className="h-7 px-2.5 text-xs"
            >
              <RefreshCw className={cn('h-3 w-3', loading && focusArea === 'campaign_economics' && 'animate-spin')} />
              <span>INR Margin Brief</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-4', compact && 'p-4 pt-0')}>
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
          <Input
            aria-label="Ask Gemini AI about referrals, trackers, or campaign margins"
            placeholder="Ask Gemini AI about Same-UPI collisions, pending INR referral payouts, or S2S latency..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="h-8 px-3 text-xs shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Run Query</span>
          </Button>
        </form>

        {insight && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 dark:border-slate-800 dark:bg-[#090D16]/90">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-2.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {insight.statusAssessment === 'attention_required' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {insight.title}
                </h3>
              </div>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Model: {insight.modelUsed} · INR Ledger Grounded
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {insight.summary}
            </p>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 pt-1">
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-200">
                  Key Quantitative Findings
                </div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {insight.keyFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                        0{idx + 1}.
                      </span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-200">
                  Recommended Operator Actions
                </div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {insight.recommendedActions.map((act, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
