// Lightweight deployment/runtime verification tool
// Usage: node tools/deploy-verify.js [serverUrl]

const fetch = globalThis.fetch;
const server = process.argv[2] || 'http://127.0.0.1:5000';

(async () => {
  console.log('Checking API health endpoint:', server + '/healthz');
  try {
    const res = await fetch(server + '/healthz');
    console.log('Health status', res.status);
    console.log(await res.text());
  } catch (err) {
    console.error('Health endpoint error:', err.message);
  }

  console.log('\nChecking API metrics endpoint:', server + '/metrics');
  try {
    const res = await fetch(server + '/metrics');
    console.log('Metrics status', res.status);
    if (res.ok) console.log(await res.text());
  } catch (err) {
    console.error('Metrics endpoint error (may be optional):', err.message);
  }

  console.log('\nDeploy verification finished');
})();
