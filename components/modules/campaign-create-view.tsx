'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { motion, useReducedMotion } from 'motion/react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Save,
  Rocket,
  Link2,
  FileCode2,
  IndianRupee,
  Sliders,
  ShieldCheck,
  Calendar,
  Upload,
  Trash2,
  RefreshCw,
  Plus,
  Bell,
  AlertTriangle,
  Cpu,
  Eye,
  Lock,
  Sparkles,
  Layout,
  Code,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import {
  convertToINR,
  formatINR,
  formatCompactNumber,
  calculateProfitMargins,
  MACRO_TOKEN_LIBRARY,
  buildExampleTrackingUrl,
  generateUniqueOfferId,
  isOfferIdUnique,
  isValidIPv4OrCIDR,
  DEFAULT_ADVANCED_OPTIONS,
  getSelectOptionsForTemplateField,
  buildDefaultTemplatePreviewValues,
  validateTemplatePreviewSubmission,
  type TemplateSubmissionValidationResult,
  type SupportedCurrency,
  type TrackingMethod,
  type CampaignLogoAsset,
  type CampaignConversionEvent,
  type CampaignEventAlert,
  type CampaignAdvancedOptions,
  type CustomPayoutOverrideRule,
} from '@/lib/crosx-logic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { Switch, Checkbox } from '@/components/ui/controls';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WizardFormValues {
  // Step 01: Basic Details
  offerId: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  startDate: string;
  endDate: string;
  totalCap: number;
  unlimitedCap: boolean;
  // Step 02: Tracking Details
  trackingMethod: TrackingMethod;
  trackingUrl: string;
  clickTrackingEnabled: boolean;
  conversionTrackingEnabled: boolean;
  attributionWindowDays: number;
  attributionModel: 'last_touch' | 'first_touch' | 'linear' | 'time_decay';
  postbackOverrideUrl: string;
  // Step 03: Template Selection
  templateId: string;
  // Step 04: Payout Configuration
  payoutType: string;
  advertiserPayout: number;
  payoutAmount: number;
  referralPayout: number;
  currency: SupportedCurrency;
  payableEventId: string;
  conversionCondition: string;
}

const STEPS = [
  { id: 1, number: '01', title: 'Basic Details', subtitle: 'Offer ID, brand, caps & logo', icon: Sliders },
  { id: 2, number: '02', title: 'Tracking Details', subtitle: 'Method, macros & events', icon: Link2 },
  { id: 3, number: '03', title: 'Template Selection', subtitle: 'Schema & payload binding', icon: FileCode2 },
  { id: 4, number: '04', title: 'Payout Config', subtitle: 'Margins & payable event', icon: IndianRupee },
  { id: 5, number: '05', title: 'Advanced Options', subtitle: 'Referral, overrides & UPI', icon: Cpu },
  { id: 6, number: '06', title: 'Review & Publish', subtitle: 'Audit contract & launch', icon: ShieldCheck },
];

const VERTICAL_SUGGESTIONS = [
  'Fintech',
  'Banking',
  'Mutual Funds',
  'E-commerce',
  'Gaming',
  'Education',
  'Insurance',
  'B2B SaaS',
  'Cybersecurity',
  'CleanTech',
];

const PAYOUT_MODEL_PRESETS = [
  'CPA',
  'CPL',
  'CPI',
  'CPS',
  'Revenue Share',
  'Hybrid CPA + RevShare',
  'Custom Milestone',
];

const STATUS_OPTIONS = [
  { label: 'Active (Immediate Routing)', value: 'active' },
  { label: 'Paused (Hold Traffic)', value: 'paused' },
  { label: 'Draft (Internal Review)', value: 'draft' },
];

const TRACKING_METHOD_OPTIONS: { label: string; value: TrackingMethod; description: string }[] = [
  {
    label: 'S2S (Server-to-Server Postback)',
    value: 'S2S',
    description: 'Deterministic server-side callback with click ID {c} and primary sub ID {x}',
  },
  {
    label: 'GET (HTTP GET Redirect / Callback)',
    value: 'GET',
    description: 'Standard HTTP GET redirect parameter forwarding with macro interpolation',
  },
  {
    label: 'Browser Pixel (Client Image / JS Pixel)',
    value: 'Browser Pixel',
    description: 'First-party cookie & browser conversion pixel fired on thank-you DOM load',
  },
  {
    label: 'CRM (Webhook / Batch Ingestion)',
    value: 'CRM',
    description: 'Downstream CRM webhook callback when lead stage transitions to qualified',
  },
  {
    label: 'Offer Code (Promo Code Attribution)',
    value: 'Offer Code',
    description: 'Cookieless code redemption tracking mapped to publisher sub-identifier',
  },
];

const ATTRIBUTION_MODEL_OPTIONS = [
  { label: 'Last Touch (Standard S2S)', value: 'last_touch' },
  { label: 'First Touch', value: 'first_touch' },
  { label: 'Linear Multi-Touch', value: 'linear' },
  { label: 'Time Decay', value: 'time_decay' },
];

const CURRENCY_OPTIONS = [
  { label: 'INR (₹ · Default Reporting)', value: 'INR', description: 'Native Indian Rupee settlement (1:1)' },
  { label: 'USD ($ · Converted to INR)', value: 'USD', description: 'Converted via reference FX rate' },
  { label: 'EUR (€ · Converted to INR)', value: 'EUR', description: 'Converted via reference FX rate' },
  { label: 'GBP (£ · Converted to INR)', value: 'GBP', description: 'Converted via reference FX rate' },
];

const ALERT_TRIGGER_OPTIONS = [
  { label: 'Repeated Tracking Failures', value: 'repeated_tracking_failures' },
  { label: 'Low Conversion Volume Drop', value: 'low_conversion_volume' },
  { label: 'Rejected Events Spike', value: 'rejected_events_spike' },
  { label: 'Cap Reached Threshold (%)', value: 'cap_reached_threshold' },
];

const ALERT_SEVERITY_OPTIONS = [
  { label: 'Critical (Pager / Immediate)', value: 'critical' },
  { label: 'Warning (Ops Alert)', value: 'warning' },
  { label: 'Info (Audit Digest)', value: 'info' },
];

const ALERT_CHANNEL_OPTIONS = [
  { label: 'Slack Ops Channel (#adtech-alerts)', value: 'slack_ops' },
  { label: 'Partner Webhook Relay', value: 'webhook_relay' },
  { label: 'Daily Email Digest', value: 'email_digest' },
];

const REFERRAL_ELIGIBILITY_OPTIONS = [
  { label: 'All Verified Users', value: 'all_verified_users' },
  { label: 'Tier-1 Partners Only', value: 'tier1_partners_only' },
  { label: 'KYC Completed Users Only', value: 'kyc_completed_only' },
];

const REFERRAL_ATTRIBUTION_OPTIONS = [
  { label: 'First Referrer Wins', value: 'first_referrer' },
  { label: 'Last Referrer Wins', value: 'last_referrer' },
];

const SAME_UPI_POLICY_OPTIONS = [
  { label: 'Flag for Manual Fraud Review (Hold Settlement)', value: 'manual_fraud_review' },
  { label: 'Restrict Payout Until Enhanced KYC', value: 'restrict_payout_until_kyc' },
  { label: 'Audit Log Only (Allow Settlement)', value: 'audit_log_only' },
];

const INITIAL_CONVERSION_EVENTS: CampaignConversionEvent[] = [
  {
    id: 'evt_kyc_approved',
    name: 'KYC Approved',
    identifier: 'kyc_approved',
    description: 'PAN & Aadhaar video KYC verification completed',
    active: true,
    payoutMappingInr: 1200,
    isProtectedHistorical: true,
  },
  {
    id: 'evt_account_funded',
    name: 'First Account Deposit',
    identifier: 'account_funded',
    description: 'Initial deposit >= ₹5,000 settled via UPI or IMPS',
    active: true,
    payoutMappingInr: 5460,
  },
];

const INITIAL_EVENT_ALERTS: CampaignEventAlert[] = [
  {
    id: 'alt_default_1',
    eventIdentifier: 'account_funded',
    triggerCondition: 'repeated_tracking_failures',
    thresholdValue: '5 consecutive S2S callback errors in 10m',
    severity: 'critical',
    channel: 'slack_ops',
    enabled: true,
  },
];

