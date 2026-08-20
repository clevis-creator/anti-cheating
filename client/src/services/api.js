import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

let examSessionToken = null;

export function setExamSessionToken(token) {
  examSessionToken = token || null;
}

export function clearExamSessionToken() {
  examSessionToken = null;
}

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('examai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (examSessionToken) config.headers['X-Exam-Session'] = examSessionToken;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('examai_token');
        localStorage.removeItem('examai_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  stats: () => api.get('/users/stats'),
  auditLogs: (params) => api.get('/users/audit-logs', { params }),
};

export const coursesAPI = {
  list: (params) => api.get('/courses', { params }),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  enroll: (id, studentIds) => api.post(`/courses/${id}/enroll`, { studentIds }),
  removeStudent: (id, studentId) => api.delete(`/courses/${id}/students/${studentId}`),
  remove: (id) => api.delete(`/courses/${id}`),
};

export const examsAPI = {
  list: (params) => api.get('/exams', { params }),
  get: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  publish: (id) => api.post(`/exams/${id}/publish`),
  duplicate: (id) => api.post(`/exams/${id}/duplicate`),
  remove: (id) => api.delete(`/exams/${id}`),
};

export const questionsAPI = {
  list: (params) => api.get('/questions', { params }),
  get: (id) => api.get(`/questions/${id}`),
  create: (data) => api.post('/questions', data),
  bulk: (data) => api.post('/questions/bulk', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  reorder: (order) => api.put('/questions/reorder', { order }),
  remove: (id) => api.delete(`/questions/${id}`),
  addToBank: (id) => api.post(`/questions/${id}/bank`),
};

export const responsesAPI = {
  start: (examId, deviceInfo, accessCode) =>
    api.post(`/responses/exam/${examId}/start`, { deviceInfo, accessCode }),
  save: (id, data) => api.put(`/responses/${id}/save`, data),
  submit: (id, data) => api.post(`/responses/${id}/submit`, data),
  warning: (id, data) => api.post(`/responses/${id}/warning`, data),
  activity: (id, data) => api.post(`/responses/${id}/activity`, data),
  mediaAccess: (responseId, filename) =>
    api.get(`/responses/${responseId}/media/${encodeURIComponent(filename)}/access`),
  my: () => api.get('/responses/my'),
  get: (id) => api.get(`/responses/${id}`),
  examResponses: (examId) => api.get(`/responses/exam/${examId}`),
  pending: () => api.get('/responses/pending'),
  grade: (id, data) => api.post(`/responses/${id}/grade`, data),
  regradeAI: (id, answerId) => api.post(`/responses/${id}/regrade-ai`, { answerId }),
  overrideAI: (id, data) => api.put(`/responses/ai-grades/${id}/override`, data),
  publishResults: (examId) => api.post(`/responses/exam/${examId}/publish`),
  results: (params) => api.get('/responses/results', { params }),
  result: (id) => api.get(`/responses/results/${id}`),
  certificate: (id) => api.get(`/responses/results/${id}/certificate`),
  teacherStats: () => api.get('/responses/stats/teacher'),
  studentStats: () => api.get('/responses/stats/student'),
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/responses/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  proctoringUpload: (responseId, file, consent = false) => {
    const form = new FormData();
    form.append('file', file);
    form.append('consent', consent ? 'true' : 'false');
    return api.post(`/responses/${responseId}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getAI: () => api.get('/settings/ai'),
  updateAI: (data) => api.put('/settings/ai', data),
};


export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const reportsAPI = {
  analytics: () => api.get('/reports/analytics'),
  examReport: (examId) => api.get(`/reports/exam/${examId}`),
  live: (examId) => api.get(`/reports/live/${examId}`),
  export: (data) => api.post('/reports/export', data),
};

export default api;

export function uploadUrl(path) {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  const base = import.meta.env.VITE_API_URL || '/api';
  if (base.startsWith('http')) {
    const origin = base.replace(/\/api\/?$/i, '');
    return `${origin}${path}`;
  }
  try {
    const host = window.location.hostname || '127.0.0.1';
    return `${window.location.protocol}//${host}:5000${path}`;
  } catch {
    return path;
  }
}

/** Fetch a time-limited signed URL for proctoring media playback. */
export async function getSignedMediaUrl(responseId, filename) {
  const { data } = await responsesAPI.mediaAccess(responseId, filename);
  return data.data.url;
}
