import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function MustChangePasswordBanner() {
  const { user } = useAuth();

  if (!user || !user.mustChangePassword) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
      <div className="flex items-start gap-2">
        <KeyRound size={18} className="mt-0.5 shrink-0" />
        <p>
          You are using a temporary password. Please change it before continuing.
        </p>
      </div>
      <Link
        to={`/${user.role}/profile`}
        className="inline-flex items-center rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
      >
        Change password
      </Link>
    </div>
  );
}