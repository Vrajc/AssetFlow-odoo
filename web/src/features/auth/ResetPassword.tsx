import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import { api, apiError } from '../../api/client';
import { Button, Input } from '../../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setErr('Password must be at least 6 characters');
    if (password !== confirm) return setErr('Passwords do not match');
    setLoading(true); setErr('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Password updated — you can sign in now');
      setTimeout(() => nav('/login'), 1800);
    } catch (e) {
      setErr(apiError(e).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <div className="aurora" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-bg font-display text-xl font-bold">A</div>
          <span className="font-display text-2xl font-bold">AssetFlow</span>
        </div>
        <div className="glass rounded-2xl border border-border p-6 shadow-soft">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-primary" />
              <h1 className="font-display text-xl font-semibold">Password updated</h1>
              <p className="text-sm text-txt-muted">Redirecting you to sign in…</p>
            </div>
          ) : !token ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-semibold">Invalid reset link</h1>
              <p className="mt-2 text-sm text-txt-muted">This link is missing a token. Request a new one from the sign-in screen.</p>
              <Link to="/login" className="mt-4 inline-block text-primary hover:underline">← Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold">Choose a new password</h1>
              <p className="mt-1 text-sm text-txt-muted">Enter a new password for your account.</p>
              <form onSubmit={submit} className="mt-5 space-y-3">
                <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
                {err && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
                <Button type="submit" loading={loading} className="w-full">Update password</Button>
              </form>
              <Link to="/login" className="mt-4 inline-block text-sm text-txt-muted hover:text-txt">← Back to sign in</Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
