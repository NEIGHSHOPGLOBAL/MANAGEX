import { useState } from 'react';
import { api } from '../../api/client';
import Modal from '../Modal';

export default function QuickNoteModal({ open, onClose }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      await api.createNote({ content: content.trim() });
      setContent('');
      setMessage('Note saved');
      setTimeout(() => { setMessage(''); onClose(); }, 600);
    } catch (err) {
      setMessage(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setMessage('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Quick Note">
      <form onSubmit={handleSave} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Jot down an idea..."
          className="input min-h-[140px] resize-y"
          autoFocus
        />
        {message && (
          <p className={`text-sm ${message.includes('saved') ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={handleClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving || !content.trim()} className="btn-brand flex-1">
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
