import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '../api/client';
import Modal from './Modal';

export default function AnnouncementModal({ open, onClose, onSent }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await api.sendAnnouncement({ title: title.trim(), message: message.trim() });
      setTitle('');
      setMessage('');
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Send Announcement" wide>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Broadcasts to all active team members — in-app bell and push (if they enabled notifications).
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Title *</label>
          <input
            className="input"
            required
            maxLength={200}
            placeholder="e.g. Office closed tomorrow"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Message *</label>
          <textarea
            className="input"
            required
            rows={4}
            maxLength={2000}
            placeholder="Write your announcement..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? 'Sending...' : 'Send to Everyone'}
        </button>
      </form>
    </Modal>
  );
}
