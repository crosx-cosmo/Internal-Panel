'use client';

import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FileCode2,
  FolderKanban,
  Plus,
  Trash2,
  Save,
  Eye,
  Copy,
  ArrowUp,
  ArrowDown,
  Code,
  Layout,
} from 'lucide-react';
import { useCrosXStore } from '@/lib/store-context';
import type { TemplateRecord, TemplateField } from '@/lib/mock-data';
import { getSelectOptionsForTemplateField } from '@/lib/crosx-logic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { Switch, Checkbox } from '@/components/ui/controls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TemplateViewProps {
  subSection: 'create' | 'all';
}

const TEMPLATE_TYPE_OPTIONS = [
  { label: 'Lead Capture', value: 'Lead Capture' },
  { label: 'Postback Schema', value: 'Postback Schema' },
  { label: 'Offer Wall', value: 'Offer Wall' },
  { label: 'Attribution Pixel', value: 'Attribution Pixel' },
];

const TEMPLATE_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const FIELD_TYPE_OPTIONS = [
  { label: 'Text', value: 'text' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
  { label: 'Number', value: 'number' },
  { label: 'Select', value: 'select' },
  { label: 'Checkbox', value: 'checkbox' },
];

export function TemplateView({ subSection }: TemplateViewProps) {
  const {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    setActiveSection,
  } = useCrosXStore();

  // Create Template Builder State
  const [tplName, setTplName] = useState('Enterprise SaaS Lead Qualification v2');
  const [tplType, setTplType] = useState<TemplateRecord['type']>('Lead Capture');
  const [tplStatus, setTplStatus] = useState<TemplateRecord['status']>('active');
  const [previewMode, setPreviewMode] = useState<'form' | 'json'>('form');
  const [fields, setFields] = useState<TemplateField[]>([
    {
      id: 'fld-1',
      key: 'work_email',
      label: 'Corporate Work Email',
      type: 'email',
      required: true,
      placeholder: 'vp.ops@enterprise.in',
    },
    {
      id: 'fld-2',
      key: 'company_name',
      label: 'Registered Organization',
      type: 'text',
      required: true,
      placeholder: 'Acme Global Pvt Ltd',
    },
    {
      id: 'fld-3',
      key: 'monthly_ad_spend_inr',
      label: 'Monthly Ad Spend (INR · ₹)',
      type: 'number',
      required: true,
      placeholder: '4200000',
    },
    {
      id: 'fld-4',
      key: 'dpdp_consent',
      label: 'Data Processing Agreement Consent',
      type: 'checkbox',
      required: true,
      placeholder: 'I agree to the terms of data processing',
    },
  ]);

  // Modal Preview for All Templates
  const [inspectingTemplate, setInspectingTemplate] = useState<TemplateRecord | null>(null);

  const handleAddField = () => {
    const idx = fields.length + 1;
    setFields((prev) => [
      ...prev,
      {
        id: `fld-${Date.now()}`,
        key: `custom_field_${idx}`,
        label: `Custom Attribute ${idx}`,
        type: 'text',
        required: false,
        placeholder: 'Enter value...',
      },
    ]);
  };

  const handleUpdateField = (id: string, patch: Partial<TemplateField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const handleRemoveField = (id: string) => {
    if (fields.length <= 1) {
      toast.error('A template must contain at least one schema field');
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const copy = [...fields];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setFields(copy);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || tplName.trim().length < 3) {
      toast.error('Template name must be at least 3 characters');
      return;
    }
    const created = addTemplate({
      name: tplName.trim(),
      type: tplType,
      status: tplStatus,
      fields,
    });
    toast.success(`Saved template "${created.name}" (${created.id})`);
    setActiveSection('template-all');
  };

  const templateColumns = useMemo<ColumnDef<TemplateRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Template',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {row.original.name}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {row.original.id}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {row.original.type}
          </span>
        ),
      },
      {
        id: 'fieldsCount',
        header: 'Fields',
        accessorFn: (row) => row.fields.length,
        cell: ({ row }) => (
          <div>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
              {row.original.fields.length}
            </span>{' '}
            <span className="text-slate-500">fields</span>
            <div className="font-mono text-[11px] text-slate-400 truncate max-w-[220px]">
              {row.original.fields.map((f) => f.key).join(', ')}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'usageCount',
        header: 'Usage',
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
            {row.original.usageCount} campaigns
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {row.original.updatedAt}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingTemplate(t)}
                className="h-7 px-2.5 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Duplicate ${t.name}`}
                onClick={() => {
                  const copy = addTemplate({
                    name: `${t.name} (Copy)`,
                    type: t.type,
                    status: 'draft',
                    fields: t.fields,
                  });
                  toast.success(`Duplicated template as ${copy.id}`);
                }}
                className="h-7 w-7"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${t.name}`}
                onClick={() => {
                  deleteTemplate(t.id);
                  toast.success(`Deleted template ${t.id}`);
                }}
                className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [addTemplate, deleteTemplate]
  );

  return (
    <div className="space-y-6">
      {/* Header & Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {subSection === 'create' ? 'Template Builder' : 'All Templates'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Design reusable lead intake schemas, offer wall layouts, and S2S payload validation templates.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-[#090D16]">
          <button
            type="button"
            onClick={() => setActiveSection('template-create')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              subSection === 'create'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            )}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            <span>Create Template</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('template-all')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              subSection === 'all'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            )}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>All Templates ({templates.length})</span>
          </button>
        </div>
      </div>

      {subSection === 'create' ? (
        <form onSubmit={handleSaveTemplate} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 7 Columns: Schema & Field Configuration */}
          <Card className="lg:col-span-7">
            <CardHeader className="pb-3">
              <CardTitle>Template Metadata & Field Schema</CardTitle>
              <CardDescription>
                Configure template properties and manage ordered validation fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="tpl-name">Template Name</Label>
                  <Input
                    id="tpl-name"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-type">Template Type</Label>
                  <ThemedSelect
                    id="tpl-type"
                    ariaLabel="Template Type"
                    value={tplType}
                    onValueChange={(val) =>
                      setTplType(val as TemplateRecord['type'])
                    }
                    options={TEMPLATE_TYPE_OPTIONS}
                    searchable={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-status">Status</Label>
                  <ThemedSelect
                    id="tpl-status"
                    ariaLabel="Template Status"
                    value={tplStatus}
                    onValueChange={(val) =>
                      setTplStatus(val as TemplateRecord['status'])
                    }
                    options={TEMPLATE_STATUS_OPTIONS}
                    searchable={false}
                  />
                </div>
              </div>

              {/* Dynamic Field List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Field Management ({fields.length} fields)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddField}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Field</span>
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-[#090D16]"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
                        <div className="space-y-1 sm:col-span-4">
                          <Label className="text-[11px]">Display Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              handleUpdateField(field.id, { label: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label className="text-[11px]">Payload Key</Label>
                          <Input
                            value={field.key}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                              })
                            }
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label className="text-[11px]">Data Type</Label>
                          <ThemedSelect
                            ariaLabel={`Data type for ${field.label}`}
                            size="sm"
                            searchable={false}
                            value={field.type}
                            onValueChange={(val) =>
                              handleUpdateField(field.id, {
                                type: val as TemplateField['type'],
                              })
                            }
                            options={FIELD_TYPE_OPTIONS}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1 sm:col-span-2">
                          <button
                            type="button"
                            aria-label="Move field up"
                            onClick={() => handleMoveField(idx, 'up')}
                            disabled={idx === 0}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-200/60 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move field down"
                            onClick={() => handleMoveField(idx, 'down')}
                            disabled={idx === fields.length - 1}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-200/60 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove field ${field.label}`}
                            onClick={() => handleRemoveField(field.id)}
                            className="rounded p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800/80">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>Placeholder:</span>
                          <input
                            type="text"
                            value={field.placeholder}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                placeholder: e.target.value,
                              })
                            }
                            className="bg-transparent font-mono text-xs text-slate-700 focus:outline-none dark:text-slate-300"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Required</span>
                          <Switch
                            aria-label={`Required toggle for ${field.label}`}
                            checked={field.required}
                            onCheckedChange={(val) =>
                              handleUpdateField(field.id, { required: val })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button type="submit" size="sm">
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Template</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right 5 Columns: Live Interactive Preview */}
          <Card className="lg:col-span-5 h-fit">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  Interactive rendering & JSON schema contract.
                </CardDescription>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-[#090D16] shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewMode('form')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0',
                    previewMode === 'form'
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500'
                  )}
                >
                  <Layout className="h-3 w-3 shrink-0" />
                  <span>Form UI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('json')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0',
                    previewMode === 'json'
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500'
                  )}
                >
                  <Code className="h-3 w-3 shrink-0" />
                  <span>JSON Schema</span>
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {previewMode === 'form' ? (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-[#090D16]">
                  <div className="border-b border-slate-200 pb-2.5 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {tplName || 'Untitled Template'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tplType} · CrosX Validated Intake
                    </div>
                  </div>

                  <div className="space-y-3">
                    {fields.map((f) => (
                      <div key={f.id} className="space-y-1">
                        {f.type === 'checkbox' ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Checkbox id={`prev-${f.id}`} defaultChecked />
                            <Label htmlFor={`prev-${f.id}`} className="text-xs font-normal">
                              {f.label} {f.required && <span className="text-red-500">*</span>}
                            </Label>
                          </div>
                        ) : f.type === 'select' ? (
                          <>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`prev-${f.id}`}>
                                {f.label} {f.required && <span className="text-red-500">*</span>}
                              </Label>
                              <span className="font-mono text-[10px] text-slate-400">
                                {f.key}
                              </span>
                            </div>
                            <ThemedSelect
                              id={`prev-${f.id}`}
                              ariaLabel={f.label}
                              size="sm"
                              searchable={false}
                              value={getSelectOptionsForTemplateField(f)[0]?.value ?? ''}
                              onValueChange={() => {}}
                              options={getSelectOptionsForTemplateField(f)}
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`prev-${f.id}`}>
                                {f.label} {f.required && <span className="text-red-500">*</span>}
                              </Label>
                              <span className="font-mono text-[10px] text-slate-400">
                                {f.key}
                              </span>
                            </div>
                            <Input
                              id={`prev-${f.id}`}
                              type={f.type === 'number' ? 'number' : 'text'}
                              placeholder={f.placeholder}
                              defaultValue={f.placeholder}
                              className="h-8 text-xs"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      toast.success('Simulated template submission passed schema validation')
                    }
                    className="w-full"
                  >
                    Verify Intake Submission
                  </Button>
                </div>
              ) : (
                <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-200 dark:border-slate-800">
                  {JSON.stringify(
                    {
                      template_name: tplName,
                      template_type: tplType,
                      status: tplStatus,
                      currency_standard: 'INR',
                      schema_version: '2026-10',
                      properties: Object.fromEntries(
                        fields.map((f) => [
                          f.key,
                          {
                            type: f.type,
                            label: f.label,
                            required: f.required,
                          },
                        ])
                      ),
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </CardContent>
          </Card>
        </form>
      ) : (
        <>
          <DataTable
            data={templates as unknown as Record<string, unknown>[]}
            columns={
              templateColumns as unknown as ColumnDef<Record<string, unknown>, unknown>[]
            }
            searchPlaceholder="Search template name, ID, or type..."
            searchKeys={['name', 'id', 'type']}
            dateKey="updatedAt"
            exportFilename="crosx-templates.csv"
            facets={[
              {
                key: 'type',
                label: 'Type',
                options: [
                  { label: 'Lead Capture', value: 'Lead Capture' },
                  { label: 'Postback Schema', value: 'Postback Schema' },
                  { label: 'Offer Wall', value: 'Offer Wall' },
                ],
              },
              {
                key: 'status',
                label: 'Status',
                options: [
                  { label: 'Active', value: 'active' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Archived', value: 'archived' },
                ],
              },
            ]}
          />

          <Dialog
            open={!!inspectingTemplate}
            onOpenChange={(open) => !open && setInspectingTemplate(null)}
          >
            <DialogContent>
              {inspectingTemplate && (
                <>
                  <DialogHeader>
                    <DialogTitle>{inspectingTemplate.name}</DialogTitle>
                    <DialogDescription>
                      {inspectingTemplate.id} · {inspectingTemplate.type} · Used by{' '}
                      {inspectingTemplate.usageCount} campaigns
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2.5">
                    {inspectingTemplate.fields.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs dark:border-slate-800"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {f.label}
                          </div>
                          <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                            {f.key}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {f.type} · {f.required ? 'required' : 'optional'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectingTemplate(null)}
                    >
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateTemplate(inspectingTemplate.id, {
                          status:
                            inspectingTemplate.status === 'active'
                              ? 'archived'
                              : 'active',
                        });
                        toast.success(`Updated status for ${inspectingTemplate.id}`);
                        setInspectingTemplate(null);
                      }}
                    >
                      Toggle Active/Archive
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
