import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDashboardKPIs,
  calculateProfitMargins,
  convertToINR,
  formatINR,
  formatCurrency,
  interpolatePostbackUrl,
  isValidIPv4OrCIDR,
  filterRecordsByQueryAndFacets,
  isOfferIdUnique,
  buildExampleTrackingUrl,
  MACRO_TOKEN_LIBRARY,
  DEFAULT_ADVANCED_OPTIONS,
  type CampaignRecord,
} from './crosx-logic.ts';

const sampleCampaigns: CampaignRecord[] = [
  {
    id: 'CMP-101',
    offerId: 'OFR-8101',
    name: 'Apex Fintech Q4 Acquisition',
    brand: 'Apex Financial',
    category: 'Fintech',
    description: 'High-intent credit card signup flow',
    status: 'active',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    totalCap: 5000,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'S2S',
    trackingUrl: 'https://trk.crosx.io/c/CMP-101?c={c}&x={x}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 30,
    attributionModel: 'last_touch',
    conversionEvents: [
      {
        id: 'evt-1',
        name: 'KYC Approved',
        identifier: 'kyc_approved',
        description: 'Completed video KYC verification',
        active: true,
        payoutMappingInr: 3780,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-01',
    payoutType: 'CPA',
    advertiserPayout: 60,
    payoutAmount: 45,
    referralPayout: 3,
    currency: 'USD',
    exchangeRateToInr: 84.0,
    payableEventId: 'kyc_approved',
    conversionCondition: 'Approved KYC Application',
    dailyCap: 5000,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 10000,
    conversions: 400,
    revenue: 24000, // 24,000 USD * 84 = 20,16,000 INR
    payoutTotal: 18000, // 18,000 USD * 84 = 15,12,000 INR
    createdAt: '2026-10-01',
  },
  {
    id: 'CMP-102',
    offerId: 'OFR-8102',
    name: 'CloudScale SaaS Trial',
    brand: 'CloudScale',
    category: 'B2B SaaS',
    description: 'Enterprise cloud trial signups',
    status: 'paused',
    startDate: '2026-09-15',
    endDate: '2026-11-30',
    totalCap: 2500,
    unlimitedCap: false,
    logoAsset: null,
    trackingMethod: 'GET',
    trackingUrl: 'https://trk.crosx.io/c/CMP-102?c={c}&x={x}',
    clickTrackingEnabled: true,
    conversionTrackingEnabled: true,
    attributionWindowDays: 14,
    attributionModel: 'first_touch',
    conversionEvents: [
      {
        id: 'evt-2',
        name: 'Verified Work Email',
        identifier: 'verified_email',
        description: 'Corporate domain verified',
        active: true,
        payoutMappingInr: 2100,
      },
    ],
    eventAlerts: [],
    templateId: 'TPL-02',
    payoutType: 'CPL',
    advertiserPayout: 3360,
    payoutAmount: 2100,
    referralPayout: 168,
    currency: 'INR',
    exchangeRateToInr: 1.0,
    payableEventId: 'verified_email',
    conversionCondition: 'Verified Work Email',
    dailyCap: 2500,
    advancedOptions: { ...DEFAULT_ADVANCED_OPTIONS },
    clicks: 5000,
    conversions: 200,
    revenue: 672000, // 6,72,000 INR
    payoutTotal: 420000, // 4,20,000 INR
    createdAt: '2026-09-15',
  },
];

test('convertToINR converts foreign currencies using explicit exchange rates and flags unknown currencies', () => {
  const usdConv = convertToINR(100, 'USD');
  assert.equal(usdConv.amountInInr, 8400);
  assert.equal(usdConv.exchangeRateUsed, 84.0);
  assert.equal(usdConv.flaggedUnverified, false);

  const inrConv = convertToINR(205250.5, 'INR');
  assert.equal(inrConv.amountInInr, 205250.5);
  assert.equal(inrConv.exchangeRateUsed, 1);

  const unknownConv = convertToINR(500, 'XYZ');
  assert.equal(unknownConv.flaggedUnverified, true);
  assert.equal(unknownConv.exchangeRateUsed, null);
});

test('formatINR and formatCurrency use Indian number grouping and ₹ symbol', () => {
  const formatted = formatINR(205250, { minimumFractionDigits: 2 });
  assert.equal(formatted, '₹2,05,250.00');

  const convertedUsd = formatCurrency(100, 'USD');
  assert.equal(convertedUsd, '₹8,400');
});

test('calculateProfitMargins computes Gross and Net Profit Margin (%) accurately and flags negative or zero advertiser payout', () => {
  // Advertiser = ₹1000, User = ₹700, Referral = ₹50 -> Gross = 30%, Net = 25%
  const normal = calculateProfitMargins(1000, 700, 50);
  assert.equal(normal.grossMarginPercent, 30);
  assert.equal(normal.netMarginPercent, 25);
  assert.equal(normal.grossProfitInr, 300);
  assert.equal(normal.netProfitInr, 250);
  assert.equal(normal.isZeroAdvertiser, false);
  assert.equal(normal.isNegativeGross, false);
  assert.equal(normal.isNegativeNet, false);

  // Zero advertiser payout -> safe null margins, no division by zero
  const zeroAdv = calculateProfitMargins(0, 500, 50);
  assert.equal(zeroAdv.grossMarginPercent, null);
  assert.equal(zeroAdv.netMarginPercent, null);
  assert.equal(zeroAdv.isZeroAdvertiser, true);
  assert.equal(zeroAdv.isNegativeGross, true);

  // Negative margin -> never clamped to zero
  const neg = calculateProfitMargins(1000, 1200, 100);
  assert.equal(neg.grossMarginPercent, -20);
  assert.equal(neg.netMarginPercent, -30);
  assert.equal(neg.isNegativeGross, true);
  assert.equal(neg.isNegativeNet, true);
});

test('isOfferIdUnique and MACRO_TOKEN_LIBRARY validate V2 campaign requirements', () => {
  assert.equal(isOfferIdUnique('OFR-8101', sampleCampaigns), false);
  assert.equal(isOfferIdUnique('ofr-8101', sampleCampaigns), false);
  assert.equal(isOfferIdUnique('OFR-8101', sampleCampaigns, 'CMP-101'), true);
  assert.equal(isOfferIdUnique('OFR-9999', sampleCampaigns), true);

  // Verify all 17 macro tokens exist (7 core + x1..x10)
  assert.equal(MACRO_TOKEN_LIBRARY.length, 17);
  assert.equal(MACRO_TOKEN_LIBRARY.some((m) => m.token === 'c'), true);
  assert.equal(MACRO_TOKEN_LIBRARY.some((m) => m.token === 'x'), true);
  assert.equal(MACRO_TOKEN_LIBRARY.some((m) => m.token === 'offer_id'), true);
  assert.equal(MACRO_TOKEN_LIBRARY.some((m) => m.token === 'x10'), true);

  const s2sUrl = buildExampleTrackingUrl('S2S', 'OFR-9001');
  assert.equal(s2sUrl.includes('offer_id=OFR-9001'), true);
  assert.equal(s2sUrl.includes('c={c}'), true);
});

test('calculateDashboardKPIs aggregates multi-currency campaigns into standardized INR accurately', () => {
  const kpis = calculateDashboardKPIs(sampleCampaigns);
  assert.equal(kpis.totalCampaigns, 2);
  assert.equal(kpis.activeCampaigns, 1);
  assert.equal(kpis.totalRevenue, 2688000);
  assert.equal(kpis.totalPayout, 1932000);
  assert.equal(kpis.totalClicks, 15000);
  assert.equal(kpis.totalConversions, 600);
  assert.equal(kpis.conversionRate, 4.0);
  assert.equal(kpis.epc, 179.2);
});

test('interpolatePostbackUrl replaces macros with URL-encoded values', () => {
  const template =
    'https://postback.partner.io/track?c={c}&offer_id={offer_id}&payout={payout}&event={event}';
  const resolved = interpolatePostbackUrl(template, {
    c: 'cx_99812',
    offer_id: 'OFR-8492',
    payout: 3780,
    event: 'kyc_approved',
  });
  assert.equal(
    resolved,
    'https://postback.partner.io/track?c=cx_99812&offer_id=OFR-8492&payout=3780&event=kyc_approved'
  );
});

test('isValidIPv4OrCIDR validates IPv4 addresses and CIDR blocks', () => {
  assert.equal(isValidIPv4OrCIDR('192.168.1.1'), true);
  assert.equal(isValidIPv4OrCIDR('10.24.0.0/16'), true);
  assert.equal(isValidIPv4OrCIDR('999.168.1.1'), false);
  assert.equal(isValidIPv4OrCIDR('10.24.0.0/35'), false);
  assert.equal(isValidIPv4OrCIDR('not-an-ip'), false);
});

test('filterRecordsByQueryAndFacets filters by query, status facet, and date preset', () => {
  const filteredByBrand = filterRecordsByQueryAndFacets(sampleCampaigns, {
    searchQuery: 'cloudscale',
    searchKeys: ['name', 'brand', 'id'],
  });
  assert.equal(filteredByBrand.length, 1);
  assert.equal(filteredByBrand[0].id, 'CMP-102');

  const filteredByStatus = filterRecordsByQueryAndFacets(sampleCampaigns, {
    searchKeys: ['name'],
    facets: { status: 'active' },
  });
  assert.equal(filteredByStatus.length, 1);
  assert.equal(filteredByStatus[0].id, 'CMP-101');
});

test('calculateReferralMetrics computes referral counts, conversions, and INR payouts accurately', async () => {
  const { calculateReferralMetrics } = await import('./crosx-logic.ts');
  const metrics = calculateReferralMetrics([
    {
      id: 'REF-9001',
      campaignId: 'CMP-8492',
      offerId: 'OFR-8492',
      campaignName: 'Vanguard NeoBank Premier Card',
      referrerName: 'Vikramaditya Rao',
      referrerId: 'PRT-204',
      referrerEmail: 'v.rao@finpartners.in',
      referredUserName: 'Ananya Deshmukh',
      referredUserEmail: 'ananya.d@gmail.com',
      referredUpiHash: 'upi_sha256_99a1b2c3',
      sameUpiFlagged: false,
      linkedEventIdentifier: 'kyc_approved',
      attributionModel: 'first_referrer',
      conversionCompleted: true,
      payoutAmount: 420,
      currency: 'INR',
      exchangeRateToInr: 1,
      status: 'approved',
      notes: 'Verified Video KYC and first card load',
      createdAt: '2026-10-18T10:15:00Z',
    },
    {
      id: 'REF-9002',
      campaignId: 'CMP-8495',
      offerId: 'OFR-8495',
      campaignName: 'LinearCloud Enterprise DevOps Trial',
      referrerName: 'Rohan Kulkarni',
      referrerId: 'PRT-209',
      referrerEmail: 'rohan@cloudguild.io',
      referredUserName: 'Siddharth Menon',
      referredUserEmail: 's.menon@devops.in',
      referredUpiHash: 'upi_sha256_88d4e5f6',
      sameUpiFlagged: false,
      linkedEventIdentifier: 'cluster_deployed',
      attributionModel: 'first_referrer',
      conversionCompleted: true,
      payoutAmount: 10, // 10 USD * 84 = ₹840
      currency: 'USD',
      exchangeRateToInr: 84,
      status: 'pending',
      notes: 'Awaiting 7-day cluster uptime check',
      createdAt: '2026-10-18T14:22:00Z',
    },
    {
      id: 'REF-9003',
      campaignId: 'CMP-8508',
      offerId: 'OFR-8508',
      campaignName: 'Kinetix Direct Auto Insurance Quote',
      referrerName: 'Karan Malhotra',
      referrerId: 'PRT-215',
      referrerEmail: 'karan@autoleads.in',
      referredUserName: 'Karan Malhotra Alt',
      referredUserEmail: 'karan.alt@tempmail.org',
      referredUpiHash: 'upi_sha256_duplicate_77',
      sameUpiFlagged: true,
      linkedEventIdentifier: 'policy_bound',
      attributionModel: 'last_referrer',
      conversionCompleted: false,
      payoutAmount: 126,
      currency: 'INR',
      exchangeRateToInr: 1,
      status: 'rejected',
      notes: 'Same UPI ID validation policy violation',
      createdAt: '2026-10-17T19:05:00Z',
    },
  ]);

  assert.equal(metrics.totalReferrals, 3);
  assert.equal(metrics.approvedReferrals, 1);
  assert.equal(metrics.pendingReferrals, 1);
  assert.equal(metrics.rejectedReferrals, 1);
  assert.equal(metrics.referralConversions, 2);
  assert.equal(metrics.approvedPayoutTotalInr, 420);
  assert.equal(metrics.pendingPayoutTotalInr, 840);
  assert.equal(metrics.flaggedSameUpiCount, 1);
});

test('calculateTrackerMetrics aggregates tracker telemetry, latency, and INR payouts', async () => {
  const { calculateTrackerMetrics } = await import('./crosx-logic.ts');
  const summary = calculateTrackerMetrics([
    {
      id: 'TRK-701',
      name: 'NorthStar S2S Primary Router',
      campaignId: 'CMP-8492',
      offerId: 'OFR-8492',
      campaignName: 'Vanguard NeoBank Premier Card',
      trackingMethod: 'S2S',
      partnerSource: 'pub_aff_northstar',
      primarySubIdParam: 'x',
      secondarySubIds: ['x1', 'x2'],
      trackingUrl: 'https://trk.crosx.internal/v2/s2s/click?offer_id=OFR-8492&c={c}&x={x}&x1={x1}&event={event}',
      postbackCallbackUrl: 'https://postback.northstar.io/cb?cid={c}&payout={payout}',
      status: 'active',
      clicks: 20000,
      conversions: 800,
      referralConversions: 140,
      avgLatencyMs: 14,
      trackedPayoutInr: 4569600,
      lastPingAt: '2026-10-19T12:00:00Z',
      createdAt: '2026-10-01',
    },
    {
      id: 'TRK-702',
      name: 'SocialPulse Mobile Offer Code Link',
      campaignId: 'CMP-8519',
      offerId: 'OFR-8519',
      campaignName: 'Stratos Commerce POS Hardware Upgrade',
      trackingMethod: 'Offer Code',
      partnerSource: 'pub_social_pulse',
      primarySubIdParam: 'x',
      secondarySubIds: ['x1'],
      trackingUrl: 'https://trk.crosx.internal/v2/redeem?offer_id=OFR-8519&code={x}&c={c}&event={event}',
      postbackCallbackUrl: 'https://hooks.socialpulse.in/crosx?click={c}&event={event}',
      status: 'testing',
      clicks: 5000,
      conversions: 200,
      referralConversions: 45,
      avgLatencyMs: 22,
      trackedPayoutInr: 588000,
      lastPingAt: '2026-10-19T11:45:00Z',
      createdAt: '2026-10-06',
    },
  ]);

  assert.equal(summary.totalTrackers, 2);
  assert.equal(summary.activeTrackers, 1);
  assert.equal(summary.totalTrackedClicks, 25000);
  assert.equal(summary.totalTrackedConversions, 1000);
  assert.equal(summary.totalReferralConversions, 185);
  assert.equal(summary.avgLatencyMs, 18);
  assert.equal(summary.totalTrackedPayoutInr, 5157600);
  assert.equal(summary.conversionRatePercent, 4.0);
});

test('validateTemplatePreviewSubmission and buildDefaultTemplatePreviewValues validate required template fields and normalize types', async () => {
  const {
    validateTemplatePreviewSubmission,
    buildDefaultTemplatePreviewValues,
    getSelectOptionsForTemplateField,
  } = await import('./crosx-logic.ts');

  const sampleFields = [
    { id: 'f1', key: 'full_name', label: 'Legal Full Name', type: 'text' as const, required: true, placeholder: 'Aarav Mehta' },
    { id: 'f2', key: 'work_email', label: 'Primary Email Address', type: 'email' as const, required: true, placeholder: 'aarav@company.in' },
    { id: 'f3', key: 'annual_income', label: 'Annual Household Income (INR)', type: 'number' as const, required: true, placeholder: '1800000' },
    { id: 'f4', key: 'employment_status', label: 'Employment Classification', type: 'select' as const, required: true, placeholder: 'Full-Time Salaried' },
    { id: 'f5', key: 'kyc_consent', label: 'KYC Authorization', type: 'checkbox' as const, required: true, placeholder: 'I authorize' },
  ];

  const selectOpts = getSelectOptionsForTemplateField(sampleFields[3]);
  assert.equal(selectOpts.length >= 3, true);
  assert.equal(selectOpts[0].value, 'Full-Time Salaried');

  const populated = buildDefaultTemplatePreviewValues(sampleFields, true);
  const validResult = validateTemplatePreviewSubmission(sampleFields, populated);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.missingFields.length, 0);
  assert.equal(validResult.normalizedValues.annual_income, 1800000);
  assert.equal(validResult.normalizedValues.kyc_consent, true);

  const emptyValues = buildDefaultTemplatePreviewValues(sampleFields, false);
  const emptyResult = validateTemplatePreviewSubmission(sampleFields, emptyValues);
  assert.equal(emptyResult.valid, false);
  assert.equal(emptyResult.missingFields.length, 5);
});

