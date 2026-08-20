import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Download, Printer, Award } from 'lucide-react';
import { responsesAPI } from '../../services/api';
import { PageHeader, Card, Badge, Button, Skeleton } from '../../components/ui';
import { formatDate, getErrorMessage } from '../../utils/helpers';

const ASSET_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function resolveAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${ASSET_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

export default function CertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: async () => (await responsesAPI.results()).data.data.results,
  });

  const [downloadingId, setDownloadingId] = useState(null);

  const certificates = (data || []).filter((r) => r.passed && r.published !== false);

  const openCertificate = async (result) => {
    setDownloadingId(result._id);
    try {
      let url = result.certificateUrl;
      if (!url) {
        const { data: certData } = await responsesAPI.certificate(result._id);
        url = certData.data.certificateUrl;
      }
      const fullUrl = resolveAssetUrl(url);
      if (!fullUrl) {
        toast.error('Certificate not available yet');
        return;
      }
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  const printCertificate = (result) => {
    const title = result.exam?.title || 'Exam';
    const score = result.percentage ?? 0;
    const grade = result.grade || '—';
    const date = formatDate(result.publishedAt || result.createdAt);
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      toast.error('Allow pop-ups to print certificates');
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Certificate — ${title}</title>
  <style>
    body { font-family: Georgia, serif; margin: 0; padding: 48px; background: #f8fafc; color: #0f172a; }
    .cert { max-width: 720px; margin: 0 auto; border: 12px double #1e3a5f; padding: 48px; background: linear-gradient(160deg, #fff 0%, #f0f7ff 100%); text-align: center; }
    .brand { font-size: 28px; letter-spacing: 0.2em; text-transform: uppercase; color: #1e3a5f; }
    .label { margin-top: 24px; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; color: #64748b; }
    h1 { margin: 12px 0 8px; font-size: 32px; }
    .meta { margin-top: 28px; font-size: 16px; color: #334155; }
    .seal { margin-top: 36px; display: inline-block; border: 2px solid #1e3a5f; border-radius: 999px; padding: 10px 22px; font-size: 13px; letter-spacing: 0.1em; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="brand">ExamAI</div>
    <div class="label">Certificate of Achievement</div>
    <h1>${title}</h1>
    <p class="meta">Score ${score}% · Grade ${grade} · ${date}</p>
    <div class="seal">PASSED</div>
  </div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div>
      <PageHeader title="Certificates" subtitle="Certificates for exams you passed" />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {certificates.map((r) => (
            <Card
              key={r._id}
              className="relative overflow-hidden border-2 border-brand-300 bg-gradient-to-br from-white via-brand-50/80 to-sky-50 p-0 dark:border-brand-700 dark:from-slate-900 dark:via-brand-950 dark:to-slate-900"
            >
              <div className="pointer-events-none absolute inset-3 rounded-xl border border-brand-200/80 dark:border-brand-800/60" />
              <div className="relative px-6 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                  <Award size={24} />
                </div>
                <p className="mt-4 font-display text-2xl tracking-wide text-brand-800 dark:text-brand-300">
                  ExamAI
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                  Certificate of Achievement
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-snug">{r.exam?.title}</h3>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  Score {r.percentage}% · Grade {r.grade} · {formatDate(r.publishedAt || r.createdAt)}
                </p>
                <Badge variant="success" className="mt-4">
                  Passed
                </Badge>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 print:hidden">
                  <Button
                    size="sm"
                    onClick={() => openCertificate(r)}
                    loading={downloadingId === r._id}
                  >
                    <Download size={14} /> Download
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => printCertificate(r)}>
                    <Printer size={14} /> Print
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {!certificates.length && (
            <Card className="md:col-span-2">
              <p className="py-10 text-center text-slate-500">
                Pass an exam to earn a certificate.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
