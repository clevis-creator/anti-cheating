import clsx from 'clsx';

export const cn = (...args) => clsx(args);

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const questionTypeLabel = (type) =>
  ({
    multiple_choice: 'Multiple Choice',
    checkbox: 'Checkbox',
    true_false: 'True / False',
    short_answer: 'Short Answer',
    essay: 'Essay',
    fill_blank: 'Fill in the Blank',
    matching: 'Matching',
    dropdown: 'Dropdown',
    image: 'Image Question',
    video: 'Video Question',
    file_upload: 'File Upload',
  })[type] || type;

export const getErrorMessage = (err) => {
  if (!err?.response) {
    return 'Cannot reach the API server. Start the backend with npm run dev:server and ensure MongoDB is running on port 27017.';
  }
  const data = err.response.data;
  if (data?.errors?.length) {
    return data.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
  }
  return data?.message || err.message || 'Something went wrong';
};

export const roleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/student';
};
