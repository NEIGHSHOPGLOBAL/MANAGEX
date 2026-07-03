import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import LoadingScreen from '../components/LoadingScreen';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { user, loading, login } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingScreen message="Preparing sign in..." />;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(employeeId, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a365d] via-[#2563eb] to-[#06b6d4] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white dark:bg-slate-900/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white dark:bg-slate-900/10 blur-3xl" />
        </div>
        <div className="relative animate-fade-in">
          <Logo size={56} showText className="[&_span]:text-white" />
        </div>
        <div className="relative space-y-4 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Plan. Assign.<br />Deliver.
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            A modern team planner for task management, project tracking, and seamless collaboration.
          </p>
        </div>
        <p className="relative text-blue-200/60 text-sm">© 2026 ManageX. All rights reserved.</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f4f6f9]">
        <div className="w-full max-w-md animate-scale-in">
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size={64} showText />
          </div>

          <div className="card p-8 shadow-lg shadow-slate-200/50">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome back</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in with your Employee ID</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Employee ID</label>
                <input
                  className="input"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP001"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl animate-fade-in">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-brand w-full py-3 text-sm font-semibold disabled:opacity-60 relative overflow-hidden"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Team login</p>
              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <p><span className="font-mono text-slate-700 dark:text-slate-200">AX001</span> / AX001</p>
                <p><span className="font-mono text-slate-700 dark:text-slate-200">AX005</span> / AX005</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