function createSampleBrandLogoDataUrl(brandText: string, offerId: string): CampaignLogoAsset {
  const initials = (brandText || 'CX')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1d4ed8"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="32" fill="url(#g)"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="700" font-size="56">${initials}</text>
  </svg>`;
  const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const cleanFile = `${(brandText || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-emblem.png`;
  return {
    fileName: cleanFile,
    mimeType: 'image/png',
    sizeBytes: 18432,
    storagePath: `storage://crosx-assets/campaigns/${offerId || 'OFR-NEW'}/${cleanFile}`,
    dataUrl: encoded,
    uploadedAt: new Date().toISOString(),
  };
}

export function CampaignCreateView() {
  const {
    campaigns,
    templates,
    settings,
    addCampaign,
    updateCampaign,
    setActiveSection,
    editingWizardCampaignId,
    setEditingWizardCampaignId,
  } = useCrosXStore();

  const prefersReducedMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  const editingCampaign = useMemo(
    () => campaigns.find((c) => c.id === editingWizardCampaignId) ?? null,
    [campaigns, editingWizardCampaignId]
  );

  const defaultOfferId = useMemo(
    () =>
      editingCampaign?.offerId ||
      generateUniqueOfferId(campaigns.map((c) => c.offerId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingCampaign?.id]
  );

  const [logoAsset, setLogoAsset] = useState<CampaignLogoAsset | null>(
    editingCampaign?.logoAsset ?? null
  );
  const [conversionEvents, setConversionEvents] = useState<CampaignConversionEvent[]>(
    editingCampaign?.conversionEvents?.length
      ? editingCampaign.conversionEvents
      : INITIAL_CONVERSION_EVENTS
  );
  const [eventAlerts, setEventAlerts] = useState<CampaignEventAlert[]>(
    editingCampaign?.eventAlerts ?? INITIAL_EVENT_ALERTS
  );
  const [advancedOptions, setAdvancedOptions] = useState<CampaignAdvancedOptions>(
    editingCampaign?.advancedOptions ?? { ...DEFAULT_ADVANCED_OPTIONS }
  );

  // Local inputs for adding a new Conversion Event in Step 02
  const [newEvtName, setNewEvtName] = useState('');
  const [newEvtIdentifier, setNewEvtIdentifier] = useState('');
  const [newEvtDesc, setNewEvtDesc] = useState('');
  const [newEvtPayoutInr, setNewEvtPayoutInr] = useState<number>(1500);

  // Local inputs for adding an Event Alert in Step 02
  const [newAlertEventId, setNewAlertEventId] = useState<string>(
    INITIAL_CONVERSION_EVENTS[0]?.identifier ?? 'kyc_approved'
  );
  const [newAlertCondition, setNewAlertCondition] =
    useState<CampaignEventAlert['triggerCondition']>('repeated_tracking_failures');
  const [newAlertThreshold, setNewAlertThreshold] = useState('5 failures in 15 mins');
  const [newAlertSeverity, setNewAlertSeverity] =
    useState<CampaignEventAlert['severity']>('warning');
  const [newAlertChannel, setNewAlertChannel] =
    useState<CampaignEventAlert['channel']>('slack_ops');

  // Local inputs for adding a Custom Payout Override in Step 05
  const [overrideEventId, setOverrideEventId] = useState<string>(
    INITIAL_CONVERSION_EVENTS[0]?.identifier ?? 'kyc_approved'
  );
  const [overrideAdvInr, setOverrideAdvInr] = useState<number>(8500);
  const [overrideUserInr, setOverrideUserInr] = useState<number>(6200);
  const [overrideRefInr, setOverrideRefInr] = useState<number>(350);

  const form = useForm<WizardFormValues>({
    defaultValues: {
      offerId: defaultOfferId,
      name: editingCampaign?.name ?? '',
      brand: editingCampaign?.brand ?? '',
      category: editingCampaign?.category ?? 'Fintech',
      description: editingCampaign?.description ?? '',
      status:
        editingCampaign?.status === 'completed'
          ? 'active'
          : editingCampaign?.status ?? 'active',
      startDate: editingCampaign?.startDate ?? '2026-10-19',
      endDate: editingCampaign?.endDate ?? '2026-12-31',
      totalCap: editingCampaign?.totalCap ?? editingCampaign?.dailyCap ?? 5000,
      unlimitedCap: editingCampaign?.unlimitedCap ?? false,
      trackingMethod: editingCampaign?.trackingMethod ?? 'S2S',
      trackingUrl:
        editingCampaign?.trackingUrl ??
        buildExampleTrackingUrl('S2S', defaultOfferId),
      clickTrackingEnabled: editingCampaign?.clickTrackingEnabled ?? true,
      conversionTrackingEnabled: editingCampaign?.conversionTrackingEnabled ?? true,
      attributionWindowDays: editingCampaign?.attributionWindowDays ?? 30,
      attributionModel: editingCampaign?.attributionModel ?? 'last_touch',
      postbackOverrideUrl:
        editingCampaign?.postbackOverrideUrl ??
        'https://relay.crosx-partners.io/v2/s2s/postback?c={c}&x={x}&offer_id={offer_id}&payout={payout}',
      templateId: editingCampaign?.templateId ?? templates[0]?.id ?? 'TPL-401',
      payoutType: editingCampaign?.payoutType ?? 'CPA',
      advertiserPayout: editingCampaign?.advertiserPayout ?? 7800,
      payoutAmount: editingCampaign?.payoutAmount ?? 5460,
      referralPayout: editingCampaign?.referralPayout ?? 250,
      currency: editingCampaign?.currency ?? 'INR',
      payableEventId:
        editingCampaign?.payableEventId ||
        (editingCampaign?.conversionEvents?.[0]?.identifier ?? 'account_funded'),
      conversionCondition:
        editingCampaign?.conversionCondition ?? 'Approved KYC + Account Funded',
    },
  });

  useEffect(() => {
    if (editingCampaign) {
      form.reset({
        offerId: editingCampaign.offerId,
        name: editingCampaign.name,
        brand: editingCampaign.brand,
        category: editingCampaign.category,
        description: editingCampaign.description,
        status:
          editingCampaign.status === 'completed' ? 'active' : editingCampaign.status,
        startDate: editingCampaign.startDate,
        endDate: editingCampaign.endDate,
        totalCap: editingCampaign.totalCap ?? editingCampaign.dailyCap ?? 5000,
        unlimitedCap: editingCampaign.unlimitedCap ?? false,
        trackingMethod: editingCampaign.trackingMethod ?? 'S2S',
        trackingUrl: editingCampaign.trackingUrl,
        clickTrackingEnabled: editingCampaign.clickTrackingEnabled,
        conversionTrackingEnabled: editingCampaign.conversionTrackingEnabled,
        attributionWindowDays: editingCampaign.attributionWindowDays,
        attributionModel: editingCampaign.attributionModel,
        postbackOverrideUrl: editingCampaign.postbackOverrideUrl ?? '',
        templateId: editingCampaign.templateId,
        payoutType: editingCampaign.payoutType,
        advertiserPayout:
          editingCampaign.advertiserPayout ?? editingCampaign.payoutAmount,
        payoutAmount: editingCampaign.payoutAmount,
        referralPayout: editingCampaign.referralPayout ?? 0,
        currency: editingCampaign.currency,
        payableEventId:
          editingCampaign.payableEventId ||
          editingCampaign.conversionEvents?.[0]?.identifier ||
          'account_funded',
        conversionCondition: editingCampaign.conversionCondition,
      });
      setLogoAsset(editingCampaign.logoAsset ?? null);
      setConversionEvents(
        editingCampaign.conversionEvents?.length
          ? editingCampaign.conversionEvents
          : INITIAL_CONVERSION_EVENTS
      );
      setEventAlerts(editingCampaign.eventAlerts ?? []);
      setAdvancedOptions(
        editingCampaign.advancedOptions ?? { ...DEFAULT_ADVANCED_OPTIONS }
      );
    }
  }, [editingCampaign, form]);

  const watched = form.watch();
  const selectedTemplate =
    templates.find((t) => t.id === watched.templateId) ?? templates[0];

  // Step 03: Select Template Dropdown Options & Interactive Live Form Preview State
  const templateOptions = useMemo(
    () =>
      templates.map((tpl) => ({
        label: tpl.name,
        value: tpl.id,
        badge: `${tpl.id} · ${tpl.type}`,
        description: `${tpl.fields.length} schema fields · Used by ${tpl.usageCount} campaigns · Updated ${tpl.updatedAt}`,
      })),
    [templates]
  );

  const [templatePreviewTab, setTemplatePreviewTab] = useState<'live_form' | 'schema_json'>('live_form');
  const [templatePreviewViewport, setTemplatePreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [templatePreviewValues, setTemplatePreviewValues] = useState<Record<string, string | boolean>>(() =>
    selectedTemplate ? buildDefaultTemplatePreviewValues(selectedTemplate.fields, true) : {}
  );
  const [templateValidationResult, setTemplateValidationResult] =
    useState<TemplateSubmissionValidationResult | null>(null);

  // Synchronize interactive Live Form Preview values when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      const nextDefaults = buildDefaultTemplatePreviewValues(selectedTemplate.fields, true);
      setTemplatePreviewValues(nextDefaults);
      setTemplateValidationResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id]);

  const handleUpdatePreviewField = (key: string, value: string | boolean) => {
    setTemplatePreviewValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (templateValidationResult) {
      setTemplateValidationResult(null);
    }
  };

  const handleTestTemplateSubmission = () => {
    if (!selectedTemplate) return;
    const result = validateTemplatePreviewSubmission(
      selectedTemplate.fields,
      templatePreviewValues
    );
    setTemplateValidationResult(result);
    if (result.valid) {
      toast.success(
        `Verified "${selectedTemplate.name}" (${selectedTemplate.id}) — all ${selectedTemplate.fields.length} schema fields passed validation`
      );
    } else {
      const issues = [...result.missingFields, ...result.invalidEmailFields];
      toast.error(`Template validation failed: check ${issues.join(', ')}`);
    }
  };

  // Keep offer_id query parameter in trackingUrl synchronized with Step 01 Offer ID
  useEffect(() => {
    const cleanOffer = (watched.offerId || '').trim();
    if (!cleanOffer) return;
    const currentUrl = form.getValues('trackingUrl') || '';
    if (currentUrl.includes('offer_id=')) {
      const updatedUrl = currentUrl.replace(
        /offer_id=[^&]+/,
        `offer_id=${encodeURIComponent(cleanOffer)}`
      );
      if (updatedUrl !== currentUrl) {
        form.setValue('trackingUrl', updatedUrl);
      }
    }
  }, [watched.offerId, form]);

  const offerIdUnique = isOfferIdUnique(
    watched.offerId || '',
    campaigns,
    editingCampaign?.id
  );

  // Convert Advertiser, User, and Referral payouts into INR for standardized margin calculation
  const advConversion = convertToINR(
    Number(watched.advertiserPayout) || 0,
    watched.currency,
    settings.exchangeRates
  );
  const userConversion = convertToINR(
    Number(watched.payoutAmount) || 0,
    watched.currency,
    settings.exchangeRates
  );
  const refConversion = convertToINR(
    Number(watched.referralPayout) || 0,
    watched.currency,
    settings.exchangeRates
  );

  const profitMargins = calculateProfitMargins(
    advConversion.amountInInr,
    userConversion.amountInInr,
    refConversion.amountInInr
  );

  const totalCapExposureInr = watched.unlimitedCap
    ? null
    : userConversion.amountInInr * (Number(watched.totalCap) || 0);

  const exampleMethodUrl = useMemo(
    () => buildExampleTrackingUrl(watched.trackingMethod, watched.offerId),
    [watched.trackingMethod, watched.offerId]
  );

  const coreMacros = useMemo(
    () => MACRO_TOKEN_LIBRARY.filter((m) => m.category === 'core'),
    []
  );
  const subIdMacros = useMemo(
    () => MACRO_TOKEN_LIBRARY.filter((m) => m.category === 'sub_id'),
    []
  );

  const payableEventOptions = useMemo(
    () =>
      conversionEvents.map((evt) => ({
        label: `${evt.name} (${evt.identifier})`,
        value: evt.identifier,
        description: evt.description,
      })),
    [conversionEvents]
  );

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported logo format. Please upload PNG, JPEG, or WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo image must be 2 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const asset: CampaignLogoAsset = {
        fileName: file.name,
        mimeType: file.type as CampaignLogoAsset['mimeType'],
        sizeBytes: file.size,
        storagePath: `storage://crosx-assets/campaigns/${(watched.offerId || 'OFR').trim()}/${file.name}`,
        dataUrl: result,
        uploadedAt: new Date().toISOString(),
      };
      setLogoAsset(asset);
      toast.success(`Uploaded campaign logo "${file.name}"`);
    };
    reader.readAsDataURL(file);
  };

  const handleInsertMacro = (macroSyntax: string, tokenName: string) => {
    const currentUrl = watched.trackingUrl || '';
    const separator = currentUrl.includes('?') ? '&' : '?';
    const nextUrl = `${currentUrl}${separator}${tokenName}=${macroSyntax}`;
    form.setValue('trackingUrl', nextUrl);
    toast.success(`Inserted macro ${macroSyntax} into Tracking URL`);
  };

  const handleAddConversionEvent = () => {
    const cleanName = newEvtName.trim();
    const cleanId = newEvtIdentifier
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_');
    if (!cleanName || !cleanId) {
      toast.error('Provide both an Event Name and a valid Event Identifier.');
      return;
    }
    if (conversionEvents.some((e) => e.identifier.toLowerCase() === cleanId)) {
      toast.error(`Conversion event identifier "${cleanId}" already exists.`);
      return;
    }
    const created: CampaignConversionEvent = {
      id: `evt_${Date.now()}`,
      name: cleanName,
      identifier: cleanId,
      description: newEvtDesc.trim() || 'Verified conversion callback event',
      active: true,
      payoutMappingInr: Number(newEvtPayoutInr) || 0,
      isProtectedHistorical: false,
    };
    const updated = [...conversionEvents, created];
    setConversionEvents(updated);
    if (!watched.payableEventId) {
      form.setValue('payableEventId', created.identifier);
    }
    setNewEvtName('');
    setNewEvtIdentifier('');
    setNewEvtDesc('');
    toast.success(`Added conversion event "${cleanName}" (${cleanId})`);
  };

  const handleRemoveConversionEvent = (evt: CampaignConversionEvent) => {
    if (evt.isProtectedHistorical) {
      toast.error(
        `Event "${evt.identifier}" has protected historical attribution data and cannot be deleted. Toggle it inactive instead.`
      );
      return;
    }
    if (conversionEvents.length <= 1) {
      toast.error('At least one conversion event is required per campaign.');
      return;
    }
    const nextEvents = conversionEvents.filter((item) => item.id !== evt.id);
    setConversionEvents(nextEvents);
    if (watched.payableEventId === evt.identifier && nextEvents[0]) {
      form.setValue('payableEventId', nextEvents[0].identifier);
    }
    toast.success(`Removed conversion event "${evt.identifier}"`);
  };

  const handleAddEventAlert = () => {
    if (!newAlertThreshold.trim()) {
      toast.error('Specify a threshold condition for the event alert.');
      return;
    }
    const alertItem: CampaignEventAlert = {
      id: `alt_${Date.now()}`,
      eventIdentifier: newAlertEventId || conversionEvents[0]?.identifier || 'kyc_approved',
      triggerCondition: newAlertCondition,
      thresholdValue: newAlertThreshold.trim(),
      severity: newAlertSeverity,
      channel: newAlertChannel,
      enabled: true,
    };
    setEventAlerts((prev) => [...prev, alertItem]);
    toast.success(`Added ${alertItem.severity.toUpperCase()} alert for ${alertItem.eventIdentifier}`);
  };

  const handleAddCustomPayoutOverride = () => {
    const rule: CustomPayoutOverrideRule = {
      id: `ovr_${Date.now()}`,
      eventIdentifier: overrideEventId || conversionEvents[0]?.identifier || 'kyc_approved',
      advertiserPayoutInr: Math.max(0, Number(overrideAdvInr) || 0),
      userPayoutInr: Math.max(0, Number(overrideUserInr) || 0),
      referralPayoutInr: Math.max(0, Number(overrideRefInr) || 0),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setAdvancedOptions((prev) => ({
      ...prev,
      customPayoutOverrides: [...prev.customPayoutOverrides, rule],
    }));
    toast.success(`Added custom payout override for event "${rule.eventIdentifier}"`);
  };

  const validateStep = (stepToCheck: number): boolean => {
    setStepError(null);
    if (stepToCheck === 1) {
      if (!watched.name || watched.name.trim().length < 3) {
        setStepError('Campaign Name is required (minimum 3 characters).');
        return false;
      }
      if (!watched.brand || watched.brand.trim().length < 2) {
        setStepError('Brand / Advertiser name is required.');
        return false;
      }
      if (!watched.category || watched.category.trim().length < 2) {
        setStepError('Vertical Category is required.');
        return false;
      }
      if (!watched.offerId || watched.offerId.trim().length < 3) {
        setStepError('Offer ID is required.');
        return false;
      }
      if (!offerIdUnique) {
        setStepError(
          `Offer ID "${watched.offerId.trim()}" is already in use by another campaign. Please enter or generate a unique Offer ID.`
        );
        return false;
      }
      if (
        !watched.unlimitedCap &&
        (Number.isNaN(Number(watched.totalCap)) ||
          Number(watched.totalCap) < 0 ||
          !Number.isInteger(Number(watched.totalCap)))
      ) {
        setStepError('Total Caps must be a non-negative integer.');
        return false;
      }
      if (!watched.description || watched.description.trim().length < 10) {
        setStepError('Description & Traffic Guidelines must be at least 10 characters.');
        return false;
      }
      if (!watched.startDate || !watched.endDate) {
        setStepError('Start Date and End Date are required.');
        return false;
      }
      if (watched.endDate < watched.startDate) {
        setStepError('End Date cannot be earlier than Start Date.');
        return false;
      }
    } else if (stepToCheck === 2) {
      try {
        new URL(watched.trackingUrl);
      } catch {
        setStepError('Tracking URL must be a valid https:// or http:// URL.');
        return false;
      }
      if (conversionEvents.length === 0) {
        setStepError('Configure at least one conversion event in Step 02.');
        return false;
      }
    } else if (stepToCheck === 3) {
      if (!watched.templateId) {
        setStepError('Please select a campaign schema template.');
        return false;
      }
    } else if (stepToCheck === 4) {
      if (!watched.payoutType || watched.payoutType.trim().length === 0) {
        setStepError('Payout Model is required (e.g., CPA, CPL, CPI, CPS, Revenue Share).');
        return false;
      }
      if (Number(watched.advertiserPayout) < 0 || Number.isNaN(Number(watched.advertiserPayout))) {
        setStepError('Advertiser Payout must be a non-negative number.');
        return false;
      }
      if (Number(watched.payoutAmount) < 0 || Number.isNaN(Number(watched.payoutAmount))) {
        setStepError('User Payout must be a non-negative number.');
        return false;
      }
      if (Number(watched.referralPayout) < 0 || Number.isNaN(Number(watched.referralPayout))) {
        setStepError('Referral Payout must be a non-negative number.');
        return false;
      }
      if (!watched.payableEventId) {
        setStepError('Please select a mandatory Payable Event from Step 02.');
        return false;
      }
      if (!watched.conversionCondition || watched.conversionCondition.trim().length < 3) {
        setStepError('Conversion Qualification Condition is required.');
        return false;
      }
    } else if (stepToCheck === 5) {
      if (
        advancedOptions.ipSimulationTestMode &&
        !isValidIPv4OrCIDR(advancedOptions.syntheticTestIp || '')
      ) {
        setStepError('Sandbox Synthetic Test IP must be a valid IPv4 address or CIDR block.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(6, prev + 1));
    }
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const buildCampaignPayload = (overrideStatus?: 'active' | 'paused' | 'draft') => {
    const cleanOfferId =
      watched.offerId.trim() ||
      generateUniqueOfferId(campaigns.map((c) => c.offerId));
    const cleanTotalCap = watched.unlimitedCap
      ? 0
      : Math.max(0, Math.floor(Number(watched.totalCap) || 0));

    return {
      offerId: cleanOfferId,
      name: watched.name.trim() || 'Untitled CrosX Campaign',
      brand: watched.brand.trim() || 'Unassigned Brand',
      category: watched.category.trim() || 'Fintech',
      description: watched.description.trim() || 'Configured via Campaign Wizard V2.',
      status: overrideStatus ?? watched.status,
      startDate: watched.startDate,
      endDate: watched.endDate,
      totalCap: cleanTotalCap,
      unlimitedCap: watched.unlimitedCap,
      logoAsset,
      trackingMethod: watched.trackingMethod,
      trackingUrl: watched.trackingUrl.trim(),
      clickTrackingEnabled: watched.clickTrackingEnabled,
      conversionTrackingEnabled: watched.conversionTrackingEnabled,
      attributionWindowDays: Number(watched.attributionWindowDays) || 30,
      attributionModel: watched.attributionModel,
      postbackOverrideUrl: watched.postbackOverrideUrl?.trim() || undefined,
      conversionEvents,
      eventAlerts,
      templateId: watched.templateId,
      payoutType: watched.payoutType.trim() || 'CPA',
      advertiserPayout: Math.max(0, Number(watched.advertiserPayout) || 0),
      payoutAmount: Math.max(0, Number(watched.payoutAmount) || 0),
      referralPayout: Math.max(0, Number(watched.referralPayout) || 0),
      currency: watched.currency,
      exchangeRateToInr: userConversion.exchangeRateUsed ?? 1,
      payableEventId:
        watched.payableEventId || conversionEvents[0]?.identifier || 'kyc_approved',
      conversionCondition: watched.conversionCondition.trim() || 'Verified Conversion Event',
      dailyCap: cleanTotalCap,
      advancedOptions,
    };
  };

  const handleSaveDraft = () => {
    const payload = buildCampaignPayload('draft');
    if (editingCampaign) {
      updateCampaign(editingCampaign.id, payload);
      setEditingWizardCampaignId(null);
      toast.success(`Updated draft "${payload.name}" (${payload.offerId})`);
    } else {
      addCampaign(payload);
      toast.success(`Saved draft "${payload.name}" (${payload.offerId}) to All Campaigns`);
    }
    setActiveSection('campaign-all');
  };

  const handlePublishCampaign = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    const payload = buildCampaignPayload();
    if (editingCampaign) {
      updateCampaign(editingCampaign.id, payload);
      setEditingWizardCampaignId(null);
      toast.success(
        `Updated campaign "${payload.name}" (${editingCampaign.id} · ${payload.offerId})`
      );
    } else {
      const created = addCampaign(payload);
      toast.success(
        `Published "${created.name}" (${created.id} · ${created.offerId}) — User Payout ${formatINR(userConversion.amountInInr)} (${created.payoutType})`
      );
    }
    setActiveSection('campaign-all');
  };

  const progressPercentage = Math.round((currentStep / 6) * 100);

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800/90">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
            <span>Campaign Wizard V2 · Enterprise Provisioning</span>
            <span>·</span>
            <span>Step 0{currentStep} of 06</span>
            {editingCampaign && (
              <Badge variant="info">Editing {editingCampaign.id}</Badge>
            )}
          </div>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {editingCampaign ? `Edit Campaign · ${editingCampaign.name}` : 'Create Campaign'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Configure Offer ID, multi-method tracking macros, conversion events, INR unit economics & margins, advanced fraud rules, and final contract review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveDraft}>
            <Save className="h-3.5 w-3.5" />
            <span>Save as Draft</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingWizardCampaignId(null);
              setActiveSection('campaign-all');
            }}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* 6-Step Enterprise Stepper Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800/90 dark:bg-[#0F1623]">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Campaign Wizard V2 Progress
          </span>
          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            Step 0{currentStep} / 06 ({progressPercentage}%)
          </span>
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
                className={cn(
                  'group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 cursor-pointer',
                  isCurrent
                    ? 'border-blue-600 bg-blue-50/50 shadow-2xs dark:border-blue-500 dark:bg-blue-950/30'
                    : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-50/20 dark:border-emerald-500/30 dark:bg-emerald-950/10'
                    : 'border-slate-200 bg-slate-50/40 opacity-85 hover:opacity-100 hover:border-slate-300 dark:border-slate-800 dark:bg-[#090D16]/60'
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-colors',
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {step.title}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {step.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {stepError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* Main Builder + Live Summary Split */}
      <form onSubmit={handlePublishCampaign} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 shadow-2xs">
          <motion.div
            key={currentStep}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* =========================================================
                STEP 01: BASIC DETAILS
               ========================================================= */}
            {currentStep === 1 && (
              <>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CardTitle>01. Basic Details, Offer Identity & Total Caps</CardTitle>
                  <CardDescription>
                    Configure Campaign Name, Brand/Advertiser, Vertical Category, unique Offer ID, Total Caps, Campaign Logo, and Flight Window.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-name">Campaign Name *</Label>
                      <Input
                        id="cmp-name"
                        placeholder="e.g. HDFC Sky Demat Account Q4"
                        {...form.register('name')}
                      />
                      <p className="text-[11px] text-slate-400">
                        Minimum 3 characters. Displayed across publisher feeds and reports.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-brand">Brand / Advertiser *</Label>
                      <Input
                        id="cmp-brand"
                        placeholder="e.g. HDFC Sky Financial Services"
                        {...form.register('brand')}
                      />
                      <p className="text-[11px] text-slate-400">
                        Stored separately from campaign name for advertiser reconciliation.
                      </p>
                    </div>
                  </div>

                  {/* Offer ID & Routing Status */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cmp-offer-id">Offer ID *</Label>
                        <span
                          className={cn(
                            'font-mono text-[10px] font-semibold',
                            offerIdUnique
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {offerIdUnique ? '✓ Unique Offer ID' : '✕ Duplicate Offer ID'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id="cmp-offer-id"
                          className="font-mono uppercase"
                          placeholder="e.g. OFR-9012"
                          {...form.register('offerId')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label="Regenerate Unique Offer ID"
                          onClick={() => {
                            const nextId = generateUniqueOfferId(
                              campaigns.map((c) => c.offerId)
                            );
                            form.setValue('offerId', nextId);
                            toast.success(`Generated unique Offer ID: ${nextId}`);
                          }}
                          className="shrink-0"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Generate</span>
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Propagated to &#123;offer_id&#125; macros, S2S URLs, templates, and event logs.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-status">Initial Routing Status</Label>
                      <ThemedSelect
                        id="cmp-status"
                        ariaLabel="Initial Status"
                        value={watched.status}
                        onValueChange={(val) =>
                          form.setValue('status', val as 'active' | 'paused' | 'draft')
                        }
                        options={STATUS_OPTIONS}
                        searchable={false}
                      />
                      <p className="text-[11px] text-slate-400">
                        Controls whether traffic redirects immediately upon publish.
                      </p>
                    </div>
                  </div>

                  {/* Vertical Category Free-Text Input + Suggestions */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cmp-category">Vertical Category *</Label>
                    <Input
                      id="cmp-category"
                      placeholder="Enter vertical (e.g. Fintech, Banking, Mutual Funds, Gaming, Insurance...)"
                      {...form.register('category')}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">Quick Verticals:</span>
                      {VERTICAL_SUGGESTIONS.map((vert) => (
                        <button
                          key={vert}
                          type="button"
                          onClick={() => form.setValue('category', vert)}
                          className={cn(
                            'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
                            watched.category.trim().toLowerCase() === vert.toLowerCase()
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-300'
                          )}
                        >
                          {vert}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total Caps Configuration */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label htmlFor="cmp-total-cap" className="text-xs font-semibold">
                          Total Campaign Conversion Cap *
                        </Label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Maximum permitted conversions across the campaign lifecycle. Enforced across attribution and reporting.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Unlimited Cap Mode
                        </span>
                        <Switch
                          aria-label="Enable Unlimited Cap Mode"
                          checked={watched.unlimitedCap}
                          onCheckedChange={(val) => form.setValue('unlimitedCap', val)}
                        />
                      </div>
                    </div>

                    {!watched.unlimitedCap ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 items-center">
                        <div>
                          <Input
                            id="cmp-total-cap"
                            type="number"
                            min={0}
                            step={1}
                            className="font-mono tabular-nums"
                            {...form.register('totalCap', { valueAsNumber: true })}
                          />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          Max Cap Exposure:{' '}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatINR(totalCapExposureInr ?? 0)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
                        Unlimited Conversion Cap active — campaign will accept uncapped qualified conversions during the active flight window.
                      </div>
                    )}
                  </div>

                  {/* Campaign Logo Upload */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Campaign Brand Logo (PNG, JPEG, WebP)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Displayed in All Campaigns, offer walls, and partner postback directories.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="cmp-logo-upload"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0F1623] dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>{logoAsset ? 'Replace Logo' : 'Upload Image'}</span>
                          <input
                            id="cmp-logo-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleLogoFileChange}
                            className="sr-only"
                          />
                        </label>
                        {!logoAsset && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const sample = createSampleBrandLogoDataUrl(
                                watched.brand || watched.name || 'CrosX',
                                watched.offerId
                              );
                              setLogoAsset(sample);
                              toast.success(`Generated brand emblem "${sample.fileName}"`);
                            }}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Use Brand Emblem</span>
                          </Button>
                        )}
                        {logoAsset && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLogoAsset(null);
                              toast.info('Removed campaign logo');
                            }}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {logoAsset && (
                      <div className="mt-3 flex items-center gap-3.5 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0F1623]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoAsset.dataUrl}
                          alt={logoAsset.fileName}
                          className="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {logoAsset.fileName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {(logoAsset.sizeBytes / 1024).toFixed(1)} KB · {logoAsset.mimeType} ·{' '}
                            {logoAsset.storagePath}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cmp-desc">Description & Traffic Guidelines *</Label>
                    <Textarea
                      id="cmp-desc"
                      placeholder="Specify allowed traffic channels, geo restrictions, and qualification criteria..."
                      {...form.register('description')}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Campaign Flight Schedule</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="cmp-start">Start Date</Label>
                        <Input id="cmp-start" type="date" {...form.register('startDate')} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cmp-end">End Date</Label>
                        <Input id="cmp-end" type="date" {...form.register('endDate')} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* =========================================================
                STEP 02: TRACKING DETAILS
               ========================================================= */}
            {currentStep === 2 && (
              <>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CardTitle>02. Tracking Method, Macro Token Library & Conversion Events</CardTitle>
                  <CardDescription>
                    Select the tracking protocol, interpolate primary Sub ID &#123;x&#125; vs auxiliary &#123;x1&#125;–&#123;x10&#125; macros, and define multi-stage conversion events and alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-5">
                  {/* Tracking Method Selector */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-tracking-method">Tracking Method *</Label>
                      <ThemedSelect
                        id="cmp-tracking-method"
                        ariaLabel="Tracking Method"
                        value={watched.trackingMethod}
                        onValueChange={(val) => {
                          const method = val as TrackingMethod;
                          form.setValue('trackingMethod', method);
                          form.setValue(
                            'trackingUrl',
                            buildExampleTrackingUrl(method, watched.offerId)
                          );
                        }}
                        options={TRACKING_METHOD_OPTIONS}
                        searchable={false}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Protocol Endpoint Preview</Label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-300 truncate">
                        <span className="truncate">{exampleMethodUrl}</span>
                      </div>
                    </div>
                  </div>

                  {/* Destination / Tracking URL */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cmp-tracking-url">Destination / Tracking URL *</Label>
                      <button
                        type="button"
                        onClick={() =>
                          form.setValue(
                            'trackingUrl',
                            buildExampleTrackingUrl(watched.trackingMethod, watched.offerId)
                          )
                        }
                        className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                      >
                        Reset to {watched.trackingMethod} Template
                      </button>
                    </div>
                    <Input
                      id="cmp-tracking-url"
                      className="font-mono text-xs"
                      {...form.register('trackingUrl')}
                    />
                  </div>

                  {/* Organized Macro Token Library */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Macro Token Library (Click to Append to Tracking URL)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Primary Sub ID <code className="font-mono text-blue-600 dark:text-blue-400">&#123;x&#125;</code> is distinct from secondary parameter slots <code className="font-mono">&#123;x1&#125;</code> through <code className="font-mono">&#123;x10&#125;</code>. Server-resolved tokens (<code className="font-mono">&#123;payout&#125;</code>, <code className="font-mono">&#123;ip&#125;</code>, <code className="font-mono">&#123;timestamp&#125;</code>) are populated from trusted backend state.
                      </p>
                    </div>

                    {/* Core Macros */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Core Attribution & Server Macros
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {coreMacros.map((m) => (
                          <button
                            key={m.token}
                            type="button"
                            title={m.description}
                            onClick={() => handleInsertMacro(m.syntax, m.token)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-[#0F1623] dark:hover:border-blue-500 cursor-pointer"
                          >
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                              {m.syntax}
                            </span>
                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              {m.label}
                            </span>
                            {m.serverResolved && (
                              <span className="rounded bg-emerald-500/10 px-1 py-0.2 font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                                SRV
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Secondary Sub IDs x1 - x10 */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Secondary Sub ID Slots (&#123;x1&#125; – &#123;x10&#125;)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {subIdMacros.map((m) => (
                          <button
                            key={m.token}
                            type="button"
                            title={m.description}
                            onClick={() => handleInsertMacro(m.syntax, m.token)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-[#0F1623] dark:text-slate-300 cursor-pointer"
                          >
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {m.syntax}
                            </span>
                            <span className="text-[10px] text-slate-400">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Click / Conversion Switches & Attribution */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-[#090D16]/50">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Click Tracking
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Generate unique &#123;c&#125; tokens & fingerprint deduplication
                        </div>
                      </div>
                      <Switch
                        aria-label="Enable Click Tracking"
                        checked={watched.clickTrackingEnabled}
                        onCheckedChange={(val) => form.setValue('clickTrackingEnabled', val)}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-[#090D16]/50">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Conversion Tracking
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Validate server-to-server &#123;event&#125; callbacks
                        </div>
                      </div>
                      <Switch
                        aria-label="Enable Conversion Tracking"
                        checked={watched.conversionTrackingEnabled}
                        onCheckedChange={(val) => form.setValue('conversionTrackingEnabled', val)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-attr-model">Attribution Model</Label>
                      <ThemedSelect
                        id="cmp-attr-model"
                        ariaLabel="Attribution Model"
                        value={watched.attributionModel}
                        onValueChange={(val) =>
                          form.setValue(
                            'attributionModel',
                            val as 'last_touch' | 'first_touch' | 'linear' | 'time_decay'
                          )
                        }
                        options={ATTRIBUTION_MODEL_OPTIONS}
                        searchable={false}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-attr-window">Attribution Lookback Window (Days)</Label>
                      <Input
                        id="cmp-attr-window"
                        type="number"
                        min={1}
                        max={90}
                        {...form.register('attributionWindowDays', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  {/* Multi-Stage Conversion Events Builder */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Campaign Conversion Events ({conversionEvents.length})
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Configure funnel milestones. Step 04 binds one of these events as the mandatory Payable Event.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {conversionEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#0F1623]"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {evt.name}
                              </span>
                              <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                {evt.identifier}
                              </code>
                              {evt.isProtectedHistorical && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                  <Lock className="h-2.5 w-2.5" /> Historical Protected
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {evt.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span>Active</span>
                              <Switch
                                aria-label={`Toggle event ${evt.identifier}`}
                                checked={evt.active}
                                onCheckedChange={(val) =>
                                  setConversionEvents((prev) =>
                                    prev.map((item) =>
                                      item.id === evt.id ? { ...item, active: val } : item
                                    )
                                  )
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Remove event ${evt.identifier}`}
                              onClick={() => handleRemoveConversionEvent(evt)}
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Conversion Event Row */}
                    <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-200 sm:grid-cols-12 dark:border-slate-800">
                      <div className="sm:col-span-3">
                        <Input
                          aria-label="New Event Name"
                          placeholder="Event Name (e.g. Card Dispatched)"
                          value={newEvtName}
                          onChange={(e) => setNewEvtName(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          aria-label="New Event Identifier"
                          className="font-mono text-xs"
                          placeholder="identifier (e.g. card_dispatched)"
                          value={newEvtIdentifier}
                          onChange={(e) => setNewEvtIdentifier(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <Input
                          aria-label="New Event Description"
                          placeholder="Trigger condition description"
                          value={newEvtDesc}
                          onChange={(e) => setNewEvtDesc(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddConversionEvent}
                          className="w-full h-9"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Event</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Operational Event Alerting Builder */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Event Telemetry & Anomaly Alerts ({eventAlerts.length})
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Trigger automated notifications on tracking failures, volume drops, or cap thresholds.
                        </div>
                      </div>
                    </div>

                    {eventAlerts.length > 0 && (
                      <div className="space-y-2">
                        {eventAlerts.map((alt) => (
                          <div
                            key={alt.id}
                            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#0F1623]"
                          >
                            <div className="space-y-0.5 text-xs">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    alt.severity === 'critical'
                                      ? 'danger'
                                      : alt.severity === 'warning'
                                      ? 'warning'
                                      : 'info'
                                  }
                                >
                                  {alt.severity.toUpperCase()}
                                </Badge>
                                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                  {alt.eventIdentifier}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-600 dark:text-slate-300">
                                  {alt.triggerCondition.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Threshold: {alt.thresholdValue} → Channel: {alt.channel}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                aria-label={`Toggle alert ${alt.id}`}
                                checked={alt.enabled}
                                onCheckedChange={(val) =>
                                  setEventAlerts((prev) =>
                                    prev.map((a) =>
                                      a.id === alt.id ? { ...a, enabled: val } : a
                                    )
                                  )
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEventAlerts((prev) =>
                                    prev.filter((a) => a.id !== alt.id)
                                  )
                                }
                                className="h-7 px-2 text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-200 sm:grid-cols-12 dark:border-slate-800">
                      <div className="sm:col-span-3">
                        <ThemedSelect
                          ariaLabel="Alert Event Target"
                          value={newAlertEventId}
                          onValueChange={setNewAlertEventId}
                          options={payableEventOptions}
                          searchable={false}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <ThemedSelect
                          ariaLabel="Alert Trigger Condition"
                          value={newAlertCondition}
                          onValueChange={(val) =>
                            setNewAlertCondition(
                              val as CampaignEventAlert['triggerCondition']
                            )
                          }
                          options={ALERT_TRIGGER_OPTIONS}
                          searchable={false}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <ThemedSelect
                          ariaLabel="Alert Severity"
                          value={newAlertSeverity}
                          onValueChange={(val) =>
                            setNewAlertSeverity(val as CampaignEventAlert['severity'])
                          }
                          options={ALERT_SEVERITY_OPTIONS}
                          searchable={false}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          aria-label="Alert Threshold"
                          placeholder="Threshold..."
                          value={newAlertThreshold}
                          onChange={(e) => setNewAlertThreshold(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddEventAlert}
                          className="w-full h-9"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Alert</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* =========================================================
                STEP 03: TEMPLATE SELECTION & LIVE FORM PREVIEW
               ========================================================= */}
            {currentStep === 3 && (
              <>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>03. Template Selection & Schema Binding</CardTitle>
                      <CardDescription>
                        Select a campaign intake or postback validation template from the dropdown and test its interactive Live Form Preview for Offer ID {watched.offerId}.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveSection('template-create')}
                      className="h-8 text-xs shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Open Template Builder</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {/* Select Template Dropdown Control */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#090D16]/60 space-y-3">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
                      <div className="space-y-1.5 md:col-span-8">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cmp-template-select">Select Template *</Label>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {templates.length} available templates
                          </span>
                        </div>
                        <ThemedSelect
                          id="cmp-template-select"
                          ariaLabel="Select Template"
                          value={watched.templateId}
                          onValueChange={(val) => {
                            form.setValue('templateId', val);
                            const found = templates.find((t) => t.id === val);
                            if (found) {
                              toast.success(`Selected template "${found.name}" (${found.id})`);
                            }
                          }}
                          options={templateOptions}
                          placeholder="Choose a lead capture or S2S validation template..."
                          searchPlaceholder="Search templates by name, ID, or type..."
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:col-span-4 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!selectedTemplate) return;
                            setTemplatePreviewValues(
                              buildDefaultTemplatePreviewValues(selectedTemplate.fields, true)
                            );
                            setTemplateValidationResult(null);
                            toast.success('Populated sample lead values in Live Preview');
                          }}
                          className="h-9 text-xs flex-1 md:flex-initial"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Sample Fill</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!selectedTemplate) return;
                            setTemplatePreviewValues(
                              buildDefaultTemplatePreviewValues(selectedTemplate.fields, false)
                            );
                            setTemplateValidationResult(null);
                          }}
                          className="h-9 text-xs"
                        >
                          Clear Fields
                        </Button>
                      </div>
                    </div>

                    {selectedTemplate && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-xs dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="info">{selectedTemplate.id}</Badge>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {selectedTemplate.name}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {selectedTemplate.type}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                            {selectedTemplate.fields.length} schema fields ({selectedTemplate.fields.filter((f) => f.required).length} required)
                          </span>
                        </div>
                        <StatusIndicator status={selectedTemplate.status} />
                      </div>
                    )}
                  </div>

                  {/* Live Template Preview & Interactive Form Container */}
                  {selectedTemplate && (
                    <motion.div
                      key={selectedTemplate.id}
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#090D16] overflow-hidden"
                    >
                      {/* Preview Toolbar */}
                      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#0F1623]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Live Template Preview: {selectedTemplate.name}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            Bound to Offer ID{' '}
                            <code className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                              {watched.offerId}
                            </code>{' '}
                            · {watched.trackingMethod} Ingestion · Payable Event{' '}
                            <code className="font-mono text-slate-700 dark:text-slate-300">
                              {watched.payableEventId}
                            </code>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Responsive Viewport Width Switcher */}
                          {templatePreviewTab === 'live_form' && (
                            <div
                              role="group"
                              aria-label="Preview Viewport Width"
                              className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-[#090D16]"
                            >
                              <button
                                type="button"
                                onClick={() => setTemplatePreviewViewport('desktop')}
                                aria-label="Desktop Preview Width"
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                                  templatePreviewViewport === 'desktop'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                )}
                              >
                                <Monitor className="h-3 w-3" />
                                <span className="hidden sm:inline">Desktop</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTemplatePreviewViewport('tablet')}
                                aria-label="Tablet Preview Width"
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                                  templatePreviewViewport === 'tablet'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                )}
                              >
                                <Tablet className="h-3 w-3" />
                                <span className="hidden sm:inline">Tablet</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTemplatePreviewViewport('mobile')}
                                aria-label="Mobile Preview Width"
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                                  templatePreviewViewport === 'mobile'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                )}
                              >
                                <Smartphone className="h-3 w-3" />
                                <span className="hidden sm:inline">Mobile</span>
                              </button>
                            </div>
                          )}

                          {/* Mode Switcher: Live Form Preview vs Schema & S2S Payload */}
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-[#090D16]">
                            <button
                              type="button"
                              onClick={() => setTemplatePreviewTab('live_form')}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                templatePreviewTab === 'live_form'
                                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                              )}
                            >
                              <Layout className="h-3.5 w-3.5" />
                              <span>Live Form Preview</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTemplatePreviewTab('schema_json')}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                templatePreviewTab === 'schema_json'
                                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                              )}
                            >
                              <Code className="h-3.5 w-3.5" />
                              <span>Schema & S2S Payload</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Preview Body */}
                      <div className="p-4 sm:p-5">
                        {templatePreviewTab === 'live_form' ? (
                          <div
                            className={cn(
                              'mx-auto transition-all duration-200 rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 dark:border-slate-800/90 dark:bg-[#0F1623]/80 space-y-4',
                              templatePreviewViewport === 'mobile' && 'max-w-[360px]',
                              templatePreviewViewport === 'tablet' && 'max-w-[560px]',
                              templatePreviewViewport === 'desktop' && 'max-w-full'
                            )}
                          >
                            {/* Simulated Campaign Offer Header inside Form Preview */}
                            <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    {watched.offerId} · {selectedTemplate.type}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                  {watched.name || selectedTemplate.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {watched.brand || 'Verified Advertiser'} · User Payout {formatINR(userConversion.amountInInr)} ({watched.payoutType})
                                </div>
                              </div>
                              <Badge variant="default">Interactive Sandbox</Badge>
                            </div>

                            {/* Dynamic Interactive Form Fields */}
                            <div
                              className={cn(
                                'grid gap-4',
                                templatePreviewViewport === 'desktop'
                                  ? 'grid-cols-1 sm:grid-cols-2'
                                  : 'grid-cols-1'
                              )}
                            >
                              {selectedTemplate.fields.map((field) => {
                                const fieldVal = templatePreviewValues[field.key];
                                const selectOpts =
                                  field.type === 'select'
                                    ? getSelectOptionsForTemplateField(field)
                                    : [];

                                if (field.type === 'checkbox') {
                                  return (
                                    <div
                                      key={field.id}
                                      className="sm:col-span-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#090D16]"
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <Checkbox
                                          id={`tpl-live-${field.id}`}
                                          checked={Boolean(fieldVal)}
                                          onCheckedChange={(checked) =>
                                            handleUpdatePreviewField(field.key, Boolean(checked))
                                          }
                                        />
                                        <div className="min-w-0 flex-1">
                                          <Label
                                            htmlFor={`tpl-live-${field.id}`}
                                            className="text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
                                          >
                                            {field.label}{' '}
                                            {field.required && (
                                              <span className="text-red-500">*</span>
                                            )}
                                          </Label>
                                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                            <span>{field.placeholder}</span>
                                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                                              key: &quot;{field.key}&quot;
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={field.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <Label
                                        htmlFor={`tpl-live-${field.id}`}
                                        className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                                      >
                                        {field.label}{' '}
                                        {field.required && (
                                          <span className="text-red-500">*</span>
                                        )}
                                      </Label>
                                      <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                                        {field.key} ({field.type})
                                      </span>
                                    </div>

                                    {field.type === 'select' ? (
                                      <ThemedSelect
                                        id={`tpl-live-${field.id}`}
                                        ariaLabel={field.label}
                                        value={typeof fieldVal === 'string' ? fieldVal : ''}
                                        onValueChange={(val) =>
                                          handleUpdatePreviewField(field.key, val)
                                        }
                                        options={selectOpts}
                                        placeholder={field.placeholder || `Select ${field.label}...`}
                                        searchable={false}
                                      />
                                    ) : (
                                      <Input
                                        id={`tpl-live-${field.id}`}
                                        type={
                                          field.type === 'number'
                                            ? 'number'
                                            : field.type === 'email'
                                            ? 'email'
                                            : field.type === 'phone'
                                            ? 'tel'
                                            : 'text'
                                        }
                                        placeholder={field.placeholder}
                                        value={typeof fieldVal === 'string' ? fieldVal : ''}
                                        onChange={(e) =>
                                          handleUpdatePreviewField(field.key, e.target.value)
                                        }
                                        className={cn(
                                          field.type === 'number' && 'font-mono tabular-nums'
                                        )}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Interactive Test Submission Action & Validation Feedback */}
                            <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Test required schema rules and inspect the bound S2S callback payload.
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleTestTemplateSubmission}
                                className="w-full sm:w-auto"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Verify & Simulate Lead Submission</span>
                              </Button>
                            </div>

                            {templateValidationResult && !templateValidationResult.valid && (
                              <div
                                role="alert"
                                className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 space-y-1"
                              >
                                <div className="font-semibold flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  <span>Schema Validation Failed</span>
                                </div>
                                {templateValidationResult.missingFields.length > 0 && (
                                  <div>
                                    Missing required fields:{' '}
                                    <span className="font-semibold">
                                      {templateValidationResult.missingFields.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {templateValidationResult.invalidEmailFields.length > 0 && (
                                  <div>
                                    Invalid email syntax:{' '}
                                    <span className="font-semibold">
                                      {templateValidationResult.invalidEmailFields.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {templateValidationResult && templateValidationResult.valid && (
                              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs space-y-2">
                                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    <Check className="h-3.5 w-3.5" />
                                    Schema Verified — Bound Intake & S2S Payload Ready
                                  </span>
                                  <span className="font-mono text-[10px]">HTTP 200 SIMULATION</span>
                                </div>
                                <pre className="overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] text-emerald-300">
                                  {JSON.stringify(
                                    {
                                      offer_id: watched.offerId,
                                      template_id: selectedTemplate.id,
                                      template_type: selectedTemplate.type,
                                      tracking_method: watched.trackingMethod,
                                      payable_event: watched.payableEventId,
                                      user_payout_inr: userConversion.amountInInr,
                                      validated_payload:
                                        templateValidationResult.normalizedValues,
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Schema & S2S Payload Mapping Inspector Tab */
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {selectedTemplate.fields.map((field) => (
                                <div
                                  key={field.id}
                                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-[#0F1623]"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {field.label}
                                    </span>
                                    <span
                                      className={cn(
                                        'rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                                        field.required
                                          ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                          : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                      )}
                                    >
                                      {field.type} · {field.required ? 'required' : 'optional'}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between font-mono text-[11px]">
                                    <span className="text-blue-600 dark:text-blue-400">
                                      key: &quot;{field.key}&quot;
                                    </span>
                                    <span className="text-slate-400 truncate max-w-[180px]">
                                      eg: {field.placeholder}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-200 dark:border-slate-800">
                              {JSON.stringify(
                                {
                                  schema_contract: selectedTemplate.id,
                                  template_name: selectedTemplate.name,
                                  template_type: selectedTemplate.type,
                                  bound_offer_id: watched.offerId,
                                  tracking_method: watched.trackingMethod,
                                  payable_event: watched.payableEventId,
                                  fields: selectedTemplate.fields.map((f) => ({
                                    key: f.key,
                                    label: f.label,
                                    type: f.type,
                                    required: f.required,
                                    sample: templatePreviewValues[f.key] ?? f.placeholder,
                                  })),
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </>
            )}

            {/* =========================================================
                STEP 04: PAYOUT CONFIGURATION
               ========================================================= */}
            {currentStep === 4 && (
              <>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CardTitle>04. Payout Configuration, Profit Margin Engine & Payable Event</CardTitle>
                  <CardDescription>
                    Configure custom Payout Model, Advertiser/User/Referral unit economics, real-time INR profit margin audit, and mandatory Payable Event binding.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-payout-type">Payout Model (Text Input) *</Label>
                      <Input
                        id="cmp-payout-type"
                        placeholder="e.g. CPA, CPL, CPI, CPS, Revenue Share, Hybrid..."
                        {...form.register('payoutType')}
                      />
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {PAYOUT_MODEL_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => form.setValue('payoutType', preset)}
                            className={cn(
                              'rounded border px-2 py-0.5 font-mono text-[10px] transition-colors cursor-pointer',
                              watched.payoutType.trim().toLowerCase() === preset.toLowerCase()
                                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-400'
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-currency">Contract Currency</Label>
                      <ThemedSelect
                        id="cmp-currency"
                        ariaLabel="Contract Currency"
                        value={watched.currency}
                        onValueChange={(val) =>
                          form.setValue('currency', val as SupportedCurrency)
                        }
                        options={CURRENCY_OPTIONS}
                        searchable={false}
                      />
                    </div>
                  </div>

                  {/* Three-Tier Unit Economics: Advertiser Payout, User Payout, Referral Payout */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-advertiser-payout">
                        Advertiser Payout ({watched.currency}) *
                      </Label>
                      <Input
                        id="cmp-advertiser-payout"
                        type="number"
                        step="0.5"
                        min={0}
                        className="font-mono tabular-nums"
                        {...form.register('advertiserPayout', { valueAsNumber: true })}
                      />
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        INR: {formatINR(advConversion.amountInInr)}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-user-payout">
                        User / Publisher Payout ({watched.currency}) *
                      </Label>
                      <Input
                        id="cmp-user-payout"
                        type="number"
                        step="0.5"
                        min={0}
                        className="font-mono tabular-nums"
                        {...form.register('payoutAmount', { valueAsNumber: true })}
                      />
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        INR: {formatINR(userConversion.amountInInr)}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-referral-payout">
                        Referral Payout ({watched.currency})
                      </Label>
                      <Input
                        id="cmp-referral-payout"
                        type="number"
                        step="0.5"
                        min={0}
                        className="font-mono tabular-nums"
                        {...form.register('referralPayout', { valueAsNumber: true })}
                      />
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        INR: {formatINR(refConversion.amountInInr)}
                      </p>
                    </div>
                  </div>

                  {/* Auto-Calculated Profit Margin (%) Engine Card */}
                  <div
                    className={cn(
                      'rounded-xl border p-4 space-y-3',
                      profitMargins.isNegativeGross || profitMargins.isNegativeNet
                        ? 'border-red-500/40 bg-red-500/10'
                        : 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10'
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Auto-Calculated Profit Margin (%) & Unit Economics (INR)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Gross Formula: ((Advertiser − User) / Advertiser) × 100 · Net Formula includes Referral Payout.
                        </div>
                      </div>
                      {(profitMargins.isNegativeGross || profitMargins.isNegativeNet) && (
                        <Badge variant="danger">Negative Margin Warning</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200/80 bg-white/90 p-3 dark:border-slate-800 dark:bg-[#0F1623]">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Gross Profit Margin (Excl. Referral)
                        </div>
                        <div
                          className={cn(
                            'mt-1 font-mono text-lg font-bold tabular-nums',
                            profitMargins.isNegativeGross
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {profitMargins.isZeroAdvertiser
                            ? 'N/A (Zero Advertiser Payout)'
                            : `${profitMargins.grossMarginPercent}% (${formatINR(profitMargins.grossProfitInr)})`}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200/80 bg-white/90 p-3 dark:border-slate-800 dark:bg-[#0F1623]">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Net Profit Margin (Incl. Referral Payout)
                        </div>
                        <div
                          className={cn(
                            'mt-1 font-mono text-lg font-bold tabular-nums',
                            profitMargins.isNegativeNet
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-blue-600 dark:text-blue-400'
                          )}
                        >
                          {profitMargins.isZeroAdvertiser
                            ? 'N/A (Zero Advertiser Payout)'
                            : `${profitMargins.netMarginPercent}% (${formatINR(profitMargins.netProfitInr)})`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Payable Event Selector & Condition */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-payable-event">
                        Mandatory Payable Event (From Step 02) *
                      </Label>
                      <ThemedSelect
                        id="cmp-payable-event"
                        ariaLabel="Mandatory Payable Event"
                        value={watched.payableEventId}
                        onValueChange={(val) => form.setValue('payableEventId', val)}
                        options={payableEventOptions}
                        searchable={false}
                      />
                      <p className="text-[11px] text-slate-400">
                        Partner payout is settled strictly upon server-validated completion of this event.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cmp-condition">Conversion Qualification Condition *</Label>
                      <Input
                        id="cmp-condition"
                        placeholder="e.g. Instant KYC Approved + Initial Deposit"
                        {...form.register('conversionCondition')}
                      />
                      <p className="text-[11px] text-slate-400">
                        Contractual qualification rule audited before ledger settlement.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* =========================================================
                STEP 05: ADVANCED OPTIONS
               ========================================================= */}
            {currentStep === 5 && (
              <>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CardTitle>05. Advanced Options, Referral Rules & Fraud Controls</CardTitle>
                  <CardDescription>
                    Configure restricted IP simulation, referral program rules, custom payout overrides, payable event verification, shelf referral, and Same UPI ID policy.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {/* A. Restricted IP Spoofing / Sandbox IP Simulation */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          A. IP Spoofing Header Policy & Sandbox IP Simulation
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Production attribution always resolves client IP from trusted server headers and never fabricates live traffic IPs.
                        </div>
                      </div>
                      <Switch
                        aria-label="Enable IP Spoofing Config Flag"
                        checked={advancedOptions.ipSpoofingConfigEnabled}
                        onCheckedChange={(val) =>
                          setAdvancedOptions((prev) => ({
                            ...prev,
                            ipSpoofingConfigEnabled: val,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          Controlled Sandbox-Only Synthetic IP Test Mode
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Simulate geo/IP routing rules in staging without affecting production logs.
                        </div>
                      </div>
                      <Switch
                        aria-label="Enable Sandbox Synthetic IP Test Mode"
                        checked={advancedOptions.ipSimulationTestMode}
                        onCheckedChange={(val) =>
                          setAdvancedOptions((prev) => ({
                            ...prev,
                            ipSimulationTestMode: val,
                          }))
                        }
                      />
                    </div>

                    {advancedOptions.ipSimulationTestMode && (
                      <div className="pt-2">
                        <Label htmlFor="cmp-synthetic-ip">Sandbox Synthetic Test IPv4 / CIDR</Label>
                        <Input
                          id="cmp-synthetic-ip"
                          className="mt-1 font-mono text-xs"
                          value={advancedOptions.syntheticTestIp}
                          onChange={(e) =>
                            setAdvancedOptions((prev) => ({
                              ...prev,
                              syntheticTestIp: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* B. Referral Features */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          B. Referral Features & Multi-Level Attribution
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Enable partner/user referral commissions ({formatINR(refConversion.amountInInr)} configured in Step 04).
                        </div>
                      </div>
                      <Switch
                        aria-label="Enable Referral Features"
                        checked={advancedOptions.referralFeaturesEnabled}
                        onCheckedChange={(val) =>
                          setAdvancedOptions((prev) => ({
                            ...prev,
                            referralFeaturesEnabled: val,
                          }))
                        }
                      />
                    </div>

                    {advancedOptions.referralFeaturesEnabled && (
                      <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-3 dark:border-slate-800">
                        <div className="space-y-1">
                          <Label>Referral Eligibility</Label>
                          <ThemedSelect
                            ariaLabel="Referral Eligibility Rule"
                            value={advancedOptions.referralEligibilityRule}
                            onValueChange={(val) =>
                              setAdvancedOptions((prev) => ({
                                ...prev,
                                referralEligibilityRule:
                                  val as CampaignAdvancedOptions['referralEligibilityRule'],
                              }))
                            }
                            options={REFERRAL_ELIGIBILITY_OPTIONS}
                            searchable={false}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Referral Attribution</Label>
                          <ThemedSelect
                            ariaLabel="Referral Attribution Model"
                            value={advancedOptions.referralAttributionModel}
                            onValueChange={(val) =>
                              setAdvancedOptions((prev) => ({
                                ...prev,
                                referralAttributionModel:
                                  val as CampaignAdvancedOptions['referralAttributionModel'],
                              }))
                            }
                            options={REFERRAL_ATTRIBUTION_OPTIONS}
                            searchable={false}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Linked Referral Event</Label>
                          <ThemedSelect
                            ariaLabel="Linked Referral Event"
                            value={
                              advancedOptions.referralLinkedEventId ||
                              watched.payableEventId
                            }
                            onValueChange={(val) =>
                              setAdvancedOptions((prev) => ({
                                ...prev,
                                referralLinkedEventId: val,
                              }))
                            }
                            options={payableEventOptions}
                            searchable={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* C. Custom Payout Overrides */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          C. Custom Payout Overrides (Event-Level Tiering)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Override default campaign payouts for specific funnel events with full audit logging.
                        </div>
                      </div>
                      <Switch
                        aria-label="Enable Custom Payout Overrides"
                        checked={advancedOptions.customPayoutEnabled}
                        onCheckedChange={(val) =>
                          setAdvancedOptions((prev) => ({
                            ...prev,
                            customPayoutEnabled: val,
                          }))
                        }
                      />
                    </div>

                    {advancedOptions.customPayoutEnabled && (
                      <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                        {advancedOptions.customPayoutOverrides.length > 0 && (
                          <div className="space-y-2">
                            {advancedOptions.customPayoutOverrides.map((ovr) => (
                              <div
                                key={ovr.id}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-[#0F1623]"
                              >
                                <div className="font-mono">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {ovr.eventIdentifier}
                                  </span>{' '}
                                  · Adv: {formatINR(ovr.advertiserPayoutInr)} · User:{' '}
                                  {formatINR(ovr.userPayoutInr)} · Ref:{' '}
                                  {formatINR(ovr.referralPayoutInr)}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setAdvancedOptions((prev) => ({
                                      ...prev,
                                      customPayoutOverrides:
                                        prev.customPayoutOverrides.filter(
                                          (item) => item.id !== ovr.id
                                        ),
                                    }))
                                  }
                                  className="h-7 px-2 text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <div className="sm:col-span-3">
                            <ThemedSelect
                              ariaLabel="Override Event"
                              value={overrideEventId}
                              onValueChange={setOverrideEventId}
                              options={payableEventOptions}
                              searchable={false}
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <Input
                              aria-label="Override Advertiser INR"
                              type="number"
                              placeholder="Adv ₹"
                              value={overrideAdvInr}
                              onChange={(e) => setOverrideAdvInr(Number(e.target.value))}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              aria-label="Override User INR"
                              type="number"
                              placeholder="User ₹"
                              value={overrideUserInr}
                              onChange={(e) => setOverrideUserInr(Number(e.target.value))}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              aria-label="Override Referral INR"
                              type="number"
                              placeholder="Ref ₹"
                              value={overrideRefInr}
                              onChange={(e) => setOverrideRefInr(Number(e.target.value))}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddCustomPayoutOverride}
                              className="w-full h-9"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Rule</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* D. Payable Events Verification (Always Visible) */}
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 dark:bg-blue-500/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          D. Payable Events Verification (Always Active)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Primary Payable Event bound in Step 04:{' '}
                          <code className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {watched.payableEventId}
                          </code>
                        </div>
                      </div>
                      <Badge variant="info">Mandatory Gate</Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0F1623]">
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          Enforce HMAC Server Signature on Payable Event
                        </span>
                        <Switch
                          aria-label="Enforce HMAC Server Signature"
                          checked={advancedOptions.enforceServerSideEventSignature}
                          onCheckedChange={(val) =>
                            setAdvancedOptions((prev) => ({
                              ...prev,
                              enforceServerSideEventSignature: val,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0F1623]">
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          Require Idempotency Key per Conversion ID
                        </span>
                        <Switch
                          aria-label="Require Idempotency Key"
                          checked={advancedOptions.requireIdempotencyKeyOnPayableEvent}
                          onCheckedChange={(val) =>
                            setAdvancedOptions((prev) => ({
                              ...prev,
                              requireIdempotencyKeyOnPayableEvent: val,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* E. Shelf Referral & F. Same UPI ID Policy */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2 dark:border-slate-800 dark:bg-[#090D16]/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            E. Shelf Referral
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Configuration-only flag persisted in campaign record (pending downstream spec).
                          </div>
                        </div>
                        <Switch
                          aria-label="Enable Shelf Referral"
                          checked={advancedOptions.shelfReferralEnabled}
                          onCheckedChange={(val) =>
                            setAdvancedOptions((prev) => ({
                              ...prev,
                              shelfReferralEnabled: val,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3 dark:border-slate-800 dark:bg-[#090D16]/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            F. Same UPI ID Policy
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Privacy-safe SHA-256 VPA deduplication policy across conversions.
                          </div>
                        </div>
                        <Switch
                          aria-label="Enable Same UPI ID Policy"
                          checked={advancedOptions.sameUpiIdEnabled}
                          onCheckedChange={(val) =>
                            setAdvancedOptions((prev) => ({
                              ...prev,
                              sameUpiIdEnabled: val,
                            }))
                          }
                        />
                      </div>

                      {advancedOptions.sameUpiIdEnabled && (
                        <ThemedSelect
                          ariaLabel="Same UPI ID Policy Action"
                          value={advancedOptions.sameUpiPolicyAction}
                          onValueChange={(val) =>
                            setAdvancedOptions((prev) => ({
                              ...prev,
                              sameUpiPolicyAction:
                                val as CampaignAdvancedOptions['sameUpiPolicyAction'],
                            }))
                          }
                          options={SAME_UPI_POLICY_OPTIONS}
                          searchable={false}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* =========================================================
                STEP 06: REVIEW & PUBLISH
               ========================================================= */}
            {currentStep === 6 && (
              <>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CardTitle>06. Review & Publish Campaign Contract</CardTitle>
                  <CardDescription>
                    Verify all configured parameters across Steps 01–05 before publishing to the live CrosX attribution ledger.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5 text-xs">
                  {/* Section 1: Basic Details */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        01. Basic Details & Total Caps
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                        className="h-7 text-xs text-blue-600"
                      >
                        Edit Step 01
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-[11px] text-slate-400">Campaign & Brand</div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {watched.name || 'Untitled'} · {watched.brand || 'Unassigned'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Offer ID & Vertical</div>
                        <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {watched.offerId} · {watched.category}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Total Conversion Cap</div>
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {watched.unlimitedCap
                            ? 'Unlimited Cap'
                            : `${formatCompactNumber(Number(watched.totalCap) || 0)} conversions`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Tracking & Events */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        02. Tracking Protocol, Macros & Events
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(2)}
                        className="h-7 text-xs text-blue-600"
                      >
                        Edit Step 02
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info">{watched.trackingMethod}</Badge>
                        <span className="text-slate-500">
                          Attribution: {watched.attributionModel.replace('_', ' ')} ({watched.attributionWindowDays}d)
                        </span>
                        <span className="text-slate-500">
                          · {conversionEvents.length} Conversion Event(s) · {eventAlerts.length} Alert Rule(s)
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-700 break-all dark:border-slate-800 dark:bg-[#0F1623] dark:text-slate-300">
                        {watched.trackingUrl}
                      </div>
                    </div>
                  </div>

                  {/* Section 3 & 4: Template + Payout & Margins */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        03 & 04. Template, Payout Unit Economics & Profit Margins (INR)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(4)}
                        className="h-7 text-xs text-blue-600"
                      >
                        Edit Step 04
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <div className="text-[11px] text-slate-400">Payout Model & Event</div>
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {watched.payoutType} → {watched.payableEventId}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Advertiser Payout (INR)</div>
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {formatINR(advConversion.amountInInr)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">User Payout (INR)</div>
                        <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {formatINR(userConversion.amountInInr)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Gross / Net Margin</div>
                        <div
                          className={cn(
                            'font-mono font-semibold',
                            profitMargins.isNegativeNet
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {profitMargins.isZeroAdvertiser
                            ? 'N/A'
                            : `${profitMargins.grossMarginPercent}% / ${profitMargins.netMarginPercent}%`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Advanced Options */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-[#090D16]/60">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        05. Advanced Options & Fraud Policy Summary
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(5)}
                        className="h-7 text-xs text-blue-600"
                      >
                        Edit Step 05
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-[11px]">
                      <div>
                        <span className="text-slate-400">Referral Features:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {advancedOptions.referralFeaturesEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Custom Payout Overrides:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {advancedOptions.customPayoutEnabled
                            ? `${advancedOptions.customPayoutOverrides.length} rule(s)`
                            : 'Disabled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Same UPI ID Policy:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {advancedOptions.sameUpiIdEnabled
                            ? advancedOptions.sameUpiPolicyAction.replace(/_/g, ' ')
                            : 'Disabled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Shelf Referral Flag:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {advancedOptions.shelfReferralEnabled ? 'Enabled (Config)' : 'Off'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Sandbox IP Simulation:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {advancedOptions.ipSimulationTestMode
                            ? advancedOptions.syntheticTestIp
                            : 'Off'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Template Bound:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedTemplate?.id} ({selectedTemplate?.name})
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </motion.div>

          {/* Step Footer Navigation */}
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Step</span>
            </Button>

            {currentStep < 6 ? (
              <Button
                key="step-continue-btn"
                type="button"
                onClick={handleNext}
              >
                <span>Continue to Step 0{currentStep + 1}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                key="step-publish-btn"
                type="button"
                onClick={() => handlePublishCampaign()}
              >
                <Rocket className="h-4 w-4" />
                <span>
                  {editingCampaign ? 'Save Campaign Updates' : 'Publish Campaign'}
                </span>
              </Button>
            )}
          </div>
        </Card>

        {/* Live Configuration Summary Sidebar */}
        <Card className="lg:col-span-4 h-fit shadow-2xs">
          <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <CardTitle>Live Contract Summary</CardTitle>
              <StatusIndicator status={watched.status} />
            </div>
            <CardDescription>
              Real-time Offer ID, Tracking Method & INR margin telemetry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
              {logoAsset ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoAsset.dataUrl}
                  alt={logoAsset.fileName}
                  className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 font-mono text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  {(watched.brand || watched.name || 'CX').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {watched.offerId || 'OFR-PENDING'} · {watched.trackingMethod}
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {watched.name || 'Untitled Campaign'}
                </div>
                <div className="text-slate-500 dark:text-slate-400 truncate">
                  {watched.brand || 'Unassigned Brand'} · {watched.category || 'Uncategorized'}
                </div>
              </div>
            </div>

            <div className="space-y-1 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-400">
                Flight Schedule & Total Caps
              </div>
              <div className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                {watched.startDate} → {watched.endDate}
              </div>
              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Total Cap:{' '}
                {watched.unlimitedCap
                  ? 'Unlimited'
                  : `${formatCompactNumber(Number(watched.totalCap) || 0)} conversions`}
              </div>
            </div>

            <div className="space-y-1 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-400">
                Payable Event & Schema Template
              </div>
              <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                Event: {watched.payableEventId || 'None'} ({conversionEvents.length} total)
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Template: {selectedTemplate?.name} ({selectedTemplate?.id})
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 dark:border-slate-800 dark:bg-[#090D16]">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Unit Economics (INR)</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {watched.payoutType || 'CPA'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-400">Advertiser</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatINR(advConversion.amountInInr)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">User</div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formatINR(userConversion.amountInInr)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Referral</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {formatINR(refConversion.amountInInr)}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-mono text-[11px] dark:border-slate-800 tabular-nums">
                <span className="text-slate-500">Gross / Net Margin:</span>
                <span
                  className={cn(
                    'font-bold',
                    profitMargins.isNegativeNet
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {profitMargins.isZeroAdvertiser
                    ? 'N/A'
                    : `${profitMargins.grossMarginPercent}% / ${profitMargins.netMarginPercent}%`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
