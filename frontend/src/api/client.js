const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (employee_id, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ employee_id, password }) }),
  me: () => request('/auth/me'),
  changePassword: (current_password, new_password) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  updateProfile: (data) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  uploadProfilePhoto: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return request('/auth/profile-photo', { method: 'POST', body: form, headers: {} });
  },

  getUsers: () => request('/users'),
  getUser: (id) => request(`/users/${id}`),
  getDepartments: () => request('/users/departments'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetPassword: (id, password) => request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  uploadUserPhoto: (id, file) => {
    const form = new FormData();
    form.append('photo', file);
    return request(`/users/${id}/profile-photo`, { method: 'POST', body: form, headers: {} });
  },
  getAssignableUsers: () => request('/users/assignable'),

  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTaskStatus: (id, data) => request(`/tasks/${id}/status`, { method: 'POST', body: JSON.stringify(data) }),
  verifyTask: (id, approved) => request(`/tasks/${id}/verify`, { method: 'POST', body: JSON.stringify({ approved }) }),
  reopenTask: (id) => request(`/tasks/${id}/reopen`, { method: 'POST' }),
  addComment: (id, text) => request(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  addChecklist: (id, text) => request(`/tasks/${id}/checklist`, { method: 'POST', body: JSON.stringify({ text }) }),
  toggleChecklist: (id, data) => request(`/tasks/checklist/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadAttachment: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/tasks/${id}/attachments`, { method: 'POST', body: form, headers: {} });
  },

  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getDashboard: () => request('/dashboard/stats'),
  getCalendar: (year, month) => request(`/dashboard/calendar?year=${year}&month=${month}`),

  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  getStorage: () => request('/storage/usage'),
  deleteFile: (id) => request(`/storage/files/${id}`, { method: 'DELETE' }),

  getPreferences: () => request('/productivity/preferences'),
  updatePreferences: (data) => request('/productivity/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  getNotes: (q) => request(`/productivity/notes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createNote: (data) => request('/productivity/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/productivity/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/productivity/notes/${id}`, { method: 'DELETE' }),

  submitBugReport: (description, screenshot, reportType = 'bug') => {
    const form = new FormData();
    form.append('description', description);
    form.append('report_type', reportType);
    if (screenshot) form.append('screenshot', screenshot);
    return request('/bug-reports', { method: 'POST', body: form, headers: {} });
  },
  getBugReports: () => request('/bug-reports'),
  updateBugReport: (id, data) => request(`/bug-reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getMeetings: (upcomingOnly = true) =>
    request(`/meetings${upcomingOnly ? '?upcoming=1' : ''}`),
  getMeeting: (id) => request(`/meetings/${id}`),
  createMeeting: (data) => request('/meetings', { method: 'POST', body: JSON.stringify(data) }),
  updateMeeting: (id, data) => request(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMeeting: (id) => request(`/meetings/${id}`, { method: 'DELETE' }),

  registerDeviceToken: (token) =>
    request('/notifications/device-token', { method: 'POST', body: JSON.stringify({ token, platform: 'web' }) }),
  unregisterDeviceToken: (token) =>
    request('/notifications/device-token', { method: 'DELETE', body: JSON.stringify(token ? { token } : {}) }),
  getFirebaseConfig: () => request('/notifications/firebase-config'),
  sendAnnouncement: (data) =>
    request('/notifications/announcements', { method: 'POST', body: JSON.stringify(data) }),
};
