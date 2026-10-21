'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  INITIAL_CAMPAIGNS,
  INITIAL_SUBMISSIONS,
  INITIAL_CLICKS,
  INITIAL_CONVERSIONS,
  INITIAL_POSTBACK_CONFIG,
  INITIAL_IP_WHITELIST,
  INITIAL_TEMPLATES,
  INITIAL_API_KEYS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_REFERRALS,
  INITIAL_TRACKERS,
  type SubmissionRecord,
  type ClickRecord,
  type ConversionRecord,
  type GlobalPostbackConfig,
  type IpWhitelistRecord,
  type TemplateRecord,
  type ApiKeyRecord,
  type ActivityLogItem,
} from './mock-data';
import {
  DEFAULT_EXCHANGE_RATES_TO_INR,
  DEFAULT_ADVANCED_OPTIONS,
  generateUniqueOfferId,
  roundPaise,
  type CampaignRecord,
  type SupportedCurrency,
  type ExchangeRateTable,
  type ReferralRecord,
  type ReferralStatus,
  type TrackerRecord,
  type TrackerStatus,
} from './crosx-logic';

export type NavSectionId =
  | 'dashboard'
  | 'campaign-create'
  | 'campaign-all'
  | 'reports-submission'
  | 'reports-click'
  | 'reports-conversion'
  | 'management-referral'
  | 'management-tracker'
  | 'postback-global'
  | 'postback-ip'
  | 'template-create'
  | 'template-all'
  | 'profile'
  | 'api'
  | 'settings';

export interface UserProfile {
  fullName: string;
  email: string;
  role: string;
  department: string;
  timezone: string;
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
}

export interface SystemSettings {
  workspaceName: string;
  defaultCurrency: SupportedCurrency;
  exchangeRates: ExchangeRateTable;
  defaultAttributionWindow: number;
  strictFraudFiltering: boolean;
  autoRetryFailedPostbacks: boolean;
  slackWebhookAlerts: boolean;
  dailyDigestEmail: boolean;
  capThresholdAlertPercent: number;
  compactTableDensity: boolean;
}

const CAMPAIGNS_STORAGE_KEY = 'crosx-campaigns-v2-store';
const REFERRALS_STORAGE_KEY = 'crosx-referrals-v2-store';
const TRACKERS_STORAGE_KEY = 'crosx-trackers-v2-store';
const TEMPLATES_STORAGE_KEY = 'crosx-templates-v2-store';

interface CrosXStoreContextValue {
  activeSection: NavSectionId;
  setActiveSection: (section: NavSectionId) => void;
  editingWizardCampaignId: string | null;
  setEditingWizardCampaignId: (id: string | null) => void;
  campaigns: CampaignRecord[];
  addCampaign: (
    campaign: Omit<
      CampaignRecord,
      'id' | 'clicks' | 'conversions' | 'revenue' | 'payoutTotal' | 'createdAt' | 'exchangeRateToInr'
    > & { exchangeRateToInr?: number }
  ) => CampaignRecord;
  updateCampaign: (id: string, patch: Partial<CampaignRecord>) => void;
  duplicateCampaign: (id: string) => CampaignRecord | null;
  deleteCampaign: (id: string) => void;
  referrals: ReferralRecord[];
  addReferral: (
    item: Omit<ReferralRecord, 'id' | 'createdAt' | 'exchangeRateToInr'> & {
      exchangeRateToInr?: number;
    }
  ) => ReferralRecord;
  updateReferralStatus: (ids: string[], status: ReferralStatus) => void;
  deleteReferral: (id: string) => void;
  trackers: TrackerRecord[];
  addTracker: (
    item: Omit<
      TrackerRecord,
      | 'id'
      | 'clicks'
      | 'conversions'
      | 'referralConversions'
      | 'avgLatencyMs'
      | 'trackedPayoutInr'
      | 'lastPingAt'
      | 'createdAt'
    >
  ) => TrackerRecord;
  updateTrackerStatus: (id: string, status: TrackerStatus) => void;
  recordTrackerTestEvent: (
    id: string,
    eventType: 'click' | 'conversion' | 'referral',
    payoutInr: number
  ) => void;
  deleteTracker: (id: string) => void;
  submissions: SubmissionRecord[];
  updateSubmissionStatus: (ids: string[], status: SubmissionRecord['status']) => void;
  clicks: ClickRecord[];
  conversions: ConversionRecord[];
  updateConversionStatus: (ids: string[], status: ConversionRecord['status']) => void;
  postbackConfig: GlobalPostbackConfig;
  updatePostbackConfig: (config: GlobalPostbackConfig) => void;
  ipWhitelist: IpWhitelistRecord[];
  addIpWhitelist: (item: Omit<IpWhitelistRecord, 'id' | 'addedDate'>) => IpWhitelistRecord;
  toggleIpStatus: (id: string) => void;
  deleteIpWhitelist: (id: string) => void;
  templates: TemplateRecord[];
  addTemplate: (tpl: Omit<TemplateRecord, 'id' | 'usageCount' | 'updatedAt'>) => TemplateRecord;
  updateTemplate: (id: string, patch: Partial<TemplateRecord>) => void;
  deleteTemplate: (id: string) => void;
  apiKeys: ApiKeyRecord[];
  createApiKey: (
    name: string,
    environment: 'live' | 'sandbox',
    scopes: string[]
  ) => { record: ApiKeyRecord; rawSecret: string };
  revokeApiKey: (id: string) => void;
  activityLogs: ActivityLogItem[];
  logActivity: (action: string, target: string, category: ActivityLogItem['category']) => void;
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  settings: SystemSettings;
  updateSettings: (patch: Partial<SystemSettings>) => void;
}

