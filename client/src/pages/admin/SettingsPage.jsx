import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../services/api';
import { PageHeader, Button, Input, Select, Card, Badge } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: ai, isLoading } = useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => (await settingsAPI.getAI()).data.data,
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await settingsAPI.get()).data.data.settings,
  });

  const [form, setForm] = useState(null);

  const current = form || {
    provider: ai?.provider || 'gemini',
    gemini_api_key: '',
    openai_api_key: '',
    site_name: settings?.site_name || 'ExamAI',
  };

  const saveAI = useMutation({
    mutationFn: () =>
      settingsAPI.updateAI({
        provider: current.provider,
        gemini_api_key: current.gemini_api_key || undefined,
        openai_api_key: current.openai_api_key || undefined,
      }),
    onSuccess: () => {
      toast.success('AI configuration saved');
      qc.invalidateQueries({ queryKey: ['ai-config'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const saveSite = useMutation({
    mutationFn: () => settingsAPI.update({ site_name: current.site_name }),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const [capacity, setCapacity] = useState(null);
  const capacityForm = capacity || {
    marketingMode: Boolean(settings?.marketing_mode),
    studentLimit: settings?.student_limit ?? '',
  };
  const setCapacityForm = (patch) => setCapacity((c) => ({ ...(c || capacityForm), ...patch }));

  const saveCapacity = useMutation({
    mutationFn: () =>
      settingsAPI.update({
        marketing_mode: capacityForm.marketingMode ? true : false,
        student_limit: capacityForm.marketingMode ? '' : Number(capacityForm.studentLimit) || 0,
      }),
    onSuccess: () => {
      toast.success('Student capacity updated');
      qc.invalidateQueries({ queryKey: ['settings'] });
      setCapacity(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform and AI provider configuration" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">AI Configuration</h3>
          <p className="mt-1 text-sm text-slate-500">
            Switch between Google Gemini and OpenAI. Keys are stored securely and masked in the UI.
          </p>
          <div className="mt-4 space-y-3">
            <Select
              label="Active provider"
              value={current.provider}
              onChange={(e) => setForm({ ...current, provider: e.target.value })}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
            </Select>
            <Input
              label={`Gemini API key ${ai?.geminiConfigured ? '(configured)' : ''}`}
              type="password"
              placeholder={ai?.gemini_api_key || 'Enter Gemini API key'}
              value={current.gemini_api_key}
              onChange={(e) => setForm({ ...current, gemini_api_key: e.target.value })}
            />
            <Input
              label={`OpenAI API key ${ai?.openaiConfigured ? '(configured)' : ''}`}
              type="password"
              placeholder={ai?.openai_api_key || 'Enter OpenAI API key'}
              value={current.openai_api_key}
              onChange={(e) => setForm({ ...current, openai_api_key: e.target.value })}
            />
            <Button loading={saveAI.isPending} onClick={() => saveAI.mutate()}>
              Save AI settings
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">General</h3>
          <div className="mt-4 space-y-3">
            <Input
              label="Site name"
              value={current.site_name}
              onChange={(e) => setForm({ ...current, site_name: e.target.value })}
            />
            <Button loading={saveSite.isPending} onClick={() => saveSite.mutate()}>
              Save general settings
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Platform Student Capacity</h3>
            <p className="mt-1 text-sm text-slate-500">
              {capacityForm.marketingMode
                ? 'Unlimited — Marketing Mode is active. All students can register.'
                : `Limited — up to ${capacityForm.studentLimit || 0} active students.`}
            </p>
          </div>
          <Badge variant={capacityForm.marketingMode ? 'success' : 'default'}>
            {capacityForm.marketingMode ? 'Unlimited' : 'Limited'}
          </Badge>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="capacity"
              checked={capacityForm.marketingMode}
              onChange={() => setCapacityForm({ marketingMode: true })}
              className="h-4 w-4 text-brand-700 focus:ring-brand-500"
            />
            Unlimited — Marketing Mode
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="capacity"
              checked={!capacityForm.marketingMode}
              onChange={() => setCapacityForm({ marketingMode: false })}
              className="h-4 w-4 text-brand-700 focus:ring-brand-500"
            />
            Limited
          </label>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-52">
              <Input
                label="Student limit"
                type="number"
                min={0}
                disabled={capacityForm.marketingMode}
                value={capacityForm.studentLimit}
                onChange={(e) => setCapacityForm({ studentLimit: e.target.value })}
              />
            </div>
            <Button loading={saveCapacity.isPending} onClick={() => saveCapacity.mutate()}>
              Save capacity
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
