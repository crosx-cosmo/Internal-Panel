export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type TrackingMethod = 'S2S' | 'GET' | 'Browser Pixel' | 'CRM' | 'Offer Code';

export interface ExchangeRateTable {
  INR: number;
  USD: number;
  EUR: number;
  GBP: number;
  [key: string]: number | undefined;
}

/**
 * Explicit reference exchange rates to Indian Rupees (INR).
 * Used for deterministic, auditable conversion of foreign-denominated contracts
 * without silently relabeling USD/EUR figures as INR.
 */
export const DEFAULT_EXCHANGE_RATES_TO_INR: ExchangeRateTable = {
  INR: 1,
  USD: 84.0,
  EUR: 91.5,
  GBP: 108.5,
};

/**
 * Decimal-safe rounding to 2 decimal places (paise precision) to prevent IEEE-754 floating-point drift.
 */
export function roundPaise(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CurrencyConversionResult {
  amountInInr: number;
  sourceAmount: number;
  sourceCurrency: string;
  exchangeRateUsed: number | null;
  flaggedUnverified: boolean;
}

/**
 * Converts a monetary amount from its source currency into INR using explicit exchange rates.
 * Never relabels foreign amounts without multiplying by the verified rate.
 * Flags records whose currency is missing from the rate table.
 */
export function convertToINR(
  sourceAmount: number,
  sourceCurrency: string = 'INR',
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): CurrencyConversionResult {
  const normalizedCurrency = sourceCurrency.trim().toUpperCase();
  const rate = rates[normalizedCurrency];

  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    return {
      amountInInr: roundPaise(sourceAmount),
      sourceAmount: roundPaise(sourceAmount),
      sourceCurrency: normalizedCurrency,
      exchangeRateUsed: null,
      flaggedUnverified: true,
    };
  }

  return {
    amountInInr: roundPaise(sourceAmount * rate),
    sourceAmount: roundPaise(sourceAmount),
    sourceCurrency: normalizedCurrency,
    exchangeRateUsed: rate,
    flaggedUnverified: false,
  };
}

/**
 * Centralized INR currency formatter using Indian number grouping (en-IN) and ₹ symbol.
 */
export function formatINR(
  amountInInr: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const safeVal = roundPaise(amountInInr);
  const hasPaise = Math.abs(safeVal % 1) > 0.001;
  const minFrac = options?.minimumFractionDigits ?? (hasPaise ? 2 : 0);
  const maxFrac = options?.maximumFractionDigits ?? 2;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(safeVal);
}

/**
 * Formats an amount denominated in `sourceCurrency` into standardized INR (`₹`),
 * performing explicit conversion first if `sourceCurrency` is not already `INR`.
 */
export function formatCurrency(
  amount: number,
  sourceCurrency: string = 'INR',
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): string {
  const converted = convertToINR(amount, sourceCurrency, rates);
  if (converted.flaggedUnverified) {
    return `${formatINR(converted.amountInInr)} [Unverified ${converted.sourceCurrency}]`;
  }
  return formatINR(converted.amountInInr);
}

/**
 * Formats large INR values for compact chart axes (e.g., ₹1.2L, ₹45k, ₹2.4Cr).
 */
export function formatCompactINR(amountInInr: number): string {
  const abs = Math.abs(amountInInr);
  if (abs >= 10000000) {
    return `₹${roundPaise(amountInInr / 10000000)}Cr`;
  }
  if (abs >= 100000) {
    return `₹${roundPaise(amountInInr / 100000)}L`;
  }
  if (abs >= 1000) {
    return `₹${Math.round(amountInInr / 1000)}k`;
  }
  return `₹${Math.round(amountInInr)}`;
}

export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export interface ProfitMarginCalculation {
  /** ((Advertiser Payout - User Payout) / Advertiser Payout) * 100 */
  grossMarginPercent: number | null;
  /** ((Advertiser Payout - User Payout - Referral Payout) / Advertiser Payout) * 100 */
  netMarginPercent: number | null;
  grossProfitInr: number;
  netProfitInr: number;
  isZeroAdvertiser: boolean;
  isNegativeGross: boolean;
  isNegativeNet: boolean;
}

