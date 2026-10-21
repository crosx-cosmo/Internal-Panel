'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  FileSpreadsheet,
  MousePointerClick,
  Repeat,
  Users,
  Radar,
  Globe,
  ShieldCheck,
  FileCode2,
  FolderKanban,
  UserCircle,
  KeyRound,
  Settings,
  Search,
  Sun,
  Moon,
  Menu,
  ChevronRight,
  ChevronDown,
  Command,
  Cpu,
  X,
} from 'lucide-react';
import { CrosXLogo } from './crosx-logo';
import { GeminiAiOperationsPanel } from './gemini-ai-panel';
import { useCrosXStore, type NavSectionId } from '@/lib/store-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface NavGroup {
  id: string;
  label: string;
  items: {
    id: NavSectionId;
    label: string;
    breadcrumb: string[];
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        breadcrumb: ['Operations', 'Dashboard'],
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'campaign',
    label: 'Campaign',
    items: [
      {
        id: 'campaign-create',
        label: 'Create Campaign',
        breadcrumb: ['Campaign', 'Create Campaign'],
        icon: PlusCircle,
      },
      {
        id: 'campaign-all',
        label: 'All Campaigns',
        breadcrumb: ['Campaign', 'All Campaigns'],
        icon: Megaphone,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      {
        id: 'reports-submission',
        label: 'Submission',
        breadcrumb: ['Reports', 'Submission Telemetry'],
        icon: FileSpreadsheet,
      },
      {
        id: 'reports-click',
        label: 'Click',
        breadcrumb: ['Reports', 'Click Stream'],
        icon: MousePointerClick,
      },
      {
        id: 'reports-conversion',
        label: 'Conversion',
        breadcrumb: ['Reports', 'Conversion Ledger'],
        icon: Repeat,
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      {
        id: 'management-referral',
        label: 'Referral',
        breadcrumb: ['Management', 'Referral Management'],
        icon: Users,
      },
      {
        id: 'management-tracker',
        label: 'Tracker',
        breadcrumb: ['Management', 'Attribution Tracker'],
        icon: Radar,
      },
    ],
  },
  {
    id: 'postback',
    label: 'Postback',
    items: [
      {
        id: 'postback-global',
        label: 'Global Postback',
        breadcrumb: ['Postback', 'Global S2S Configuration'],
        icon: Globe,
      },
      {
        id: 'postback-ip',
        label: 'IP Whitelist',
        breadcrumb: ['Postback', 'IP Whitelist'],
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'template',
    label: 'Template',
    items: [
      {
        id: 'template-create',
        label: 'Create Template',
        breadcrumb: ['Template', 'Create Template'],
        icon: FileCode2,
      },
      {
        id: 'template-all',
        label: 'All Templates',
        breadcrumb: ['Template', 'All Templates'],
        icon: FolderKanban,
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'profile',
        label: 'Profile',
        breadcrumb: ['Administration', 'Operator Profile'],
        icon: UserCircle,
      },
      {
        id: 'api',
        label: 'API',
        breadcrumb: ['Administration', 'API Keys & Reference'],
        icon: KeyRound,
      },
      {
        id: 'settings',
        label: 'Settings',
        breadcrumb: ['Administration', 'System Settings'],
        icon: Settings,
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    activeSection,
    setActiveSection,
    campaigns,
    referrals,
    trackers,
    templates,
    profile,
  } = useCrosXStore();
  const { resolvedTheme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  // Collapsible section state: all sections expanded initially, and active parent group always stays expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    campaign: true,
    reports: true,
    management: true,
    postback: true,
    template: true,
    administration: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Automatically expand the active page's parent section when navigating
  useEffect(() => {
    const parentGroup = NAV_GROUPS.find((g) =>
      g.items.some((item) => item.id === activeSection)
    );
    if (parentGroup) {
      setExpandedGroups((prev) =>
        prev[parentGroup.id] ? prev : { ...prev, [parentGroup.id]: true }
      );
    }
  }, [activeSection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const allNavItems = NAV_GROUPS.flatMap((g) => g.items);
  const currentNav =
    allNavItems.find((item) => item.id === activeSection) ?? allNavItems[0];

  const handleNavigate = (section: NavSectionId) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setCommandOpen(false);
  };

  const filteredCommandNav = allNavItems.filter(
    (i) =>
      i.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
      i.breadcrumb.join(' ').toLowerCase().includes(commandQuery.toLowerCase())
  );

  const filteredCommandCampaigns = campaigns
    .filter(
      (c) =>
        c.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(commandQuery.toLowerCase()) ||
        c.brand.toLowerCase().includes(commandQuery.toLowerCase())
    )
    .slice(0, 4);

  const getItemBadgeCount = (itemId: NavSectionId): number | null => {
    if (itemId === 'campaign-all') return campaigns.length;
    if (itemId === 'management-referral') return referrals.length;
    if (itemId === 'management-tracker') return trackers.length;
    if (itemId === 'template-all') return templates.length;
    return null;
  };

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#090D16] border-r border-slate-200 dark:border-slate-800/90 select-none">
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-5 border-b border-slate-200 dark:border-slate-800/90">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md cursor-pointer"
          >
            <CrosXLogo />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">
              INR · OPS
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Navigation Groups */}
        <nav
          aria-label="Primary Sidebar Navigation"
          className="flex-1 space-y-2.5 px-3 py-4 overflow-y-auto"
        >
          {NAV_GROUPS.map((group) => {
            const isExpanded = !!expandedGroups[group.id];
            const hasActiveChild = group.items.some(
              (item) => item.id === activeSection
            );

            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`sidebar-group-${group.id}`}
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60',
                    hasActiveChild
                      ? 'text-slate-900 dark:text-slate-200'
                      : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
                  )}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300',
                      !isExpanded && '-rotate-90'
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      id={`sidebar-group-${group.id}`}
                      initial={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { height: 0, opacity: 0 }
                      }
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { height: 'auto', opacity: 1 }
                      }
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { height: 0, opacity: 0 }
                      }
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.18,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="overflow-hidden space-y-0.5 pl-1"
                    >
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        const badgeCount = getItemBadgeCount(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNavigate(item.id)}
                            className={cn(
                              'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60',
                              isActive
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                            )}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <Icon
                                className={cn(
                                  'h-4 w-4 shrink-0 transition-colors',
                                  isActive
                                    ? 'text-white'
                                    : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300'
                                )}
                              />
                              <span className="truncate">{item.label}</span>
                            </span>
                            {badgeCount !== null && (
                              <span
                                className={cn(
                                  'font-mono text-[11px] tabular-nums',
                                  isActive
                                    ? 'text-blue-100 font-semibold'
                                    : 'text-slate-400 dark:text-slate-500'
                                )}
                              >
                                {badgeCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Operator Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800/90 p-3 shrink-0">
        <button
          type="button"
          onClick={() => handleNavigate('profile')}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-blue-600">
            EV
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {profile.fullName}
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {profile.email}
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#090D16]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        {/* Top Bar Contract: Breadcrumb trail on left, primary controls on right */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-xs dark:border-slate-800/90 dark:bg-[#090D16]/95">
          {/* Zone 1: Mobile Menu Trigger + Breadcrumb Trail */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
            >
              <span className="hidden sm:inline">CrosX</span>
              <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{currentNav.breadcrumb[0]}</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentNav.breadcrumb[1]}
              </span>
            </nav>
          </div>

          {/* Zone 2 & 3: Quick Command Search + Gemini AI Studio + Theme Toggle + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              aria-label="Quick search and command palette"
              onClick={() => setCommandOpen(true)}
              className="inline-flex h-8 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-[#0F1623] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search panel...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              aria-label="Open Gemini AI Studio Operations Intelligence"
              onClick={() => setGeminiModalOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-[#0F1623] dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">Gemini AI</span>
            </button>

            <button
              type="button"
              aria-label="Toggle color theme"
              onClick={() =>
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-[#0F1623] dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-150" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-transform duration-150" />
              )}
            </button>

            <Button
              size="sm"
              onClick={() => handleNavigate('campaign-create')}
              className="h-8 text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Campaign</span>
            </Button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8 max-w-[1440px] w-full mx-auto min-w-0">
          <motion.div
            key={activeSection}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Gemini AI Studio Operations Modal */}
      <Dialog open={geminiModalOpen} onOpenChange={setGeminiModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gemini AI Studio — Operations Intelligence</DialogTitle>
            <DialogDescription>
              Run server-side Gemini AI diagnostics on live CrosX campaigns, referral ledgers, Same-UPI fraud flags, and attribution trackers.
            </DialogDescription>
          </DialogHeader>
          <GeminiAiOperationsPanel defaultFocus="campaign_economics" />
        </DialogContent>
      </Dialog>

      {/* Command Palette Modal */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>CrosX Command Palette</DialogTitle>
            <DialogDescription>
              Quickly jump to any module, campaign, report, or configuration page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Command className="mr-2.5 h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Jump to module, campaign ID, referral, or tracker..."
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                Modules & Navigation
              </div>
              {filteredCommandNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{item.label}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {item.breadcrumb.join(' / ')}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredCommandCampaigns.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                  Active Campaigns
                </div>
                {filteredCommandCampaigns.map((camp) => (
                  <button
                    key={camp.id}
                    type="button"
                    onClick={() => handleNavigate('campaign-all')}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="truncate">{camp.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {camp.id} · {camp.brand}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
