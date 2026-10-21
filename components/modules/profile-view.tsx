'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Save,
  Clock,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { Switch } from '@/components/ui/controls';
import { toast } from 'sonner';

const TIMEZONE_OPTIONS = [
  { label: 'UTC+05:30 (Asia/Kolkata · IST)', value: 'UTC+05:30 (Asia/Kolkata · IST)' },
  { label: 'UTC+00:00 (Europe/London · GMT)', value: 'UTC+00:00 (Europe/London)' },
  { label: 'UTC+01:00 (Europe/Berlin · CET)', value: 'UTC+01:00 (Europe/Berlin)' },
  { label: 'UTC+08:00 (Asia/Singapore · SGT)', value: 'UTC+08:00 (Asia/Singapore)' },
  { label: 'UTC-05:00 (America/New_York · EST)', value: 'UTC-05:00 (America/New_York)' },
];

export function ProfileView() {
  const { profile, updateProfile, activityLogs } = useCrosXStore();

  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [role, setRole] = useState(profile.role);
  const [department, setDepartment] = useState(profile.department);
  const [timezone, setTimezone] = useState(profile.timezone);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error('Full Name and Email are required');
      return;
    }
    updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      role: role.trim(),
      department: department.trim(),
      timezone,
    });
    toast.success('Operator profile updated');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Security credentials rotated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Operator Profile & Security
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Manage your CrosX Internal Panel identity, role permissions, authentication factors, and session audit history.
        </p>
      </div>

      {/* Top Identity Banner Card */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-xs">
              {profile.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {profile.fullName}
              </h2>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {profile.role} · {profile.department}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Level-4 Enterprise Clearance · S2S Admin & INR Payout Signer</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{profile.email}</span>
            <span className="mt-0.5 text-[11px]">{profile.timezone}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Information Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update operator display attributes and regional reporting timezone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-name">Full Name</Label>
                  <Input
                    id="prof-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-email">Corporate Email</Label>
                  <Input
                    id="prof-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-role">Assigned Role</Label>
                  <Input
                    id="prof-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-dept">Department</Label>
                  <Input
                    id="prof-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-tz">Reporting Timezone</Label>
                <ThemedSelect
                  id="prof-tz"
                  ariaLabel="Reporting Timezone"
                  value={timezone}
                  onValueChange={setTimezone}
                  options={TIMEZONE_OPTIONS}
                  searchable={false}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm">
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Profile</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password & Security UI */}
        <Card>
          <CardHeader>
            <CardTitle>Password & Security</CardTitle>
            <CardDescription>
              Rotate credentials and enforce hardware 2FA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    WebAuthn / Authenticator 2FA
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Required for payout & postback edits
                  </div>
                </div>
              </div>
              <Switch
                aria-label="Enable Two-Factor Authentication"
                checked={profile.twoFactorEnabled}
                onCheckedChange={(val) => {
                  updateProfile({ twoFactorEnabled: val });
                  toast.success(`Two-Factor Authentication ${val ? 'enabled' : 'disabled'}`);
                }}
              />
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="sec-curr-pw">Current Password</Label>
                <Input
                  id="sec-curr-pw"
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sec-new-pw">New Password</Label>
                <Input
                  id="sec-new-pw"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sec-conf-pw">Confirm New Password</Label>
                <Input
                  id="sec-conf-pw"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="w-full">
                <Lock className="h-3.5 w-3.5" />
                <span>Update Password</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Account Activity Audit Stream */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Account Activity</CardTitle>
          <CardDescription>
            Chronological log of administrative actions, schema publications, and security events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {activityLogs.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {item.action}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    — {item.target}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>{item.actor}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
