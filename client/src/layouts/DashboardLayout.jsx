import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  Users,
  BarChart3,
  GraduationCap,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { notificationsAPI } from '../services/api';
import { cn } from '../utils/helpers';
import EmailVerificationBanner from '../components/EmailVerificationBanner';

const navByRole = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/exams', label: 'Exams', icon: ClipboardList },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/proctoring', label: 'Proctoring', icon: Shield },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/exams', label: 'Exams', icon: ClipboardList },
    { to: '/teacher/courses', label: 'Courses', icon: BookOpen },
    { to: '/teacher/question-bank', label: 'Question Bank', icon: FileText },
    { to: '/teacher/students', label: 'Students', icon: GraduationCap },
    { to: '/teacher/grading', label: 'Grading', icon: BookOpen },
    { to: '/teacher/reports', label: 'Reports', icon: BarChart3 },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/exams', label: 'Available Exams', icon: ClipboardList },
    { to: '/student/history', label: 'Exam History', icon: FileText },
    { to: '/student/results', label: 'Results', icon: BarChart3 },
    { to: '/student/certificates', label: 'Certificates', icon: GraduationCap },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);

  const links = navByRole[user?.role] || [];

  useEffect(() => {
    notificationsAPI
      .list()
      .then(({ data }) => setUnread(data.data.unread || 0))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-mist/60 dark:bg-ink">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-950 lg:static',
          collapsed ? 'w-[72px]' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          {!collapsed && (
            <Link to="/" className="font-display text-2xl tracking-tight text-brand-800 dark:text-brand-300">
              ExamAI
            </Link>
          )}
          <button
            className="hidden rounded-lg p-1.5 hover:bg-mist dark:hover:bg-slate-800 lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronLeft className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} />
          </button>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-700 text-white dark:bg-brand-600'
                    : 'text-slate-600 hover:bg-mist dark:text-slate-300 dark:hover:bg-slate-900'
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut size={18} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <button className="rounded-lg p-2 hover:bg-mist lg:hidden dark:hover:bg-slate-800" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs capitalize text-slate-500">{user?.role}</p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 hover:bg-mist dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to={`/${user?.role}/notifications`}
              className="relative rounded-xl p-2 hover:bg-mist dark:hover:bg-slate-800"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </Link>
            <Link
              to={`/${user?.role}/profile`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-200"
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <EmailVerificationBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
