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
  // No HTTP response usually means a network, CORS, timeout,
  // connection, or browser-side request failure.
  if (!err?.response) {
    if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
      return 'The request timed out. Please check your internet connection and try again.';
    }

    if (
      err?.code === 'ERR_NETWORK' ||
      err?.message === 'Network Error' ||
      err?.message?.toLowerCase().includes('network error')
    ) {
      return 'Unable to connect to the ExamAI server. Please check your internet connection and try again.';
    }

    return err?.message || 'Unable to connect to the server. Please try again.';
  }

  const data = err.response.data;

  if (err.response.status === 401) {
    return data?.message || 'Your session has expired. Please sign in again.';
  }

  if (err.response.status === 403) {
    return data?.message || 'You do not have permission to perform this action.';
  }

  if (err.response.status >= 500) {
    return data?.message || 'The server could not complete that request. Please try again later.';
  }

  if (data?.errors?.length) {
    return data.errors
      .map((e) => `${e.field}: ${e.message}`)
      .join('; ');
  }

  return data?.message || err?.message || 'Something went wrong. Please try again.';
};


export const roleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/student';
};