const CrosXStoreContext = createContext<CrosXStoreContextValue | null>(null);

export function CrosXProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [editingWizardCampaignId, setEditingWizardCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(INITIAL_CAMPAIGNS);
  const [referrals, setReferrals] = useState<ReferralRecord[]>(INITIAL_REFERRALS);
  const [trackers, setTrackers] = useState<TrackerRecord[]>(INITIAL_TRACKERS);
  const [templates, setTemplates] = useState<TemplateRecord[]>(INITIAL_TEMPLATES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCampaigns = window.localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      if (savedCampaigns) {
        const parsed = JSON.parse(savedCampaigns);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCampaigns(parsed);
        }
      }
      const savedReferrals = window.localStorage.getItem(REFERRALS_STORAGE_KEY);
      if (savedReferrals) {
        const parsedRef = JSON.parse(savedReferrals);
        if (Array.isArray(parsedRef) && parsedRef.length > 0) {
          setReferrals(parsedRef);
        }
      }
      const savedTrackers = window.localStorage.getItem(TRACKERS_STORAGE_KEY);
      if (savedTrackers) {
        const parsedTrk = JSON.parse(savedTrackers);
        if (Array.isArray(parsedTrk) && parsedTrk.length > 0) {
          setTrackers(parsedTrk);
        }
      }
      const savedTemplates = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (savedTemplates) {
        const parsedTpl = JSON.parse(savedTemplates);
        if (Array.isArray(parsedTpl) && parsedTpl.length > 0) {
          setTemplates(parsedTpl);
        }
      }
    } catch {
      // ignore storage errors
    }
    setHydrated(true);
  }, []);

  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(INITIAL_SUBMISSIONS);
  const [clicks] = useState<ClickRecord[]>(INITIAL_CLICKS);
  const [conversions, setConversions] = useState<ConversionRecord[]>(INITIAL_CONVERSIONS);
  const [postbackConfig, setPostbackConfig] = useState<GlobalPostbackConfig>(INITIAL_POSTBACK_CONFIG);
  const [ipWhitelist, setIpWhitelist] = useState<IpWhitelistRecord[]>(INITIAL_IP_WHITELIST);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(INITIAL_API_KEYS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(INITIAL_ACTIVITY_LOGS);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
      window.localStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(referrals));
      window.localStorage.setItem(TRACKERS_STORAGE_KEY, JSON.stringify(trackers));
      window.localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // ignore storage quota errors
    }
  }, [campaigns, referrals, trackers, templates, hydrated]);

  const [profile, setProfile] = useState<UserProfile>({
    fullName: 'Elena Vance',
    email: 'e.vance@crosx.io',
    role: 'VP of Ad-Tech Operations',
    department: 'Global Attribution & Network Ops',
    timezone: 'UTC+05:30 (Asia/Kolkata · IST)',
    twoFactorEnabled: true,
    sessionTimeoutMinutes: 60,
  });

  const [settings, setSettings] = useState<SystemSettings>({
    workspaceName: 'CrosX Global Network Operations',
    defaultCurrency: 'INR',
    exchangeRates: { ...DEFAULT_EXCHANGE_RATES_TO_INR },
    defaultAttributionWindow: 30,
    strictFraudFiltering: true,
    autoRetryFailedPostbacks: true,
    slackWebhookAlerts: true,
    dailyDigestEmail: true,
    capThresholdAlertPercent: 85,
    compactTableDensity: false,
  });

  const logActivity = (
    action: string,
    target: string,
    category: ActivityLogItem['category']
  ) => {
    const newItem: ActivityLogItem = {
      id: `ACT-${Date.now()}`,
      actor: `${profile.fullName} (${profile.role})`,
      action,
      target,
      category,
      timestamp: 'Just now',
    };
    setActivityLogs((prev) => [newItem, ...prev]);
  };

  const addCampaign: CrosXStoreContextValue['addCampaign'] = (input) => {
    const newId = `CMP-${Math.floor(8540 + Math.random() * 400)}`;
    const rate =
      input.exchangeRateToInr ??
      settings.exchangeRates[input.currency] ??
      DEFAULT_EXCHANGE_RATES_TO_INR[input.currency] ??
      1;
    const newCampaign: CampaignRecord = {
      ...input,
      id: newId,
      offerId:
        input.offerId?.trim() ||
        generateUniqueOfferId(campaigns.map((c) => c.offerId)),
      totalCap: input.totalCap ?? input.dailyCap ?? 1000,
      dailyCap: input.dailyCap ?? input.totalCap ?? 1000,
      advertiserPayout: input.advertiserPayout ?? input.payoutAmount,
      referralPayout: input.referralPayout ?? 0,
      trackingMethod: input.trackingMethod ?? 'S2S',
      conversionEvents: input.conversionEvents ?? [],
      eventAlerts: input.eventAlerts ?? [],
      payableEventId: input.payableEventId ?? '',
      advancedOptions: input.advancedOptions ?? { ...DEFAULT_ADVANCED_OPTIONS },
      exchangeRateToInr: rate,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      payoutTotal: 0,
      createdAt: '2026-10-19',
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    logActivity(
      'Created new campaign',
      `${newId} (${newCampaign.offerId}) · ${newCampaign.name}`,
      'campaign'
    );
    return newCampaign;
  };

  const updateCampaign: CrosXStoreContextValue['updateCampaign'] = (id, patch) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    logActivity('Updated campaign configuration', `Campaign ${id}`, 'campaign');
  };

  const duplicateCampaign: CrosXStoreContextValue['duplicateCampaign'] = (id) => {
    const existing = campaigns.find((c) => c.id === id);
    if (!existing) return null;
    const copyId = `CMP-${Math.floor(8600 + Math.random() * 399)}`;
    const nextOfferId = generateUniqueOfferId(campaigns.map((c) => c.offerId));
    const duplicated: CampaignRecord = {
      ...existing,
      id: copyId,
      offerId: nextOfferId,
      name: `${existing.name} (Copy)`,
      status: 'draft',
      clicks: 0,
      conversions: 0,
      revenue: 0,
      payoutTotal: 0,
      createdAt: '2026-10-19',
    };
    setCampaigns((prev) => [duplicated, ...prev]);
    logActivity(
      'Duplicated campaign',
      `${copyId} (${nextOfferId}) · ${duplicated.name}`,
      'campaign'
    );
    return duplicated;
  };

  const deleteCampaign: CrosXStoreContextValue['deleteCampaign'] = (id) => {
    const existing = campaigns.find((c) => c.id === id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    if (existing) {
      logActivity('Deleted campaign', `${existing.id} · ${existing.name}`, 'campaign');
    }
  };

  const addReferral: CrosXStoreContextValue['addReferral'] = (item) => {
    const newId = `REF-${Math.floor(9410 + Math.random() * 580)}`;
    const rate =
      item.exchangeRateToInr ??
      settings.exchangeRates[item.currency] ??
      DEFAULT_EXCHANGE_RATES_TO_INR[item.currency] ??
      1;
    const record: ReferralRecord = {
      ...item,
      id: newId,
      exchangeRateToInr: rate,
      createdAt: new Date().toISOString(),
    };
    setReferrals((prev) => [record, ...prev]);
    logActivity(
      'Recorded referral attribution',
      `${newId} · ${record.referrerName} → ${record.referredUserName}`,
      'campaign'
    );
    return record;
  };

  const updateReferralStatus: CrosXStoreContextValue['updateReferralStatus'] = (
    ids,
    status
  ) => {
    setReferrals((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r))
    );
    logActivity(
      `Updated referral status to ${status}`,
      `${ids.length} referral record(s)`,
      'campaign'
    );
  };

  const deleteReferral: CrosXStoreContextValue['deleteReferral'] = (id) => {
    setReferrals((prev) => prev.filter((r) => r.id !== id));
    logActivity('Removed referral record', id, 'campaign');
  };

  const addTracker: CrosXStoreContextValue['addTracker'] = (item) => {
    const newId = `TRK-${Math.floor(710 + Math.random() * 280)}`;
    const record: TrackerRecord = {
      ...item,
      id: newId,
      clicks: 0,
      conversions: 0,
      referralConversions: 0,
      avgLatencyMs: 15,
      trackedPayoutInr: 0,
      lastPingAt: 'Just provisioned',
      createdAt: '2026-10-19',
    };
    setTrackers((prev) => [record, ...prev]);
    logActivity(
      'Provisioned attribution tracker',
      `${newId} · ${record.name} (${record.offerId})`,
      'postback'
    );
    return record;
  };

  const updateTrackerStatus: CrosXStoreContextValue['updateTrackerStatus'] = (
    id,
    status
  ) => {
    setTrackers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
    logActivity(`Changed tracker ${id} status to ${status}`, id, 'postback');
  };

  const recordTrackerTestEvent: CrosXStoreContextValue['recordTrackerTestEvent'] = (
    id,
    eventType,
    payoutInr
  ) => {
    setTrackers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          clicks: t.clicks + 1,
          conversions: eventType !== 'click' ? t.conversions + 1 : t.conversions,
          referralConversions:
            eventType === 'referral' ? t.referralConversions + 1 : t.referralConversions,
          trackedPayoutInr:
            eventType !== 'click'
              ? roundPaise(t.trackedPayoutInr + payoutInr)
              : t.trackedPayoutInr,
          lastPingAt: 'Just now (verified 200 OK)',
        };
      })
    );
    logActivity(
      `Executed tracker diagnostic ping (${eventType})`,
      `Tracker ${id}`,
      'postback'
    );
  };

  const deleteTracker: CrosXStoreContextValue['deleteTracker'] = (id) => {
    setTrackers((prev) => prev.filter((t) => t.id !== id));
    logActivity('Deleted tracker endpoint', id, 'postback');
  };

  const updateSubmissionStatus: CrosXStoreContextValue['updateSubmissionStatus'] = (
    ids,
    status
  ) => {
    setSubmissions((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status } : s))
    );
  };

  const updateConversionStatus: CrosXStoreContextValue['updateConversionStatus'] = (
    ids,
    status
  ) => {
    setConversions((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, status } : c))
    );
  };

  const updatePostbackConfig: CrosXStoreContextValue['updatePostbackConfig'] = (
    config
  ) => {
    setPostbackConfig({
      ...config,
      lastVerifiedAt: new Date().toISOString(),
    });
    logActivity('Updated global S2S postback configuration', config.url, 'postback');
  };

  const addIpWhitelist: CrosXStoreContextValue['addIpWhitelist'] = (item) => {
    const newIp: IpWhitelistRecord = {
      ...item,
      id: `IP-${Math.floor(110 + Math.random() * 890)}`,
      addedDate: '2026-10-19',
    };
    setIpWhitelist((prev) => [newIp, ...prev]);
    logActivity('Whitelisted IP / CIDR range', newIp.ipAddress, 'security');
    return newIp;
  };

  const toggleIpStatus: CrosXStoreContextValue['toggleIpStatus'] = (id) => {
    setIpWhitelist((prev) =>
      prev.map((ip) =>
        ip.id === id
          ? { ...ip, status: ip.status === 'active' ? 'disabled' : 'active' }
          : ip
      )
    );
  };

  const deleteIpWhitelist: CrosXStoreContextValue['deleteIpWhitelist'] = (id) => {
    setIpWhitelist((prev) => prev.filter((ip) => ip.id !== id));
  };

  const addTemplate: CrosXStoreContextValue['addTemplate'] = (tpl) => {
    const newTpl: TemplateRecord = {
      ...tpl,
      id: `TPL-${Math.floor(405 + Math.random() * 500)}`,
      usageCount: 0,
      updatedAt: '2026-10-19',
    };
    setTemplates((prev) => [newTpl, ...prev]);
    logActivity('Created intake/postback template', `${newTpl.id} · ${newTpl.name}`, 'template');
    return newTpl;
  };

  const updateTemplate: CrosXStoreContextValue['updateTemplate'] = (id, patch) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: '2026-10-19' } : t
      )
    );
  };

  const deleteTemplate: CrosXStoreContextValue['deleteTemplate'] = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const createApiKey: CrosXStoreContextValue['createApiKey'] = (
    name,
    environment,
    scopes
  ) => {
    const randHex = Math.random().toString(16).substring(2, 6);
    const tailHex = Math.random().toString(16).substring(2, 6);
    const midSecret =
      Math.random().toString(36).substring(2, 14) +
      Math.random().toString(36).substring(2, 10);
    const prefix = `cx_${environment === 'live' ? 'live' : 'test'}_${randHex}`;
    const rawSecret = `${prefix}_${midSecret}_${tailHex}`;
    const record: ApiKeyRecord = {
      id: `KEY-${Math.floor(905 + Math.random() * 90)}`,
      name,
      prefix,
      maskedKey: `${prefix}••••••••••••••••••••${tailHex}`,
      environment,
      scopes,
      status: 'active',
      createdAt: '2026-10-19',
      lastUsed: 'Never',
    };
    setApiKeys((prev) => [record, ...prev]);
    logActivity('Provisioned API key', `${record.name} (${record.prefix})`, 'api');
    return { record, rawSecret };
  };

  const revokeApiKey: CrosXStoreContextValue['revokeApiKey'] = (id) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k))
    );
    logActivity('Revoked API key', `Key ID ${id}`, 'api');
  };

  const updateProfile: CrosXStoreContextValue['updateProfile'] = (patch) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    logActivity('Updated operator profile settings', profile.email, 'security');
  };

  const updateSettings: CrosXStoreContextValue['updateSettings'] = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <CrosXStoreContext.Provider
        value={{
          activeSection,
          setActiveSection,
          editingWizardCampaignId,
          setEditingWizardCampaignId,
          campaigns,
          addCampaign,
          updateCampaign,
          duplicateCampaign,
          deleteCampaign,
          referrals,
          addReferral,
          updateReferralStatus,
          deleteReferral,
          trackers,
          addTracker,
          updateTrackerStatus,
          recordTrackerTestEvent,
          deleteTracker,
          submissions,
          updateSubmissionStatus,
          clicks,
          conversions,
          updateConversionStatus,
          postbackConfig,
          updatePostbackConfig,
          ipWhitelist,
          addIpWhitelist,
          toggleIpStatus,
          deleteIpWhitelist,
          templates,
          addTemplate,
          updateTemplate,
          deleteTemplate,
          apiKeys,
          createApiKey,
          revokeApiKey,
          activityLogs,
          logActivity,
          profile,
          updateProfile,
          settings,
          updateSettings,
        }}
      >
        {children}
      </CrosXStoreContext.Provider>
    </QueryClientProvider>
  );
}

export function useCrosXStore() {
  const ctx = useContext(CrosXStoreContext);
  if (!ctx) {
    throw new Error('useCrosXStore must be used within CrosXProviders');
  }
  return ctx;
}
