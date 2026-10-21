'use client';

import React from 'react';
import { AppShell } from '@/components/shared/app-shell';
import { useCrosXStore } from '@/lib/store-context';
import { DashboardView } from '@/components/modules/dashboard-view';
import { CampaignCreateView } from '@/components/modules/campaign-create-view';
import { CampaignListView } from '@/components/modules/campaign-list-view';
import { ReportsView } from '@/components/modules/reports-view';
import { ReferralView } from '@/components/modules/referral-view';
import { TrackerView } from '@/components/modules/tracker-view';
import { PostbackView } from '@/components/modules/postback-view';
import { TemplateView } from '@/components/modules/template-view';
import { ProfileView } from '@/components/modules/profile-view';
import { ApiView } from '@/components/modules/api-view';
import { SettingsView } from '@/components/modules/settings-view';

export default function CrosXInternalPanelPage() {
  const { activeSection } = useCrosXStore();

  return (
    <AppShell>
      {activeSection === 'dashboard' && <DashboardView />}
      {activeSection === 'campaign-create' && <CampaignCreateView />}
      {activeSection === 'campaign-all' && <CampaignListView />}
      {activeSection === 'reports-submission' && (
        <ReportsView reportType="submission" />
      )}
      {activeSection === 'reports-click' && <ReportsView reportType="click" />}
      {activeSection === 'reports-conversion' && (
        <ReportsView reportType="conversion" />
      )}
      {activeSection === 'management-referral' && <ReferralView />}
      {activeSection === 'management-tracker' && <TrackerView />}
      {activeSection === 'postback-global' && (
        <PostbackView subSection="global" />
      )}
      {activeSection === 'postback-ip' && <PostbackView subSection="ip" />}
      {activeSection === 'template-create' && (
        <TemplateView subSection="create" />
      )}
      {activeSection === 'template-all' && <TemplateView subSection="all" />}
      {activeSection === 'profile' && <ProfileView />}
      {activeSection === 'api' && <ApiView />}
      {activeSection === 'settings' && <SettingsView />}
    </AppShell>
  );
}
