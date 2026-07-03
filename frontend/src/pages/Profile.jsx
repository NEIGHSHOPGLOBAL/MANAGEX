import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mail, Moon, Phone, Sun, User, Droplets, Shield, Zap, LogOut, Bug, ImageIcon, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { useProductivity } from '../context/ProductivityContext';
import { useTheme } from '../context/ThemeContext';

function ProfileAvatar({ user, size = 'lg' }) {
  const sizes = { lg: 'w-20 h-20 text-2xl', md: 'w-10 h-10 text-sm' };
  if (user?.profile_photo) {
    return (
      <img
        src={user.profile_photo}
        alt={user.name}
        className={`${sizes[size]} rounded-full object-cover ring-4 ring-blue-50`}
      />
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-[#1a365d] to-[#2563eb] flex items-center justify-center text-white font-semibold ring-4 ring-blue-50`}>
      {user?.name?.charAt(0)}
    </div>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const { prefs, updatePref } = useProductivity();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    phone: user?.phone || '',
    blood_group: user?.blood_group || '',
    emergency_contact: user?.emergency_contact || '',
  });
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugReportType, setBugReportType] = useState('bug');
  const [bugScreenshot, setBugScreenshot] = useState(null);
  const [bugPreview, setBugPreview] = useState(null);
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugMessage, setBugMessage] = useState('');
  const [bugError, setBugError] = useState('');
  const bugFileRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await api.uploadProfilePhoto(file);
      setUser(data.user);
      setMessage('Profile photo updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const updated = await api.updateProfile(profileForm);
      setUser(updated);
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (pwdForm.new_password !== pwdForm.confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      await api.changePassword(pwdForm.current_password, pwdForm.new_password);
      setMessage('Password updated successfully');
      setPwdForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBugScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBugScreenshot(file);
    setBugPreview(URL.createObjectURL(file));
    setBugError('');
  };

  const clearBugScreenshot = () => {
    setBugScreenshot(null);
    if (bugPreview) URL.revokeObjectURL(bugPreview);
    setBugPreview(null);
    if (bugFileRef.current) bugFileRef.current.value = '';
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    setBugMessage('');
    setBugError('');
    if (!bugDescription.trim()) {
      setBugError('Please describe the issue');
      return;
    }
    setBugSubmitting(true);
    try {
      await api.submitBugReport(bugDescription.trim(), bugScreenshot, bugReportType);
      setBugDescription('');
      setBugReportType('bug');
      clearBugScreenshot();
      setBugMessage('Thank you! Your report has been sent to the admin team.');
    } catch (err) {
      setBugError(err.message);
    } finally {
      setBugSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your account details from Attendex</p>
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <ProfileAvatar user={user} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-md hover:bg-[#1d4ed8] transition-colors"
            >
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{user?.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.employee_id}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge bg-blue-50 text-[#2563eb]">{ROLE_LABELS[user?.role]}</span>
              {user?.designation && (
                <span className="badge bg-slate-100 text-slate-600 dark:text-slate-300">{user.designation}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
          {user?.email && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Mail size={15} className="text-slate-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          {user?.department_name && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <User size={15} className="text-slate-400 shrink-0" />
              <span>{user.department_name}</span>
            </div>
          )}
          {user?.manager_name && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Shield size={15} className="text-slate-400 shrink-0" />
              <span>Reports to {user.manager_name}</span>
            </div>
          )}
          {user?.joining_date && (
            <div className="text-slate-600 dark:text-slate-300">Joined: {user.joining_date}</div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Contact & Emergency</h3>
        <form onSubmit={handleProfileSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Phone size={12} /> Phone
            </label>
            <input className="input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Droplets size={12} /> Blood Group
            </label>
            <input className="input" value={profileForm.blood_group} onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })} placeholder="e.g. O+" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Emergency Contact</label>
            <input className="input" value={profileForm.emergency_contact} onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })} />
          </div>
          <button type="submit" className="btn-brand w-full sm:w-auto">Save Profile</button>
        </form>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Moon size={16} className="text-[#2563eb]" /> Appearance
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Choose light or dark mode for the interface</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-[#2563eb] bg-blue-50 dark:bg-blue-950/40 text-[#2563eb]'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sun size={20} />
            <span className="text-sm font-medium">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-[#2563eb] bg-blue-50 dark:bg-blue-950/40 text-[#2563eb]'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Moon size={20} />
            <span className="text-sm font-medium">Dark</span>
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Zap size={16} className="text-[#2563eb]" /> Productivity Settings
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Customize your workspace — all optional</p>
        <div className="space-y-3">
          {[
            { key: 'keyboard_shortcuts', label: 'Keyboard Shortcuts (⌘K, N, A, T, P)' },
            { key: 'compact_ui', label: 'Compact UI Mode' },
            { key: 'dashboard_widgets', label: 'Dashboard Widgets' },
            { key: 'desktop_notifications', label: 'Push Notifications (Firebase)' },
            { key: 'sound_notifications', label: 'Notification Sound (tudun)' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 cursor-pointer">
              <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
              <input
                type="checkbox"
                checked={!!prefs[key]}
                onChange={(e) => updatePref({ [key]: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2">
          <Bug size={16} className="text-[#2563eb]" /> Bug Report / Feature Suggestion
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Report a bug or suggest a new feature. Screenshot is optional. Admins can submit too.
        </p>
        <form onSubmit={handleBugSubmit} className="space-y-3">
          <div className="flex gap-2">
            {[
              { id: 'bug', label: 'Report Bug' },
              { id: 'feature', label: 'Suggest Feature' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBugReportType(t.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                  ${bugReportType === t.id ? 'bg-[#2563eb] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
              {bugReportType === 'feature' ? 'Describe your idea' : 'What went wrong?'}
            </label>
            <textarea
              className="input"
              rows={4}
              placeholder={bugReportType === 'feature' ? 'What feature would help your team?' : 'Describe the issue — what you expected vs what happened...'}
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              maxLength={5000}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
              Screenshot <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            {bugPreview ? (
              <div className="relative inline-block">
                <img src={bugPreview} alt="Screenshot preview" className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700" />
                <button
                  type="button"
                  onClick={clearBugScreenshot}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bugFileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <ImageIcon size={16} />
                Attach screenshot
              </button>
            )}
            <input ref={bugFileRef} type="file" accept="image/*" className="hidden" onChange={handleBugScreenshot} />
          </div>
          {bugMessage && <p className="text-sm text-emerald-600">{bugMessage}</p>}
          {bugError && <p className="text-sm text-red-600">{bugError}</p>}
          <button type="submit" className="btn-brand w-full sm:w-auto" disabled={bugSubmitting}>
            {bugSubmitting ? 'Sending...' : bugReportType === 'feature' ? 'Submit Suggestion' : 'Submit Report'}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <input type="password" className="input" placeholder="Current password" required value={pwdForm.current_password} onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })} />
          <input type="password" className="input" placeholder="New password" required value={pwdForm.new_password} onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })} />
          <input type="password" className="input" placeholder="Confirm new password" required value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-brand w-full">Update Password</button>
        </form>
      </div>

      <div className="card p-5">
        <button
          type="button"
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  );
}
