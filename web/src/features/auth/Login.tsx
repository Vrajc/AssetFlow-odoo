import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '../../api/client';
import { useAuth } from '../../stores/auth';
import { Button, Input, PasswordInput } from '../../components/ui';

const DEMO = [
  { email: 'admin@assetflow.io', label: 'Admin' },
  { email: 'meera@assetflow.io', label: 'Asset Manager' },
  { email: 'aditi@assetflow.io', label: 'Dept Head' },
  { email: 'priya@assetflow.io', label: 'Employee' },
];

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const setSession = useAuth((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(params.get('signup') === '1' ? 'signup' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function doLogin(email: string, password: string) {
    setLoading(true); setErr({});
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data.token, data.user);
      nav('/dashboard');
    } catch (e) {
      setErr({ form: apiError(e).message });
    } finally { setLoading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'login') return doLogin(form.email, form.password);
    if (mode === 'signup') {
      setLoading(true); setErr({});
      try {
        const { data } = await api.post('/auth/signup', form);
        setSession(data.token, data.user);
        toast.success('Account created — welcome!');
        nav('/dashboard');
      } catch (e) { setErr({ form: apiError(e).message }); } finally { setLoading(false); }
      return;
    }
    // forgot
    setLoading(true); setErr({});
    try {
      const { data } = await api.post('/auth/forgot-password', { email: form.email });
      toast.success(data.message, { duration: 6000 });
      setMode('login');
    } catch (e) { setErr({ form: apiError(e).message }); } finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <div className="aurora" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-txt-muted transition-colors hover:text-primary">
          <ArrowLeft size={15} /> Back to home
        </Link>
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-xl font-bold text-white">A</div>
          <span className="font-display text-2xl font-bold text-primary">AssetFlow</span>
        </div>
        <div className="glass rounded-2xl border border-border p-6 shadow-soft">
          <h1 className="font-script text-3xl font-bold text-txt">
            {mode === 'login' ? 'Welcome back!' : mode === 'signup' ? 'Create your account' : 'Reset password'}
          </h1>
          <p className="mt-1 text-sm text-txt-muted">
            {mode === 'signup'
              ? 'Sign up creates an employee account — admin roles are assigned later.'
              : mode === 'forgot' ? 'We’ll email you a link to reset your password.' : 'Sign in to your workspace.'}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === 'signup' && <Input label="Full name" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />}
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="name@company.com" required />
            {mode !== 'forgot' && <PasswordInput label="Password" value={form.password} onChange={set('password')} placeholder="••••••••" required />}
            {err.form && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err.form}</p>}
            <Button type="submit" loading={loading} className="w-full">
              {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'reset password'}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            {mode === 'login' ? (
              <>
                <button className="text-txt-muted hover:text-txt" onClick={() => setMode('forgot')}>Forgot password?</button>
                <button className="text-primary hover:underline" onClick={() => setMode('signup')}>New here? Sign up</button>
              </>
            ) : (
              <button className="text-primary hover:underline" onClick={() => setMode('login')}>← Back to sign in</button>
            )}
          </div>
        </div>

        {/* One-click demo logins */}
        <div className="mt-5">
          <p className="mb-2 text-center text-xs uppercase tracking-wide text-txt-muted">One-click demo login</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button key={d.email} onClick={() => doLogin(d.email, 'Demo@123')} disabled={loading}
                className="rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm hover:border-primary/50 hover:bg-black/[0.05] disabled:opacity-50">
                <span className="font-medium">{d.label}</span>
                <span className="block truncate text-[11px] text-txt-muted">{d.email}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-txt-muted">Password for all demo accounts: <span className="font-mono">Demo@123</span></p>
          <p className="mt-1 text-center text-[11px] text-txt-muted/80">These credentials are for the demo video only — no other purpose.</p>
        </div>
      </motion.div>
    </div>
  );
}
