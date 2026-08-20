import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../services/api';
import { PageHeader, Button, Input, Select, Card } from '../../components/ui';
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
    </div>
  );
}
