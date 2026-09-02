import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../services/api';
import { Button, Card } from '../../components/ui';

export default function ProctoringSettingsPage() {
  const [retention, setRetention] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await settingsAPI.get();
        const settings = data.data.settings || {};
        setRetention(Number(settings.proctoring_retention_days || settings.PROCTORING_RETENTION_DAYS || 30));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({ proctoring_retention_days: retention });
      toast.success('Proctoring settings saved');
    } catch (err) {
      toast.error('Failed to save proctoring settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card>
        <h2 className="text-xl font-semibold">Proctoring Settings</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm">Retention (days)</label>
          <input type="number" value={retention} onChange={(e) => setRetention(Number(e.target.value))} className="w-28 rounded border px-2 py-1" />
          <div>
            <Button onClick={save} loading={saving}>Save</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