/**
 * Shared documented calculation utility for Campaign Wizard V2 Step 04.
 * Calculates both Gross Profit Margin (%) and Net Profit Margin (%) (accounting for Referral Payout).
 * Handles zero advertiser payout safely without dividing by zero, and never clamps negative margins.
 */
export function calculateProfitMargins(
  advertiserPayoutInr: number,
  userPayoutInr: number,
  referralPayoutInr: number = 0
): ProfitMarginCalculation {
  const adv = roundPaise(Number(advertiserPayoutInr) || 0);
  const usr = roundPaise(Number(userPayoutInr) || 0);
  const ref = roundPaise(Number(referralPayoutInr) || 0);

  const grossProfitInr = roundPaise(adv - usr);
  const netProfitInr = roundPaise(adv - usr - ref);

  if (adv <= 0) {
    return {
      grossMarginPercent: null,
      netMarginPercent: null,
      grossProfitInr,
      netProfitInr,
      isZeroAdvertiser: true,
      isNegativeGross: grossProfitInr < 0,
      isNegativeNet: netProfitInr < 0,
    };
  }

  const grossMarginPercent = roundPaise(((adv - usr) / adv) * 100);
  const netMarginPercent = roundPaise(((adv - usr - ref) / adv) * 100);

  return {
    grossMarginPercent,
    netMarginPercent,
    grossProfitInr,
    netProfitInr,
    isZeroAdvertiser: false,
    isNegativeGross: grossMarginPercent < 0,
    isNegativeNet: netMarginPercent < 0,
  };
}

export interface MacroTokenDefinition {
  token: string;
  syntax: string;
  label: string;
  category: 'core' | 'sub_id';
  description: string;
  serverResolved?: boolean;
}

/**
 * Organized Macro Token Library for Campaign Wizard V2 Step 02.
 * Clearly distinguishes primary Sub ID "x" from secondary "x1" through "x10".
 */
export const MACRO_TOKEN_LIBRARY: MacroTokenDefinition[] = [
  {
    token: 'c',
    syntax: '{c}',
    label: 'Click ID',
    category: 'core',
    description: 'Unique CrosX click attribution identifier generated at redirect',
  },
  {
    token: 'x',
    syntax: '{x}',
    label: 'Primary Sub ID',
    category: 'core',
    description: 'Primary publisher sub-affiliate / placement tracking ID (distinct from x1–x10)',
  },
  {
    token: 'offer_id',
    syntax: '{offer_id}',
    label: 'Offer ID',
    category: 'core',
    description: 'Unique campaign Offer ID configured in Step 01',
  },
  {
    token: 'payout',
    syntax: '{payout}',
    label: 'Payout Amount (INR)',
    category: 'core',
    description: 'Configured campaign payout value resolved from server ledger contract',
    serverResolved: true,
  },
  {
    token: 'ip',
    syntax: '{ip}',
    label: 'Request IP',
    category: 'core',
    description: 'Client IP resolved from trusted server-side request context',
    serverResolved: true,
  },
  {
    token: 'timestamp',
    syntax: '{timestamp}',
    label: 'Event Timestamp',
    category: 'core',
    description: 'UTC ISO-8601 or Unix epoch timestamp of the conversion event',
    serverResolved: true,
  },
  {
    token: 'event',
    syntax: '{event}',
    label: 'Conversion Event Name',
    category: 'core',
    description: 'Verified conversion event identifier (e.g. kyc_approved)',
  },
  ...Array.from({ length: 10 }, (_, idx) => {
    const num = idx + 1;
    return {
      token: `x${num}`,
      syntax: `{x${num}}`,
      label: `Sub ID ${num}`,
      category: 'sub_id' as const,
      description: `Auxiliary publisher parameter slot Sub ID ${num} (x${num})`,
    };
  }),
];

