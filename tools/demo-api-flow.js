#!/usr/bin/env node
// Demo API flow: login as demo student, find an exam, start exam, save progress, log warning, submit

const fetch = globalThis.fetch;
const base = process.argv[2] || 'http://127.0.0.1:5000/api';

async function post(url, token, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
}
async function get(url, token) {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
}

(async () => {
  try {
    console.log('Fetching exams...');
    const examsRes = await get(`${base}/exams`);
    console.log('Exams status', examsRes.status);
    const exams = examsRes.data?.data?.exams || examsRes.data?.data || [];
    if (!exams.length) { console.error('No exams found'); return; }
    const exam = exams[0];
    console.log('Using exam:', exam.title || exam._id || exam.id);

    console.log('Logging in as student...');
    const login = await post(`${base}/auth/login`, null, { email: 'student@examai.com', password: 'Student123!' });
    console.log('Login status', login.status);
    if (!login.data?.data?.token) { console.error('Login failed', login.data); return; }
    const token = login.data.data.token;

    console.log('Starting exam...');
    const start = await post(`${base}/responses/exam/${exam._id || exam.id}/start`, token, { deviceInfo: { browser: 'node-fetch', os: 'demo' } });
    console.log('Start status', start.status, start.data?.message || '');
    const response = start.data?.data?.response || start.data?.data;
    if (!response || !response._id) { console.error('Start failed', start); return; }
    const responseId = response._id;

    console.log('Saving progress...');
    const save = await post(`${base}/responses/${responseId}/save`, token, { answers: [{ question: response.answers[0].question, answer: 'Demo answer' }], currentQuestionIndex: 0, timeRemaining: 1000 });
    console.log('Save status', save.status);

    console.log('Logging a warning...');
    const warn = await post(`${base}/responses/${responseId}/warning`, token, { type: 'tab_switch', message: 'Switched tab' });
    console.log('Warning status', warn.status, warn.data?.data || warn.data);

    console.log('Submitting exam...');
    const submit = await post(`${base}/responses/${responseId}/submit`, token, { answers: [] });
    console.log('Submit status', submit.status, submit.data?.message || submit.data);

    console.log('Demo flow complete.');
  } catch (err) {
    console.error('Demo flow error:', err.message);
  }
})();
