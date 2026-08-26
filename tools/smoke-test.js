// Simple smoke test script for local dev
const server = process.argv[2] || 'http://127.0.0.1:5000';
const client = process.argv[3] || 'http://127.0.0.1:5173';
const fetch = globalThis.fetch;

async function test() {
  console.log('Testing server health:', server + '/healthz');
  try {
    const res = await fetch(server + '/healthz');
    console.log('Server status', res.status);
    console.log(await res.text());
  } catch (err) {
    console.error('Server error:', err.message);
  }

  console.log('\nTesting client root:', client + '/');
  try {
    const res = await fetch(client + '/');
    console.log('Client status', res.status);
    console.log('Client content-type:', res.headers.get('content-type'));
  } catch (err) {
    console.error('Client error:', err.message);
  }

  // Test login via API if server reachable
  console.log('\nTesting auth login (demo teacher):');
  try {
    const res = await fetch(server + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@examai.com', password: 'Teacher123!' }),
    });
    console.log('Login status', res.status);
    const txt = await res.text();
    console.log(txt);
  } catch (err) {
    console.error('Login error:', err.message);
  }
}

test().catch((e) => { console.error('Smoke test failed:', e.message); process.exit(1); });