export function buildExampleTrackingUrl(
  method: TrackingMethod,
  offerId: string,
  baseDomain: string = 'https://trk.crosx.internal'
): string {
  const cleanOffer = (offerId || 'OFR-9001').trim();
  const cleanBase = baseDomain.replace(/\/+$/, '');
  switch (method) {
    case 'S2S':
      return `${cleanBase}/v2/s2s/click?offer_id=${encodeURIComponent(cleanOffer)}&c={c}&x={x}&x1={x1}&event={event}`;
    case 'GET':
      return `${cleanBase}/v2/redirect?offer_id=${encodeURIComponent(cleanOffer)}&c={c}&x={x}&timestamp={timestamp}`;
    case 'Browser Pixel':
      return `${cleanBase}/v2/pixel.gif?offer_id=${encodeURIComponent(cleanOffer)}&c={c}&event={event}&timestamp={timestamp}`;
    case 'CRM':
      return `${cleanBase}/v2/crm/webhook?offer_id=${encodeURIComponent(cleanOffer)}&c={c}&x={x}&event={event}&payout={payout}`;
    case 'Offer Code':
      return `${cleanBase}/v2/redeem?offer_id=${encodeURIComponent(cleanOffer)}&code={x}&c={c}&event={event}`;
  }
}

export interface CampaignLogoAsset {
  fileName: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  sizeBytes: number;
  storagePath: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface CampaignConversionEvent {
  id: string;
  name: string;
  identifier: string;
  description: string;
  active: boolean;
  payoutMappingInr?: number;
  isProtectedHistorical?: boolean;
}

export interface CampaignEventAlert {
  id: string;
  eventIdentifier: string;
  triggerCondition:
    | 'repeated_tracking_failures'
    | 'low_conversion_volume'
    | 'rejected_events_spike'
    | 'cap_reached_threshold';
  thresholdValue: string;
  severity: 'info' | 'warning' | 'critical';
  channel: 'webhook_relay' | 'slack_ops' | 'email_digest';
  enabled: boolean;
}

export interface CustomPayoutOverrideRule {
  id: string;
  eventIdentifier: string;
  advertiserPayoutInr: number;
  userPayoutInr: number;
  referralPayoutInr: number;
  updatedAt: string;
}

export interface CampaignAdvancedOptions {
  /** Configuration/status flag; never forges production client IPs */
  ipSpoofingConfigEnabled: boolean;
  /** Controlled sandbox-only synthetic IP test mode */
  ipSimulationTestMode: boolean;
  syntheticTestIp: string;
  /** Referral Features configuration */
  referralFeaturesEnabled: boolean;
  referralEligibilityRule: 'all_verified_users' | 'tier1_partners_only' | 'kyc_completed_only';
  referralAttributionModel: 'first_referrer' | 'last_referrer';
  referralLinkedEventId: string;
  /** Custom Payout rules */
  customPayoutEnabled: boolean;
  customPayoutOverrides: CustomPayoutOverrideRule[];
  /** Payable Events additional verification rules */
  enforceServerSideEventSignature: boolean;
  requireIdempotencyKeyOnPayableEvent: boolean;
  /** Shelf Referral — configuration-only toggle (pending specification) */
  shelfReferralEnabled: boolean;
  /** Same UPI ID validation policy */
  sameUpiIdEnabled: boolean;
  sameUpiPolicyAction: 'manual_fraud_review' | 'restrict_payout_until_kyc' | 'audit_log_only';
}

export const DEFAULT_ADVANCED_OPTIONS: CampaignAdvancedOptions = {
  ipSpoofingConfigEnabled: false,
  ipSimulationTestMode: false,
  syntheticTestIp: '198.51.100.42',
  referralFeaturesEnabled: false,
  referralEligibilityRule: 'all_verified_users',
  referralAttributionModel: 'first_referrer',
  referralLinkedEventId: 'kyc_approved',
  customPayoutEnabled: false,
  customPayoutOverrides: [],
  enforceServerSideEventSignature: true,
  requireIdempotencyKeyOnPayableEvent: true,
  shelfReferralEnabled: false,
  sameUpiIdEnabled: true,
  sameUpiPolicyAction: 'manual_fraud_review',
};

export interface CampaignRecord {
  id: string;
  offerId: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  startDate: string;
  endDate: string;
  totalCap: number;
  unlimitedCap?: boolean;
  logoAsset?: CampaignLogoAsset | null;
  trackingMethod: TrackingMethod;
  trackingUrl: string;
  clickTrackingEnabled: boolean;
  conversionTrackingEnabled: boolean;
  attributionWindowDays: number;
  attributionModel: 'last_touch' | 'first_touch' | 'linear' | 'time_decay';
  postbackOverrideUrl?: string;
  conversionEvents: CampaignConversionEvent[];
  eventAlerts: CampaignEventAlert[];
  templateId: string;
  /** Free-text payout model identifier (e.g. CPA, CPL, CPI, CPS, Revenue Share, Hybrid, Custom) */
  payoutType: string;
  /** Advertiser payout per payable event (in source `currency`) */
  advertiserPayout: number;
  /** Publisher/User payout per payable event (in source `currency`) */
  payoutAmount: number;
  /** Referral commission per payable event (in source `currency`) */
  referralPayout: number;
  /** Source contractual currency ('INR' default, or 'USD'/'EUR'/'GBP' with explicit conversion) */
  currency: SupportedCurrency;
  /** Explicit exchange rate snapshot to INR at contract creation/update */
  exchangeRateToInr: number;
  /** Mandatory payable event identifier from Step 02 */
  payableEventId: string;
  conversionCondition: string;
  /** Legacy compatibility alias for totalCap */
  dailyCap: number;
  advancedOptions: CampaignAdvancedOptions;
  clicks: number;
  conversions: number;
  /** Source gross revenue in `currency` */
  revenue: number;
  /** Source total partner payout in `currency` */
  payoutTotal: number;
  createdAt: string;
}

export function generateUniqueOfferId(
  existingOfferIds: string[],
  prefix: string = 'OFR'
): string {
  const normalizedSet = new Set(existingOfferIds.map((id) => id.trim().toUpperCase()));
  for (let attempt = 0; attempt < 500; attempt++) {
    const candidate = `${prefix}-${1000 + Math.floor(Math.random() * 8999)}`;
    if (!normalizedSet.has(candidate.toUpperCase())) {
      return candidate;
    }
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

export function isOfferIdUnique(
  offerId: string,
  campaigns: Pick<CampaignRecord, 'id' | 'offerId'>[],
  excludeCampaignId?: string
): boolean {
  const target = offerId.trim().toUpperCase();
  if (!target) return false;
  return !campaigns.some(
    (c) =>
      c.id !== excludeCampaignId &&
      (c.offerId || '').trim().toUpperCase() === target
  );
}

export function getCampaignRevenueInINR(
  campaign: CampaignRecord,
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): number {
  const effectiveRates = {
    ...rates,
    [campaign.currency]: campaign.exchangeRateToInr || rates[campaign.currency] || 1,
  };
  return convertToINR(campaign.revenue, campaign.currency, effectiveRates).amountInInr;
}

export function getCampaignPayoutTotalInINR(
  campaign: CampaignRecord,
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): number {
  const effectiveRates = {
    ...rates,
    [campaign.currency]: campaign.exchangeRateToInr || rates[campaign.currency] || 1,
  };
  return convertToINR(campaign.payoutTotal, campaign.currency, effectiveRates).amountInInr;
}

export function getCampaignUnitPayoutInINR(
  campaign: CampaignRecord,
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): number {
  const effectiveRates = {
    ...rates,
    [campaign.currency]: campaign.exchangeRateToInr || rates[campaign.currency] || 1,
  };
  return convertToINR(campaign.payoutAmount, campaign.currency, effectiveRates).amountInInr;
}

export function getCampaignAdvertiserPayoutInINR(
  campaign: CampaignRecord,
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): number {
  const effectiveRates = {
    ...rates,
    [campaign.currency]: campaign.exchangeRateToInr || rates[campaign.currency] || 1,
  };
  const sourceAdv = campaign.advertiserPayout ?? campaign.payoutAmount;
  return convertToINR(sourceAdv, campaign.currency, effectiveRates).amountInInr;
}

export function getCampaignReferralPayoutInINR(
  campaign: CampaignRecord,
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): number {
  const effectiveRates = {
    ...rates,
    [campaign.currency]: campaign.exchangeRateToInr || rates[campaign.currency] || 1,
  };
  return convertToINR(campaign.referralPayout ?? 0, campaign.currency, effectiveRates).amountInInr;
}

export interface DashboardKPIs {
  totalCampaigns: number;
  activeCampaigns: number;
  /** Standardized total revenue in INR */
  totalRevenue: number;
  /** Standardized total partner payout in INR */
  totalPayout: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  netMargin: number;
  /** Standardized Earnings Per Click in INR */
  epc: number;
}

export function calculateDashboardKPIs(
  campaigns: CampaignRecord[],
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): DashboardKPIs {
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

  let totalRevenueInr = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalPayoutInr = 0;

  for (const c of campaigns) {
    totalRevenueInr = roundPaise(totalRevenueInr + getCampaignRevenueInINR(c, rates));
    totalPayoutInr = roundPaise(totalPayoutInr + getCampaignPayoutTotalInINR(c, rates));
    totalClicks += c.clicks;
    totalConversions += c.conversions;
  }

  const conversionRate =
    totalClicks > 0 ? roundPaise((totalConversions / totalClicks) * 100) : 0;
  const netMargin =
    totalRevenueInr > 0
      ? Number((((totalRevenueInr - totalPayoutInr) / totalRevenueInr) * 100).toFixed(1))
      : 0;
  const epc = totalClicks > 0 ? roundPaise(totalRevenueInr / totalClicks) : 0;

  return {
    totalCampaigns,
    activeCampaigns,
    totalRevenue: totalRevenueInr,
    totalPayout: totalPayoutInr,
    totalClicks,
    totalConversions,
    conversionRate,
    netMargin,
    epc,
  };
}

export function interpolatePostbackUrl(
  baseUrl: string,
  params: Record<string, string | number>
): string {
  if (!baseUrl || !baseUrl.trim()) return '';
  let result = baseUrl.trim();
  for (const [key, value] of Object.entries(params)) {
    const token = `{${key}}`;
    result = result.split(token).join(encodeURIComponent(String(value)));
  }
  return result;
}

export function isValidIPv4OrCIDR(ip: string): boolean {
  const trimmed = ip.trim();
  const cidrRegex =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
  return cidrRegex.test(trimmed);
}

export function filterRecordsByQueryAndFacets<T extends Record<string, unknown>>(
  records: T[],
  options: {
    searchQuery?: string;
    searchKeys: (keyof T)[];
    facets?: Partial<Record<keyof T, string>>;
    dateKey?: keyof T;
    datePreset?: 'all' | 'today' | '7d' | '30d' | '90d';
    referenceDate?: Date;
  }
): T[] {
  const {
    searchQuery = '',
    searchKeys,
    facets = {},
    dateKey,
    datePreset = 'all',
    referenceDate = new Date('2026-10-18T12:00:00Z'),
  } = options;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return records.filter((item) => {
    for (const [facetKey, facetVal] of Object.entries(facets)) {
      if (typeof facetVal === 'string' && facetVal.length > 0 && facetVal !== 'all') {
        const recordVal = String(item[facetKey as keyof T] ?? '').toLowerCase();
        if (recordVal !== facetVal.toLowerCase()) {
          return false;
        }
      }
    }

    if (dateKey && datePreset !== 'all') {
      const rawDate = item[dateKey];
      if (typeof rawDate === 'string') {
        const itemDate = new Date(rawDate);
        const diffDays = (referenceDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
        if (datePreset === 'today' && diffDays > 1.5) return false;
        if (datePreset === '7d' && diffDays > 7.5) return false;
        if (datePreset === '30d' && diffDays > 30.5) return false;
        if (datePreset === '90d' && diffDays > 90.5) return false;
      }
    }

    if (normalizedQuery.length > 0) {
      const matchesSearch = searchKeys.some((key) => {
        const val = item[key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(normalizedQuery);
      });
      if (!matchesSearch) return false;
    }

    return true;
  });
}

export type ReferralStatus = 'pending' | 'approved' | 'rejected';

export interface ReferralRecord {
  id: string;
  campaignId: string;
  offerId: string;
  campaignName: string;
  referrerName: string;
  referrerId: string;
  referrerEmail: string;
  referredUserName: string;
  referredUserEmail: string;
  referredUpiHash: string;
  sameUpiFlagged: boolean;
  linkedEventIdentifier: string;
  attributionModel: 'first_referrer' | 'last_referrer';
  conversionCompleted: boolean;
  payoutAmount: number;
  currency: SupportedCurrency;
  exchangeRateToInr: number;
  status: ReferralStatus;
  notes: string;
  createdAt: string;
}

export interface ReferralMetricsSummary {
  totalReferrals: number;
  pendingReferrals: number;
  approvedReferrals: number;
  rejectedReferrals: number;
  referralConversions: number;
  /** Total approved referral payouts in INR */
  approvedPayoutTotalInr: number;
  /** Total pending referral payouts in INR */
  pendingPayoutTotalInr: number;
  flaggedSameUpiCount: number;
}

export function getReferralPayoutInINR(
  referral: Pick<ReferralRecord, 'payoutAmount' | 'currency' | 'exchangeRateToInr'>,
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): number {
  const effectiveRates = {
    ...rates,
    [referral.currency]: referral.exchangeRateToInr || rates[referral.currency] || 1,
  };
  return convertToINR(referral.payoutAmount, referral.currency, effectiveRates).amountInInr;
}

export function calculateReferralMetrics(
  referrals: ReferralRecord[],
  rates: Record<string, number | undefined> = DEFAULT_EXCHANGE_RATES_TO_INR
): ReferralMetricsSummary {
  let pendingReferrals = 0;
  let approvedReferrals = 0;
  let rejectedReferrals = 0;
  let referralConversions = 0;
  let approvedPayoutTotalInr = 0;
  let pendingPayoutTotalInr = 0;
  let flaggedSameUpiCount = 0;

  for (const r of referrals) {
    const payoutInr = getReferralPayoutInINR(r, rates);
    if (r.status === 'pending') {
      pendingReferrals++;
      pendingPayoutTotalInr = roundPaise(pendingPayoutTotalInr + payoutInr);
    } else if (r.status === 'approved') {
      approvedReferrals++;
      approvedPayoutTotalInr = roundPaise(approvedPayoutTotalInr + payoutInr);
    } else if (r.status === 'rejected') {
      rejectedReferrals++;
    }

    if (r.conversionCompleted) {
      referralConversions++;
    }
    if (r.sameUpiFlagged) {
      flaggedSameUpiCount++;
    }
  }

  return {
    totalReferrals: referrals.length,
    pendingReferrals,
    approvedReferrals,
    rejectedReferrals,
    referralConversions,
    approvedPayoutTotalInr,
    pendingPayoutTotalInr,
    flaggedSameUpiCount,
  };
}

export type TrackerStatus = 'active' | 'paused' | 'testing';

export interface TrackerRecord {
  id: string;
  name: string;
  campaignId: string;
  offerId: string;
  campaignName: string;
  trackingMethod: TrackingMethod;
  partnerSource: string;
  primarySubIdParam: string;
  secondarySubIds: string[];
  trackingUrl: string;
  postbackCallbackUrl: string;
  status: TrackerStatus;
  clicks: number;
  conversions: number;
  referralConversions: number;
  avgLatencyMs: number;
  trackedPayoutInr: number;
  lastPingAt: string;
  createdAt: string;
}

export interface TrackerMetricsSummary {
  totalTrackers: number;
  activeTrackers: number;
  totalTrackedClicks: number;
  totalTrackedConversions: number;
  totalReferralConversions: number;
  avgLatencyMs: number;
  totalTrackedPayoutInr: number;
  conversionRatePercent: number;
}

export function calculateTrackerMetrics(trackers: TrackerRecord[]): TrackerMetricsSummary {
  const totalTrackers = trackers.length;
  const activeTrackers = trackers.filter((t) => t.status === 'active').length;
  let totalTrackedClicks = 0;
  let totalTrackedConversions = 0;
  let totalReferralConversions = 0;
  let totalLatency = 0;
  let totalTrackedPayoutInr = 0;

  for (const t of trackers) {
    totalTrackedClicks += t.clicks;
    totalTrackedConversions += t.conversions;
    totalReferralConversions += t.referralConversions;
    totalLatency += t.avgLatencyMs;
    totalTrackedPayoutInr = roundPaise(totalTrackedPayoutInr + t.trackedPayoutInr);
  }

  const avgLatencyMs = totalTrackers > 0 ? Math.round(totalLatency / totalTrackers) : 0;
  const conversionRatePercent =
    totalTrackedClicks > 0
      ? roundPaise((totalTrackedConversions / totalTrackedClicks) * 100)
      : 0;

  return {
    totalTrackers,
    activeTrackers,
    totalTrackedClicks,
    totalTrackedConversions,
    totalReferralConversions,
    avgLatencyMs,
    totalTrackedPayoutInr,
    conversionRatePercent,
  };
}

export interface TemplatePreviewField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder: string;
}

export interface TemplateSubmissionValidationResult {
  valid: boolean;
  missingFields: string[];
  invalidEmailFields: string[];
  normalizedValues: Record<string, string | number | boolean>;
}

/**
 * Generates realistic domain options for a template field of type 'select'
 * based on its placeholder or field key so Live Form Preview renders a functional dropdown.
 */
export function getSelectOptionsForTemplateField(
  field: Pick<TemplatePreviewField, 'key' | 'placeholder'>
): { label: string; value: string }[] {
  const rawPlaceholder = (field.placeholder || '').trim();
  const keyLower = (field.key || '').toLowerCase();

  if (rawPlaceholder.includes(',')) {
    return rawPlaceholder
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((item) => ({ label: item, value: item }));
  }

  if (keyLower.includes('employment') || keyLower.includes('occupation')) {
    const base = ['Full-Time Salaried', 'Self-Employed / Business', 'Freelance Consultant', 'Executive / Director'];
    if (rawPlaceholder && !base.includes(rawPlaceholder)) base.unshift(rawPlaceholder);
    return base.map((v) => ({ label: v, value: v }));
  }

  if (keyLower.includes('policy') || keyLower.includes('tier') || keyLower.includes('plan')) {
    const base = ['Comprehensive Zero-Dep', 'Standard Third-Party', 'Enterprise Fleet Cover'];
    if (rawPlaceholder && !base.includes(rawPlaceholder)) base.unshift(rawPlaceholder);
    return base.map((v) => ({ label: v, value: v }));
  }

  const defaults = [
    rawPlaceholder || 'Tier-1 Verified',
    'Standard Qualification',
    'Enterprise Priority',
  ];
  return Array.from(new Set(defaults)).map((v) => ({ label: v, value: v }));
}

/**
 * Builds initial sample values for the Live Form Preview from a template's fields.
 */
export function buildDefaultTemplatePreviewValues(
  fields: TemplatePreviewField[],
  populateSample: boolean = true
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const field of fields) {
    if (field.type === 'checkbox') {
      out[field.key] = populateSample ? true : false;
    } else if (field.type === 'select') {
      const opts = getSelectOptionsForTemplateField(field);
      out[field.key] = populateSample ? (opts[0]?.value ?? '') : '';
    } else {
      out[field.key] = populateSample ? (field.placeholder || '') : '';
    }
  }
  return out;
}

/**
 * Validates interactive Live Form Preview values against the selected template's field schema.
 */
export function validateTemplatePreviewSubmission(
  fields: TemplatePreviewField[],
  values: Record<string, string | boolean | undefined>
): TemplateSubmissionValidationResult {
  const missingFields: string[] = [];
  const invalidEmailFields: string[] = [];
  const normalizedValues: Record<string, string | number | boolean> = {};

  for (const f of fields) {
    const raw = values[f.key];
    if (f.type === 'checkbox') {
      const checked = Boolean(raw);
      normalizedValues[f.key] = checked;
      if (f.required && !checked) {
        missingFields.push(f.label);
      }
      continue;
    }

    const strVal = typeof raw === 'string' ? raw.trim() : '';
    if (f.required && strVal.length === 0) {
      missingFields.push(f.label);
      normalizedValues[f.key] = '';
      continue;
    }

    if (f.type === 'email' && strVal.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
      invalidEmailFields.push(f.label);
    }

    if (f.type === 'number') {
      const num = Number(strVal);
      normalizedValues[f.key] = strVal.length > 0 && Number.isFinite(num) ? num : 0;
    } else {
      normalizedValues[f.key] = strVal;
    }
  }

  return {
    valid: missingFields.length === 0 && invalidEmailFields.length === 0,
    missingFields,
    invalidEmailFields,
    normalizedValues,
  };
}

