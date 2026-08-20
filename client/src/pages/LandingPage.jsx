import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileCheck2,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Timer,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui';

const features = [
  {
    icon: FileCheck2,
    title: 'Google Forms-style builder',
    desc: 'Drag-and-drop exam creation with 11 question types, marks, media, and randomization.',
  },
  {
    icon: Sparkles,
    title: 'AI essay grading',
    desc: 'Gemini or OpenAI grades essays against your rubric with feedback teachers can override.',
  },
  {
    icon: Shield,
    title: 'Anti-cheating suite',
    desc: 'Fullscreen lock, tab-switch detection, copy/paste block, warnings, and auto-submit.',
  },
  {
    icon: Eye,
    title: 'Live proctoring view',
    desc: 'Watch students online in real time — warnings, progress, and remaining time via Socket.io.',
  },
  {
    icon: Timer,
    title: 'Resilient live exams',
    desc: 'Countdown timer, autosave, resume after disconnect, flags, and progress navigation.',
  },
  {
    icon: CheckCircle2,
    title: 'Instant analytics',
    desc: 'Performance charts, pass rates, and one-click export to PDF, Excel, or CSV.',
  },
];

const pricing = [
  {
    name: 'Starter',
    price: 'Free',
    desc: 'For small classes and pilots',
    features: ['Up to 50 students', '5 active exams', 'Basic analytics', 'Email support'],
  },
  {
    name: 'Institution',
    price: '$99',
    period: '/mo',
    desc: 'For schools and departments',
    featured: true,
    features: [
      'Unlimited students',
      'AI grading included',
      'Live monitoring',
      'Anti-cheat suite',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Universities & certification bodies',
    features: ['SSO & SSO provisioning', 'Dedicated cluster', 'SLA & audit packs', 'Custom integrations'],
  },
];

const faqs = [
  {
    q: 'Can administrators switch AI providers?',
    a: 'Yes. Admins set Gemini or OpenAI API keys in Settings and switch providers anytime without code changes.',
  },
  {
    q: 'Which question types auto-grade?',
    a: 'Multiple choice, true/false, checkbox, matching, fill-in-the-blank, and short answers with accepted responses. Essays use AI or manual grading.',
  },
  {
    q: 'How does anti-cheating work?',
    a: 'The exam client enforces fullscreen, detects tab switches and focus loss, disables copy/paste and right-click, logs activity, and auto-submits after three warnings.',
  },
  {
    q: 'Is ExamAI suitable for certification exams?',
    a: 'Yes. Role-based access, audit logs, certificates for passers, IP/device tracking, and exportable reports support formal assessment programs.',
  },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-sand text-ink dark:bg-ink dark:text-sand">
      {/* Atmosphere */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_transparent_55%)] opacity-70 dark:opacity-20" />
        <div className="absolute bottom-0 right-0 h-[50vh] w-[50vw] bg-[radial-gradient(circle,_#99f6e4_0%,_transparent_60%)] opacity-40 dark:opacity-10" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="font-display text-3xl tracking-tight text-brand-800 dark:text-brand-300">
          ExamAI
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <a href="#features" className="hover:text-brand-700">Features</a>
          <a href="#pricing" className="hover:text-brand-700">Pricing</a>
          <a href="#faq" className="hover:text-brand-700">FAQ</a>
          <a href="#contact" className="hover:text-brand-700">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="rounded-xl p-2 hover:bg-white/60 dark:hover:bg-slate-800" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/register" className="hidden sm:inline-flex">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero — brand first, one composition */}
      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-display text-5xl leading-none text-brand-800 sm:text-6xl md:text-7xl dark:text-brand-300">
            ExamAI
          </p>
          <h1 className="mt-4 max-w-lg text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl dark:text-sand">
            Secure examinations with intelligent grading
          </h1>
          <p className="mt-4 max-w-md text-slate-600 dark:text-slate-400">
            Build, proctor, and grade assessments for schools and certification programs — with AI feedback and real-time integrity monitoring.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register">
              <Button size="lg">
                Start free trial <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">Explore features</Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative hidden min-h-[420px] lg:block"
        >
          <div className="absolute inset-0 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-600 to-teal-400 shadow-2xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMzBoNjBNMzAgMHY2MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-60" />
            <div className="relative flex h-full flex-col justify-between p-8 text-white">
              <div>
                <p className="text-sm uppercase tracking-widest text-white/70">Live exam session</p>
                <p className="mt-2 font-display text-4xl">CS101 Midterm</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-white/70">Students online</p>
                  <p className="mt-1 text-3xl font-semibold">42</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-white/70">Integrity score</p>
                  <p className="mt-1 text-3xl font-semibold">98%</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: '0%' }}
                  animate={{ width: '67%' }}
                  transition={{ duration: 1.4, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl text-brand-900 dark:text-brand-200">Built for serious assessment</h2>
          <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-400">
            Everything institutions need to run trustworthy exams end to end.
          </p>
        </motion.div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="border-t border-brand-200 pt-6 dark:border-brand-900"
            >
              <f.icon className="text-brand-700 dark:text-brand-400" size={24} />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-slate-200/80 bg-white/50 py-20 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-4xl text-brand-900 dark:text-brand-200">Simple pricing</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">Scale from a single classroom to an entire university.</p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 ${
                  plan.featured
                    ? 'bg-brand-800 text-white shadow-xl dark:bg-brand-700'
                    : 'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className={`mt-1 text-sm ${plan.featured ? 'text-brand-100' : 'text-slate-500'}`}>{plan.desc}</p>
                <p className="mt-6 font-display text-5xl">
                  {plan.price}
                  {plan.period && <span className="text-lg opacity-70">{plan.period}</span>}
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 size={16} className={plan.featured ? 'text-brand-200' : 'text-brand-600'} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="mt-8 block">
                  <Button
                    className="w-full"
                    variant={plan.featured ? 'secondary' : 'primary'}
                  >
                    Choose {plan.name}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl text-brand-900 dark:text-brand-200">FAQ</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => (
            <div key={item.q} className="border-b border-slate-200 dark:border-slate-800">
              <button
                className="flex w-full items-center justify-between py-4 text-left font-medium"
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
              >
                {item.q}
                <span className="text-brand-600">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <p className="pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-brand-800 px-8 py-12 text-white dark:bg-brand-900 sm:px-12">
          <h2 className="font-display text-4xl">Ready to elevate your exams?</h2>
          <p className="mt-3 max-w-lg text-brand-100">
            Talk to our team about institutional rollout, SSO, and custom proctoring policies.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="mailto:hello@examai.com">
              <Button variant="secondary">Email hello@examai.com</Button>
            </a>
            <Link to="/register">
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-10 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <p className="font-display text-2xl text-brand-800 dark:text-brand-300">ExamAI</p>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} ExamAI. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-slate-500">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
