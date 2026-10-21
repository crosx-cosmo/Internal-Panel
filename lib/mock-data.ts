import {
  DEFAULT_ADVANCED_OPTIONS,
  type CampaignRecord,
  type SupportedCurrency,
  type ReferralRecord,
  type TrackerRecord,
} from './crosx-logic';

export interface SubmissionRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  source: string;
  subId: string;
  leadEmail: string;
  country: string;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  status: 'verified' | 'pending' | 'rejected';
  payloadSummary: string;
  timestamp: string;
}

export interface ClickRecord {
  id: string;
  clickId: string;
  campaignId: string;
  campaignName: string;
  source: string;
  ipAddress: string;
  country: string;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  os: string;
  status: 'unique' | 'duplicate' | 'filtered';
  latencyMs: number;
  timestamp: string;
}

export interface ConversionRecord {
  id: string;
  conversionId: string;
  clickId: string;
  campaignId: string;
  campaignName: string;
  source: string;
  eventType: 'KYC_Approved' | 'First_Deposit' | 'Trial_Activated' | 'Purchase' | 'Lead_Qualified';
  /** Contractual payout in sourceCurrency */
  payout: number;
  /** Contractual revenue in sourceCurrency */
  revenue: number;
  sourceCurrency: SupportedCurrency;
  exchangeRateToInr: number;
  status: 'approved' | 'pending' | 'chargeback';
  postbackFired: boolean;
  timestamp: string;
}

export interface GlobalPostbackConfig {
  enabled: boolean;
  url: string;
  method: 'GET' | 'POST';
  timeoutMs: number;
  retryAttempts: number;
  parameters: { key: string; macro: string; enabled: boolean }[];
  eventMapping: {
    onClick: boolean;
    onSubmission: boolean;
    onConversionApproved: boolean;
    onConversionRejected: boolean;
  };
  lastVerifiedAt: string;
}

export interface IpWhitelistRecord {
  id: string;
  ipAddress: string;
  description: string;
  environment: 'Production' | 'Staging' | 'Partner Relay';
  status: 'active' | 'disabled';
  addedDate: string;
}

export interface TemplateField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder: string;
}

export interface TemplateRecord {
  id: string;
  name: string;
  type: 'Lead Capture' | 'Postback Schema' | 'Offer Wall' | 'Attribution Pixel';
  status: 'active' | 'draft' | 'archived';
  fields: TemplateField[];
  usageCount: number;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  environment: 'live' | 'sandbox';
  scopes: string[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsed: string;
}

export interface ActivityLogItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  category: 'campaign' | 'postback' | 'security' | 'template' | 'api';
  timestamp: string;
}

/**
 * Campaign records preserve their contractual source figures and currency alongside
 * the verified `exchangeRateToInr` snapshot so all INR aggregations are mathematically exact.
 */
export const INITIAL_CAMPAIGNS: CampaignRecord[] = [
  {
    id: 'CMP-8492',
    offerId: 'OFR-8492',
    name: 'Vanguard NeoBank Premier Card',
    brand: 'Vanguard Financial',
    category: 'Fintech',
    description: 'Tier-1 credit qualification campaign with instant API decisioning.',
    status: 'active',
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    totalCap: 8000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'S2S',
    trackingUrl: 'https://trk.crosx.internal/v2/s2s/click?offer_id=OFR-8492&c={c}&x={x}&x1={x1}&event={event}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 30,
    attributionModel: 'last_touch',
    postbackOverrideUrl: 'https://pb.vanguardfin.io/s2s?c={c}&x={x}&offer_id={offer_id}&payout={payout}',
    conversionEvents: [
      {
        id: 'evt_vanguard_kyc',
        name: 'Instant KYC Approved',
        identifier: 'kyc_approved',
        description: 'Video KYC and PAN verification passed',
        active: true,
        payoutMappingInr: 1500,
        isProtectedHistorical: true,
      },
      {
        id: 'evt_vanguard_card',
        name: 'Card Issued & Activated',
        identifier: 'card_issued',
        description: 'Credit line provisioned and card dispatched',
        active: true,
        payoutMappingInr: 5712,
        isProtectedHistorical: true,
      },
    ],
    eventAlerts: [
      {
        id: 'alt_vanguard_1',
        eventIdentifier: 'card_issued',
        triggerCondition: 'repeated_tracking_failures',
        thresholdValue: '5 consecutive S2S timeouts',
        severity: 'critical',
        channel: 'slack_ops',
        enabled: true,
      },
    ],
    templateId: 'TPL-401',
    payoutType: 'CPA',
    advertiserPayout: 7728,
    payoutAmount: 5712, // 68 USD * 84.0 = ₹5,712
    referralPayout: 288,
    currency: 'INR',
    exchangeRateToInr: 1.0,
    payableEventId: 'card_issued',
    conversionCondition: 'Instant KYC + Card Issued',
    dailyCap: 800,
    advancedOptions: {
      ...DEFAULT_ADVANCED_OPTIONS,
      referralFeaturesEnabled: true,
      referralLinkedEventId: 'card_issued',
    },
    clicks: 148920,
    conversions: 6410,
    revenue: 49536480, // ₹4,95,36,480
    payoutTotal: 36613920, // ₹3,66,13,920
    createdAt: '2026-09-01',
  },
  {
    id: 'CMP-8495',
    offerId: 'OFR-8495',
    name: 'LinearCloud Enterprise DevOps Trial',
    brand: 'LinearCloud Inc.',
    category: 'B2B SaaS',
    description: '14-day Kubernetes cluster orchestration trial for engineering teams.',
    status: 'active',
    startDate: '2026-09-12',
    endDate: '2026-12-15',
    totalCap: 5000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'S2S',
    trackingUrl: 'https://trk.crosx.internal/v2/s2s/click?offer_id=OFR-8495&c={c}&x={x}&event={event}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 14,
    attributionModel: 'first_touch',
    conversionEvents: [
      {
        id: 'evt_lc_cluster',
        name: 'Cluster Deployed',
        identifier: 'cluster_deployed',
        description: 'Production Kubernetes cluster active for 24h',
        active: true,
        payoutMappingInr: 3570,
        isProtectedHistorical: true,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-402',
    payoutType: 'CPL',
    advertiserPayout: 5040,
    payoutAmount: 3570, // 42.50 USD * 84.0 = ₹3,570
    referralPayout: 0,
    currency: 'INR',
    exchangeRateToInr: 1.0,
    payableEventId: 'cluster_deployed',
    conversionCondition: 'Verified Corporate Domain + Cluster Deployed',
    dailyCap: 450,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 92410,
    conversions: 4120,
    revenue: 20764800, // ₹2,07,64,800
    payoutTotal: 14708400, // ₹1,47,08,400
    createdAt: '2026-09-12',
  },
  {
    id: 'CMP-8501',
    offerId: 'OFR-8501',
    name: 'Aether Shield Endpoint Security',
    brand: 'Aether Cyber',
    category: 'Cybersecurity',
    description: 'Zero-trust endpoint security agent lead acquisition across APAC & EMEA.',
    status: 'active',
    startDate: '2026-09-20',
    endDate: '2026-11-30',
    totalCap: 3000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'CRM',
    trackingUrl: 'https://trk.crosx.internal/v2/crm/webhook?offer_id=OFR-8501&c={c}&x={x}&event={event}&payout={payout}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 30,
    attributionModel: 'linear',
    conversionEvents: [
      {
        id: 'evt_aether_demo',
        name: 'Qualified Security Demo',
        identifier: 'demo_qualified',
        description: '50+ endpoint seat qualification confirmed in CRM',
        active: true,
        payoutMappingInr: 7140,
        isProtectedHistorical: true,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-401',
    payoutType: 'CPA',
    advertiserPayout: 110.0,
    payoutAmount: 85.0, // Foreign-denominated USD contract converted at 84.0 -> ₹7,140
    referralPayout: 5.0,
    currency: 'USD',
    exchangeRateToInr: 84.0,
    payableEventId: 'demo_qualified',
    conversionCondition: 'Demo Booked + 50+ Seat Qualification',
    dailyCap: 300,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 64180,
    conversions: 2190,
    revenue: 240900, // 240,900 USD -> ₹2,02,35,600
    payoutTotal: 186150, // 186,150 USD -> ₹1,56,36,600
    createdAt: '2026-09-20',
  },
  {
    id: 'CMP-8508',
    offerId: 'OFR-8508',
    name: 'Kinetix Direct Auto Insurance Quote',
    brand: 'Kinetix Mutual',
    category: 'Insurance',
    description: 'Real-time carrier bind & quote comparison funnel for motor policy holders.',
    status: 'active',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    totalCap: 15000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'GET',
    trackingUrl: 'https://trk.crosx.internal/v2/redirect?offer_id=OFR-8508&c={c}&x={x}&timestamp={timestamp}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 7,
    attributionModel: 'last_touch',
    conversionEvents: [
      {
        id: 'evt_kinetix_quote',
        name: 'Quote Bind Completed',
        identifier: 'quote_completed',
        description: 'Driver profile and Vahan registration verified',
        active: true,
        payoutMappingInr: 1596,
        isProtectedHistorical: true,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-403',
    payoutType: 'CPL',
    advertiserPayout: 2184,
    payoutAmount: 1596, // 19 USD * 84 = ₹1,596
    referralPayout: 100,
    currency: 'INR',
    exchangeRateToInr: 1.0,
    payableEventId: 'quote_completed',
    conversionCondition: 'Completed Driver Profile + Registration Match',
    dailyCap: 1500,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 214500,
    conversions: 11840,
    revenue: 25858560, // ₹2,58,58,560
    payoutTotal: 18896640, // ₹1,88,96,640
    createdAt: '2026-10-01',
  },
  {
    id: 'CMP-8512',
    offerId: 'OFR-8512',
    name: 'NordicPay Cross-Border FX Treasury',
    brand: 'NordicPay AB',
    category: 'Banking',
    description: 'B2B multi-currency treasury account onboarding.',
    status: 'paused',
    startDate: '2026-08-15',
    endDate: '2026-11-15',
    totalCap: 1500,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'S2S',
    trackingUrl: 'https://trk.crosx.internal/v2/s2s/click?offer_id=OFR-8512&c={c}&x={x}&event={event}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 30,
    attributionModel: 'time_decay',
    conversionEvents: [
      {
        id: 'evt_nordic_kyb',
        name: 'KYB & FX Transfer',
        identifier: 'kyb_verified',
        description: 'Corporate KYB verified and initial FX settlement completed',
        active: true,
        payoutMappingInr: 10065,
        isProtectedHistorical: true,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-402',
    payoutType: 'CPA',
    advertiserPayout: 150.0,
    payoutAmount: 110.0, // Foreign-denominated EUR contract converted at 91.5 -> ₹10,065
    referralPayout: 0,
    currency: 'EUR',
    exchangeRateToInr: 91.5,
    payableEventId: 'kyb_verified',
    conversionCondition: 'KYB Verified + Initial FX Transfer',
    dailyCap: 150,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 38290,
    conversions: 940,
    revenue: 141000, // 141,000 EUR * 91.5 = ₹1,29,01,500
    payoutTotal: 103400, // 103,400 EUR * 91.5 = ₹94,61,100
    createdAt: '2026-08-15',
  },
  {
    id: 'CMP-8519',
    offerId: 'OFR-8519',
    name: 'Stratos Commerce POS Hardware Upgrade',
    brand: 'Stratos Retail',
    category: 'E-commerce',
    description: 'Merchant terminal switch program with zero upfront lease.',
    status: 'active',
    startDate: '2026-10-05',
    endDate: '2026-12-31',
    totalCap: 6000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'Offer Code',
    trackingUrl: 'https://trk.crosx.internal/v2/redeem?offer_id=OFR-8519&code={x}&c={c}&event={event}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 21,
    attributionModel: 'last_touch',
    conversionEvents: [
      {
        id: 'evt_stratos_mid',
        name: 'Merchant MID Approved',
        identifier: 'mid_approved',
        description: 'POS terminal shipped and merchant MID underwriting approved',
        active: true,
        payoutMappingInr: 2940,
        isProtectedHistorical: true,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-404',
    payoutType: 'Revenue Share',
    advertiserPayout: 4620,
    payoutAmount: 2940, // ₹2,940
    referralPayout: 210,
    currency: 'INR',
    exchangeRateToInr: 1.0,
    payableEventId: 'mid_approved',
    conversionCondition: 'Merchant MID Approved',
    dailyCap: 600,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 79300,
    conversions: 3180,
    revenue: 14691600, // ₹1,46,91,600
    payoutTotal: 9349200, // ₹93,49,200
    createdAt: '2026-10-05',
  },
  {
    id: 'CMP-8524',
    offerId: 'OFR-8524',
    name: 'Helios Solar Residential Estimator',
    brand: 'Helios Energy',
    category: 'CleanTech',
    description: 'Homeowner roof irradiance & subsidy qualification funnel.',
    status: 'draft',
    startDate: '2026-10-22',
    endDate: '2027-01-31',
    totalCap: 4000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'Browser Pixel',
    trackingUrl: 'https://trk.crosx.internal/v2/pixel.gif?offer_id=OFR-8524&c={c}&event={event}&timestamp={timestamp}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: false,
    attributionWindowDays: 14,
    attributionModel: 'last_touch',
    conversionEvents: [
      {
        id: 'evt_helios_lead',
        name: 'Homeowner Phone Verified',
        identifier: 'phone_verified',
        description: 'OTP verified homeowner with eligible rooftop area',
        active: true,
        payoutMappingInr: 2352,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-403',
    payoutType: 'CPL',
    advertiserPayout: 3400,
    payoutAmount: 2352, // ₹2,352
    referralPayout: 0,
    currency: 'INR',
    exchangeRateToInr: 1.0,
    payableEventId: 'phone_verified',
    conversionCondition: 'Phone Verified Homeowner',
    dailyCap: 400,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 0,
    conversions: 0,
    revenue: 0,
    payoutTotal: 0,
    createdAt: '2026-10-16',
  },
  {
    id: 'CMP-8530',
    offerId: 'OFR-8530',
    name: 'PulseHR Global Payroll Switch',
    brand: 'PulseHR',
    category: 'B2B SaaS',
    description: 'EOR and international contractor compliance platform signup.',
    status: 'completed',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    totalCap: 5000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'S2S',
    trackingUrl: 'https://trk.crosx.internal/v2/s2s/click?offer_id=OFR-8530&c={c}&x={x}&event={event}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 30,
    attributionModel: 'first_touch',
    conversionEvents: [
      {
        id: 'evt_pulse_payroll',
        name: 'First Payroll Scheduled',
        identifier: 'payroll_scheduled',
        description: 'Organization onboarded and initial payroll batch funded',
        active: true,
        payoutMappingInr: 4620,
        isProtectedHistorical: true,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-401',
    payoutType: 'CPA',
    advertiserPayout: 6300,
    payoutAmount: 4620, // ₹4,620
    referralPayout: 0,
    currency: 'INR',
    exchangeRateToInr: 1.0,
    payableEventId: 'payroll_scheduled',
    conversionCondition: 'First Payroll Run Scheduled',
    dailyCap: 500,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 112400,
    conversions: 4680,
    revenue: 29484000, // ₹2,94,84,000
    payoutTotal: 21621600, // ₹2,16,21,600
    createdAt: '2026-07-01',
  },
];

/**
 * Daily time-series metrics converted to INR using the reference exchange rate (1 USD = 84 INR).
 */
export const PERFORMANCE_TIME_SERIES = [
  { date: 'Oct 05', revenue: 9945600, payout: 7072800, clicks: 46200, conversions: 1980 },
  { date: 'Oct 06', revenue: 10491600, payout: 7400400, clicks: 48900, conversions: 2110 },
  { date: 'Oct 07', revenue: 10012800, payout: 7173600, clicks: 47100, conversions: 2040 },
  { date: 'Oct 08', revenue: 11491200, payout: 8080800, clicks: 52400, conversions: 2390 },
  { date: 'Oct 09', revenue: 11936400, payout: 8383200, clicks: 54800, conversions: 2480 },
  { date: 'Oct 10', revenue: 11046000, payout: 7803600, clicks: 50300, conversions: 2210 },
  { date: 'Oct 11', revenue: 10810800, payout: 7593600, clicks: 49600, conversions: 2150 },
  { date: 'Oct 12', revenue: 12541200, payout: 8752800, clicks: 57100, conversions: 2620 },
  { date: 'Oct 13', revenue: 13305600, payout: 9315600, clicks: 60400, conversions: 2790 },
  { date: 'Oct 14', revenue: 12952800, payout: 9080400, clicks: 58900, conversions: 2710 },
  { date: 'Oct 15', revenue: 14019600, payout: 9777600, clicks: 63200, conversions: 2940 },
  { date: 'Oct 16', revenue: 14481600, payout: 10063200, clicks: 65800, conversions: 3080 },
  { date: 'Oct 17', revenue: 14204400, payout: 9903600, clicks: 64100, conversions: 2990 },
  { date: 'Oct 18', revenue: 15225000, payout: 10533600, clicks: 68900, conversions: 3240 },
];

export const INITIAL_SUBMISSIONS: SubmissionRecord[] = [
  {
    id: 'SUB-99201',
    campaignId: 'CMP-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    source: 'pub_aff_northstar',
    subId: 'ns_in_search_88',
    leadEmail: 'm.lindqvist@enterprise-ops.io',
    country: 'India',
    device: 'Desktop',
    status: 'verified',
    payloadSummary: 'income_tier=₹18L+, kyc_score=98, credit_band=A+',
    timestamp: '2026-10-18T08:14:22Z',
  },
  {
    id: 'SUB-99202',
    campaignId: 'CMP-8495',
    campaignName: 'LinearCloud Enterprise DevOps Trial',
    source: 'pub_dev_syndicate',
    subId: 'ds_gh_sponsor_12',
    leadEmail: 'd.korolev@stackmesh.dev',
    country: 'Germany',
    device: 'Desktop',
    status: 'verified',
    payloadSummary: 'company_size=250-500, cluster_nodes=16, cloud=aws',
    timestamp: '2026-10-18T07:58:10Z',
  },
  {
    id: 'SUB-99203',
    campaignId: 'CMP-8508',
    campaignName: 'Kinetix Direct Auto Insurance Quote',
    source: 'pub_native_scale',
    subId: 'ns_mob_feed_04',
    leadEmail: 'r.sharma88@gmail.com',
    country: 'India',
    device: 'Mobile',
    status: 'pending',
    payloadSummary: 'pin=560001, vehicles=2, insured_status=current',
    timestamp: '2026-10-18T07:41:05Z',
  },
  {
    id: 'SUB-99204',
    campaignId: 'CMP-8501',
    campaignName: 'Aether Shield Endpoint Security',
    source: 'pub_b2b_intent',
    subId: 'bi_uk_whitepaper',
    leadEmail: 's.patel@finsecure-uk.co.uk',
    country: 'United Kingdom',
    device: 'Desktop',
    status: 'verified',
    payloadSummary: 'endpoints=420, compliance=iso27001, timeline=q4',
    timestamp: '2026-10-17T22:19:44Z',
  },
  {
    id: 'SUB-99205',
    campaignId: 'CMP-8508',
    campaignName: 'Kinetix Direct Auto Insurance Quote',
    source: 'pub_social_pulse',
    subId: 'sp_ig_reel_19',
    leadEmail: 'anon_proxy_772@tempmail.org',
    country: 'India',
    device: 'Mobile',
    status: 'rejected',
    payloadSummary: 'fraud_check=disposable_domain, reg_match=false',
    timestamp: '2026-10-17T19:03:11Z',
  },
  {
    id: 'SUB-99206',
    campaignId: 'CMP-8519',
    campaignName: 'Stratos Commerce POS Hardware Upgrade',
    source: 'pub_aff_northstar',
    subId: 'ns_retail_comp_02',
    leadEmail: 'ops@artisanroasters.in',
    country: 'India',
    device: 'Tablet',
    status: 'verified',
    payloadSummary: 'locations=4, monthly_gmv=₹15.5L, terminal_qty=8',
    timestamp: '2026-10-16T15:32:00Z',
  },
  {
    id: 'SUB-99207',
    campaignId: 'CMP-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    source: 'pub_b2b_intent',
    subId: 'bi_in_fintech_top',
    leadEmail: 'j.whitmore@apexadvisors.com',
    country: 'India',
    device: 'Desktop',
    status: 'verified',
    payloadSummary: 'income_tier=₹25L+, kyc_score=99, credit_band=A+',
    timestamp: '2026-10-14T11:20:18Z',
  },
  {
    id: 'SUB-99208',
    campaignId: 'CMP-8512',
    campaignName: 'NordicPay Cross-Border FX Treasury',
    source: 'pub_dev_syndicate',
    subId: 'ds_eu_cfo_digest',
    leadEmail: 'treasury@nordicfreight.se',
    country: 'Sweden',
    device: 'Desktop',
    status: 'pending',
    payloadSummary: 'annual_fx_vol=₹35Cr, currencies=INR_EUR_USD',
    timestamp: '2026-10-09T14:48:30Z',
  },
];

export const INITIAL_CLICKS: ClickRecord[] = [
  {
    id: 'CLK-701',
    clickId: 'cx_clk_9948210a',
    campaignId: 'CMP-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    source: 'pub_aff_northstar',
    ipAddress: '49.36.128.142',
    country: 'India',
    device: 'Desktop',
    os: 'macOS 15.1',
    status: 'unique',
    latencyMs: 14,
    timestamp: '2026-10-18T08:14:01Z',
  },
  {
    id: 'CLK-702',
    clickId: 'cx_clk_9948211b',
    campaignId: 'CMP-8495',
    campaignName: 'LinearCloud Enterprise DevOps Trial',
    source: 'pub_dev_syndicate',
    ipAddress: '185.199.108.153',
    country: 'Germany',
    device: 'Desktop',
    os: 'Ubuntu Linux',
    status: 'unique',
    latencyMs: 19,
    timestamp: '2026-10-18T07:57:40Z',
  },
  {
    id: 'CLK-703',
    clickId: 'cx_clk_9948212c',
    campaignId: 'CMP-8508',
    campaignName: 'Kinetix Direct Auto Insurance Quote',
    source: 'pub_native_scale',
    ipAddress: '106.51.74.89',
    country: 'India',
    device: 'Mobile',
    os: 'iOS 18.2',
    status: 'unique',
    latencyMs: 22,
    timestamp: '2026-10-18T07:40:12Z',
  },
  {
    id: 'CLK-704',
    clickId: 'cx_clk_9948213d',
    campaignId: 'CMP-8508',
    campaignName: 'Kinetix Direct Auto Insurance Quote',
    source: 'pub_native_scale',
    ipAddress: '106.51.74.89',
    country: 'India',
    device: 'Mobile',
    os: 'iOS 18.2',
    status: 'duplicate',
    latencyMs: 9,
    timestamp: '2026-10-18T07:40:14Z',
  },
  {
    id: 'CLK-705',
    clickId: 'cx_clk_9948214e',
    campaignId: 'CMP-8501',
    campaignName: 'Aether Shield Endpoint Security',
    source: 'pub_b2b_intent',
    ipAddress: '51.140.88.12',
    country: 'United Kingdom',
    device: 'Desktop',
    os: 'Windows 11',
    status: 'unique',
    latencyMs: 17,
    timestamp: '2026-10-17T22:18:55Z',
  },
  {
    id: 'CLK-706',
    clickId: 'cx_clk_9948215f',
    campaignId: 'CMP-8508',
    campaignName: 'Kinetix Direct Auto Insurance Quote',
    source: 'pub_social_pulse',
    ipAddress: '198.51.100.204',
    country: 'India',
    device: 'Mobile',
    os: 'Android 15',
    status: 'filtered',
    latencyMs: 11,
    timestamp: '2026-10-17T19:02:58Z',
  },
  {
    id: 'CLK-707',
    clickId: 'cx_clk_9948216g',
    campaignId: 'CMP-8519',
    campaignName: 'Stratos Commerce POS Hardware Upgrade',
    source: 'pub_aff_northstar',
    ipAddress: '122.161.48.45',
    country: 'India',
    device: 'Tablet',
    os: 'iPadOS 18',
    status: 'unique',
    latencyMs: 16,
    timestamp: '2026-10-15T16:10:09Z',
  },
  {
    id: 'CLK-708',
    clickId: 'cx_clk_9948217h',
    campaignId: 'CMP-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    source: 'pub_b2b_intent',
    ipAddress: '157.32.98.91',
    country: 'India',
    device: 'Desktop',
    os: 'macOS 15.1',
    status: 'unique',
    latencyMs: 15,
    timestamp: '2026-10-12T10:05:44Z',
  },
];

export const INITIAL_CONVERSIONS: ConversionRecord[] = [
  {
    id: 'CNV-501',
    conversionId: 'conv_8821901',
    clickId: 'cx_clk_9948210a',
    campaignId: 'CMP-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    source: 'pub_aff_northstar',
    eventType: 'KYC_Approved',
    payout: 5712,
    revenue: 7728,
    sourceCurrency: 'INR',
    exchangeRateToInr: 1.0,
    status: 'approved',
    postbackFired: true,
    timestamp: '2026-10-18T08:15:04Z',
  },
  {
    id: 'CNV-502',
    conversionId: 'conv_8821902',
    clickId: 'cx_clk_9948211b',
    campaignId: 'CMP-8495',
    campaignName: 'LinearCloud Enterprise DevOps Trial',
    source: 'pub_dev_syndicate',
    eventType: 'Trial_Activated',
    payout: 3570,
    revenue: 5040,
    sourceCurrency: 'INR',
    exchangeRateToInr: 1.0,
    status: 'approved',
    postbackFired: true,
    timestamp: '2026-10-18T07:59:19Z',
  },
  {
    id: 'CNV-503',
    conversionId: 'conv_8821903',
    clickId: 'cx_clk_9948212c',
    campaignId: 'CMP-8508',
    campaignName: 'Kinetix Direct Auto Insurance Quote',
    source: 'pub_native_scale',
    eventType: 'Lead_Qualified',
    payout: 1596,
    revenue: 2184,
    sourceCurrency: 'INR',
    exchangeRateToInr: 1.0,
    status: 'pending',
    postbackFired: false,
    timestamp: '2026-10-18T07:41:30Z',
  },
  {
    id: 'CNV-504',
    conversionId: 'conv_8821904',
    clickId: 'cx_clk_9948214e',
    campaignId: 'CMP-8501',
    campaignName: 'Aether Shield Endpoint Security',
    source: 'pub_b2b_intent',
    eventType: 'Lead_Qualified',
    payout: 85.0, // USD contract converted at 84.0 -> ₹7,140
    revenue: 110.0, // USD contract converted at 84.0 -> ₹9,240
    sourceCurrency: 'USD',
    exchangeRateToInr: 84.0,
    status: 'approved',
    postbackFired: true,
    timestamp: '2026-10-17T22:21:00Z',
  },
  {
    id: 'CNV-505',
    conversionId: 'conv_8821905',
    clickId: 'cx_clk_9948216g',
    campaignId: 'CMP-8519',
    campaignName: 'Stratos Commerce POS Hardware Upgrade',
    source: 'pub_aff_northstar',
    eventType: 'Purchase',
    payout: 2940,
    revenue: 4620,
    sourceCurrency: 'INR',
    exchangeRateToInr: 1.0,
    status: 'approved',
    postbackFired: true,
    timestamp: '2026-10-15T16:14:22Z',
  },
  {
    id: 'CNV-506',
    conversionId: 'conv_8821906',
    clickId: 'cx_clk_9948109z',
    campaignId: 'CMP-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    source: 'pub_social_pulse',
    eventType: 'KYC_Approved',
    payout: 0.0,
    revenue: 0.0,
    sourceCurrency: 'INR',
    exchangeRateToInr: 1.0,
    status: 'chargeback',
    postbackFired: true,
    timestamp: '2026-10-13T18:40:12Z',
  },
  {
    id: 'CNV-507',
    conversionId: 'conv_8821907',
    clickId: 'cx_clk_9948217h',
    campaignId: 'CMP-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    source: 'pub_b2b_intent',
    eventType: 'First_Deposit',
    payout: 5712,
    revenue: 7728,
    sourceCurrency: 'INR',
    exchangeRateToInr: 1.0,
    status: 'approved',
    postbackFired: true,
    timestamp: '2026-10-12T10:08:15Z',
  },
];

export const INITIAL_POSTBACK_CONFIG: GlobalPostbackConfig = {
  enabled: true,
  url: 'https://relay.crosx-partners.io/v2/s2s/postback?click_id={click_id}&campaign_id={campaign_id}&payout={payout}&currency={currency}&event={status}&sub_id={sub_id}',
  method: 'POST',
  timeoutMs: 3500,
  retryAttempts: 3,
  parameters: [
    { key: 'click_id', macro: '{click_id}', enabled: true },
    { key: 'campaign_id', macro: '{campaign_id}', enabled: true },
    { key: 'payout', macro: '{payout}', enabled: true },
    { key: 'currency', macro: '{currency}', enabled: true },
    { key: 'status', macro: '{status}', enabled: true },
    { key: 'sub_id', macro: '{sub_id}', enabled: true },
    { key: 'tx_id', macro: '{conversion_id}', enabled: true },
  ],
  eventMapping: {
    onClick: false,
    onSubmission: true,
    onConversionApproved: true,
    onConversionRejected: true,
  },
  lastVerifiedAt: '2026-10-18T06:45:00Z',
};

export const INITIAL_IP_WHITELIST: IpWhitelistRecord[] = [
  {
    id: 'IP-101',
    ipAddress: '34.102.136.180/32',
    description: 'Vanguard Financial Primary S2S Callback Gateway (Mumbai-AP-South)',
    environment: 'Production',
    status: 'active',
    addedDate: '2026-09-01',
  },
  {
    id: 'IP-102',
    ipAddress: '185.220.101.0/24',
    description: 'LinearCloud Attribution Webhook Cluster (EU-Central)',
    environment: 'Production',
    status: 'active',
    addedDate: '2026-09-12',
  },
  {
    id: 'IP-103',
    ipAddress: '52.89.214.238',
    description: 'Kinetix Mutual Carrier Bind Verification Node',
    environment: 'Partner Relay',
    status: 'active',
    addedDate: '2026-10-01',
  },
  {
    id: 'IP-104',
    ipAddress: '10.128.0.0/16',
    description: 'CrosX Internal Sandbox & QA Load Generator',
    environment: 'Staging',
    status: 'disabled',
    addedDate: '2026-08-20',
  },
];

export const INITIAL_TEMPLATES: TemplateRecord[] = [
  {
    id: 'TPL-401',
    name: 'Fintech KYC & Credit Intake v3',
    type: 'Lead Capture',
    status: 'active',
    usageCount: 14,
    updatedAt: '2026-10-16',
    fields: [
      { id: 'f1', key: 'full_name', label: 'Legal Full Name', type: 'text', required: true, placeholder: 'Aarav Mehta' },
      { id: 'f2', key: 'work_email', label: 'Primary Email Address', type: 'email', required: true, placeholder: 'aarav@company.in' },
      { id: 'f3', key: 'annual_income', label: 'Annual Household Income (INR)', type: 'number', required: true, placeholder: '1800000' },
      { id: 'f4', key: 'employment_status', label: 'Employment Classification', type: 'select', required: true, placeholder: 'Full-Time Salaried' },
      { id: 'f5', key: 'kyc_consent', label: 'CIBIL / KYC Soft-Pull Authorization', type: 'checkbox', required: true, placeholder: 'I authorize verification' },
    ],
  },
  {
    id: 'TPL-402',
    name: 'B2B Enterprise Trial Provisioning',
    type: 'Lead Capture',
    status: 'active',
    usageCount: 9,
    updatedAt: '2026-10-14',
    fields: [
      { id: 'f1', key: 'work_email', label: 'Corporate Email', type: 'email', required: true, placeholder: 'devops@acme.in' },
      { id: 'f2', key: 'organization', label: 'Organization Name', type: 'text', required: true, placeholder: 'Acme Cloud Pvt Ltd' },
      { id: 'f3', key: 'seat_count', label: 'Estimated Engineering Seats', type: 'number', required: true, placeholder: '50' },
      { id: 'f4', key: 'phone_number', label: 'Direct Phone', type: 'phone', required: false, placeholder: '+91 98201 23456' },
    ],
  },
  {
    id: 'TPL-403',
    name: 'Insurtech Instant Bind Quote Schema',
    type: 'Postback Schema',
    status: 'active',
    usageCount: 6,
    updatedAt: '2026-10-11',
    fields: [
      { id: 'f1', key: 'driver_pin', label: 'RTO PIN Code', type: 'text', required: true, placeholder: '560001' },
      { id: 'f2', key: 'vehicle_reg', label: 'Vehicle Registration Number', type: 'text', required: true, placeholder: 'KA01AB1234' },
      { id: 'f3', key: 'policy_tier', label: 'Coverage Tier', type: 'select', required: true, placeholder: 'Comprehensive Zero-Dep' },
    ],
  },
  {
    id: 'TPL-404',
    name: 'Merchant POS Terminal Qualification',
    type: 'Offer Wall',
    status: 'draft',
    usageCount: 2,
    updatedAt: '2026-10-08',
    fields: [
      { id: 'f1', key: 'dba_name', label: 'Merchant Trade Name', type: 'text', required: true, placeholder: 'Blue Tokai Retail' },
      { id: 'f2', key: 'monthly_volume', label: 'Monthly UPI & Card Volume (₹)', type: 'number', required: true, placeholder: '1250000' },
      { id: 'f3', key: 'contact_email', label: 'Owner Email', type: 'email', required: true, placeholder: 'owner@merchant.in' },
    ],
  },
];

export const INITIAL_API_KEYS: ApiKeyRecord[] = [
  {
    id: 'KEY-901',
    name: 'CrosX Production Attribution Ingest',
    prefix: 'cx_live_98a4',
    maskedKey: 'cx_live_98a4••••••••••••••••••••7f21',
    environment: 'live',
    scopes: ['campaigns:read', 'clicks:write', 'conversions:write', 'postbacks:trigger'],
    status: 'active',
    createdAt: '2026-08-04',
    lastUsed: '2 minutes ago',
  },
  {
    id: 'KEY-902',
    name: 'Snowflake BI Warehouse Exporter',
    prefix: 'cx_live_41c9',
    maskedKey: 'cx_live_41c9••••••••••••••••••••3b08',
    environment: 'live',
    scopes: ['campaigns:read', 'reports:read'],
    status: 'active',
    createdAt: '2026-09-10',
    lastUsed: '18 minutes ago',
  },
  {
    id: 'KEY-903',
    name: 'Partner S2S Sandbox Testing Key',
    prefix: 'cx_test_77d2',
    maskedKey: 'cx_test_77d2••••••••••••••••••••9e14',
    environment: 'sandbox',
    scopes: ['clicks:write', 'conversions:write'],
    status: 'active',
    createdAt: '2026-10-02',
    lastUsed: '3 hours ago',
  },
  {
    id: 'KEY-904',
    name: 'Legacy HasOffers Migration Worker',
    prefix: 'cx_live_10f5',
    maskedKey: 'cx_live_10f5••••••••••••••••••••0a99',
    environment: 'live',
    scopes: ['campaigns:read', 'campaigns:write'],
    status: 'revoked',
    createdAt: '2026-06-15',
    lastUsed: '2026-08-30',
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: 'ACT-01',
    actor: 'Elena Vance (VP Operations)',
    action: 'Updated CPA payout cap from 600 to 800/day (₹5,712 CPA)',
    target: 'CMP-8492 · Vanguard NeoBank Premier Card',
    category: 'campaign',
    timestamp: '12 mins ago',
  },
  {
    id: 'ACT-02',
    actor: 'System Postback Engine',
    action: 'Verified S2S endpoint (HTTP 200 OK · 18ms)',
    target: 'relay.crosx-partners.io/v2/s2s/postback',
    category: 'postback',
    timestamp: '44 mins ago',
  },
  {
    id: 'ACT-03',
    actor: 'Marcus Chen (AdOps Lead)',
    action: 'Whitelisted CIDR block 34.102.136.180/32',
    target: 'Production Callback Gateway',
    category: 'security',
    timestamp: '2 hours ago',
  },
  {
    id: 'ACT-04',
    actor: 'Elena Vance (VP Operations)',
    action: 'Published template schema revision v3 (INR standardized)',
    target: 'TPL-401 · Fintech KYC & Credit Intake v3',
    category: 'template',
    timestamp: '5 hours ago',
  },
  {
    id: 'ACT-05',
    actor: 'Automated Fraud Guard',
    action: 'Filtered disposable domain submission',
    target: 'SUB-99205 · Kinetix Direct Auto Insurance',
    category: 'security',
    timestamp: 'Yesterday at 19:03 UTC',
  },
];

export const INITIAL_REFERRALS: ReferralRecord[] = [
  {
    id: 'REF-9401',
    campaignId: 'CMP-8492',
    offerId: 'OFR-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    referrerName: 'Vikramaditya Rao',
    referrerId: 'PRT-204',
    referrerEmail: 'v.rao@finpartners.in',
    referredUserName: 'Ananya Deshmukh',
    referredUserEmail: 'ananya.d@enterprise-in.com',
    referredUpiHash: 'upi_sha256_99a1b2c3d4',
    sameUpiFlagged: false,
    linkedEventIdentifier: 'kyc_approved',
    attributionModel: 'first_referrer',
    conversionCompleted: true,
    payoutAmount: 420,
    currency: 'INR',
    exchangeRateToInr: 1,
    status: 'approved',
    notes: 'Video KYC approved; initial card activation settled in INR.',
    createdAt: '2026-10-19T09:14:00Z',
  },
  {
    id: 'REF-9402',
    campaignId: 'CMP-8495',
    offerId: 'OFR-8495',
    campaignName: 'LinearCloud Enterprise DevOps Trial',
    referrerName: 'Rohan Kulkarni',
    referrerId: 'PRT-209',
    referrerEmail: 'rohan@cloudguild.io',
    referredUserName: 'Siddharth Menon',
    referredUserEmail: 's.menon@stackmesh.in',
    referredUpiHash: 'upi_sha256_88d4e5f6a1',
    sameUpiFlagged: false,
    linkedEventIdentifier: 'cluster_deployed',
    attributionModel: 'first_referrer',
    conversionCompleted: true,
    payoutAmount: 252,
    currency: 'INR',
    exchangeRateToInr: 1,
    status: 'approved',
    notes: 'Production Kubernetes cluster deployed; first-referrer credit.',
    createdAt: '2026-10-18T16:40:00Z',
  },
  {
    id: 'REF-9403',
    campaignId: 'CMP-8519',
    offerId: 'OFR-8519',
    campaignName: 'Stratos Commerce POS Hardware Upgrade',
    referrerName: 'Meera Krishnan',
    referrerId: 'PRT-211',
    referrerEmail: 'meera@merchantgrowth.in',
    referredUserName: 'Arjun Nair',
    referredUserEmail: 'arjun@malabarroasters.in',
    referredUpiHash: 'upi_sha256_77c9b0e1f2',
    sameUpiFlagged: false,
    linkedEventIdentifier: 'mid_approved',
    attributionModel: 'last_referrer',
    conversionCompleted: true,
    payoutAmount: 210,
    currency: 'INR',
    exchangeRateToInr: 1,
    status: 'pending',
    notes: 'Merchant MID approved; awaiting 48h terminal activation window.',
    createdAt: '2026-10-19T07:55:00Z',
  },
  {
    id: 'REF-9404',
    campaignId: 'CMP-8501',
    offerId: 'OFR-8501',
    campaignName: 'Aether Shield Endpoint Security',
    referrerName: 'Devika Chatterjee',
    referrerId: 'PRT-218',
    referrerEmail: 'devika@secops-advisors.in',
    referredUserName: 'Nikhil Verma',
    referredUserEmail: 'n.verma@finsecure.in',
    referredUpiHash: 'upi_sha256_55e2a8c4b9',
    sameUpiFlagged: false,
    linkedEventIdentifier: 'secops_demo_completed',
    attributionModel: 'first_referrer',
    conversionCompleted: true,
    payoutAmount: 672,
    currency: 'INR',
    exchangeRateToInr: 1,
    status: 'approved',
    notes: 'Enterprise CISO demo completed with 420 endpoints scoped.',
    createdAt: '2026-10-17T14:12:00Z',
  },
  {
    id: 'REF-9405',
    campaignId: 'CMP-8508',
    offerId: 'OFR-8508',
    campaignName: 'Kinetix Direct Auto Insurance Quote',
    referrerName: 'Karan Malhotra',
    referrerId: 'PRT-215',
    referrerEmail: 'karan@autoleads.in',
    referredUserName: 'Karan M. Secondary',
    referredUserEmail: 'karan.alt77@tempmail.org',
    referredUpiHash: 'upi_sha256_dup_4419a',
    sameUpiFlagged: true,
    linkedEventIdentifier: 'policy_bound',
    attributionModel: 'last_referrer',
    conversionCompleted: false,
    payoutAmount: 126,
    currency: 'INR',
    exchangeRateToInr: 1,
    status: 'rejected',
    notes: 'Rejected automatically: Same UPI VPA hash detected across referrer and referred user.',
    createdAt: '2026-10-17T11:30:00Z',
  },
  {
    id: 'REF-9406',
    campaignId: 'CMP-8492',
    offerId: 'OFR-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    referrerName: 'Vikramaditya Rao',
    referrerId: 'PRT-204',
    referrerEmail: 'v.rao@finpartners.in',
    referredUserName: 'Priya Subramanian',
    referredUserEmail: 'priya.s@techcorp.in',
    referredUpiHash: 'upi_sha256_31f8d2a9c0',
    sameUpiFlagged: false,
    linkedEventIdentifier: 'kyc_approved',
    attributionModel: 'first_referrer',
    conversionCompleted: true,
    payoutAmount: 420,
    currency: 'INR',
    exchangeRateToInr: 1,
    status: 'pending',
    notes: 'Video KYC completed; queued for daily batch payout release.',
    createdAt: '2026-10-19T11:05:00Z',
  },
];

export const INITIAL_TRACKERS: TrackerRecord[] = [
  {
    id: 'TRK-701',
    name: 'NorthStar S2S Primary Router',
    campaignId: 'CMP-8492',
    offerId: 'OFR-8492',
    campaignName: 'Vanguard NeoBank Premier Card',
    trackingMethod: 'S2S',
    partnerSource: 'pub_aff_northstar',
    primarySubIdParam: 'x',
    secondarySubIds: ['x1', 'x2', 'x3'],
    trackingUrl: 'https://trk.crosx.internal/v2/s2s/click?offer_id=OFR-8492&c={c}&x={x}&x1={x1}&event={event}',
    postbackCallbackUrl: 'https://relay.northstar-media.in/postback?click_id={c}&sub={x}&payout={payout}&event={event}',
    status: 'active',
    clicks: 84210,
    conversions: 3420,
    referralConversions: 412,
    avgLatencyMs: 14,
    trackedPayoutInr: 19535040,
    lastPingAt: '2 mins ago',
    createdAt: '2026-10-01',
  },
  {
    id: 'TRK-702',
    name: 'DevSyndicate GitHub Sponsor Redirect',
    campaignId: 'CMP-8495',
    offerId: 'OFR-8495',
    campaignName: 'LinearCloud Enterprise DevOps Trial',
    trackingMethod: 'GET',
    partnerSource: 'pub_dev_syndicate',
    primarySubIdParam: 'x',
    secondarySubIds: ['x1', 'x2'],
    trackingUrl: 'https://trk.crosx.internal/v2/redirect?offer_id=OFR-8495&c={c}&x={x}&timestamp={timestamp}',
    postbackCallbackUrl: 'https://hooks.devsyndicate.io/crosx/cb?c={c}&offer={offer_id}&event={event}',
    status: 'active',
    clicks: 62800,
    conversions: 2890,
    referralConversions: 284,
    avgLatencyMs: 18,
    trackedPayoutInr: 10924200,
    lastPingAt: '6 mins ago',
    createdAt: '2026-10-02',
  },
  {
    id: 'TRK-703',
    name: 'B2B Intent CRM Webhook Bridge',
    campaignId: 'CMP-8501',
    offerId: 'OFR-8501',
    campaignName: 'Aether Shield Endpoint Security',
    trackingMethod: 'CRM',
    partnerSource: 'pub_b2b_intent',
    primarySubIdParam: 'x',
    secondarySubIds: ['x1', 'x4'],
    trackingUrl: 'https://trk.crosx.internal/v2/crm/webhook?offer_id=OFR-8501&c={c}&x={x}&event={event}&payout={payout}',
    postbackCallbackUrl: 'https://crm.b2bintent.co.in/webhooks/crosx?lead={c}&payout_inr={payout}',
    status: 'active',
    clicks: 41950,
    conversions: 1210,
    referralConversions: 165,
    avgLatencyMs: 21,
    trackedPayoutInr: 11698280,
    lastPingAt: '14 mins ago',
    createdAt: '2026-09-25',
  },
  {
    id: 'TRK-704',
    name: 'Stratos Retail Promo Code Tracker',
    campaignId: 'CMP-8519',
    offerId: 'OFR-8519',
    campaignName: 'Stratos Commerce POS Hardware Upgrade',
    trackingMethod: 'Offer Code',
    partnerSource: 'pub_merchant_guild',
    primarySubIdParam: 'x',
    secondarySubIds: ['x1'],
    trackingUrl: 'https://trk.crosx.internal/v2/redeem?offer_id=OFR-8519&code={x}&c={c}&event={event}',
    postbackCallbackUrl: 'https://api.merchantguild.in/v1/conversions?code={x}&c={c}&payout={payout}',
    status: 'active',
    clicks: 51400,
    conversions: 2140,
    referralConversions: 310,
    avgLatencyMs: 16,
    trackedPayoutInr: 6291600,
    lastPingAt: '19 mins ago',
    createdAt: '2026-10-05',
  },
  {
    id: 'TRK-705',
    name: 'Helios CleanTech Pixel Sandbox',
    campaignId: 'CMP-8524',
    offerId: 'OFR-8524',
    campaignName: 'Helios Solar Residential Estimator',
    trackingMethod: 'Browser Pixel',
    partnerSource: 'pub_native_scale',
    primarySubIdParam: 'x',
    secondarySubIds: ['x1', 'x2'],
    trackingUrl: 'https://trk.crosx.internal/v2/pixel.gif?offer_id=OFR-8524&c={c}&event={event}&timestamp={timestamp}',
    postbackCallbackUrl: 'https://pixel.nativescale.in/fire?c={c}&event={event}',
    status: 'testing',
    clicks: 1420,
    conversions: 48,
    referralConversions: 9,
    avgLatencyMs: 24,
    trackedPayoutInr: 112896,
    lastPingAt: '1 hour ago',
    createdAt: '2026-10-16',
  },
];

