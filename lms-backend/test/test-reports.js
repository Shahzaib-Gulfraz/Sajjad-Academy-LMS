const base = 'http://localhost:3000/api/v1';
const email = `reports.smoke.${Date.now()}@example.com`;
const password = 'Passw0rd!123';

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

(async () => {
  // Register as admin
  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Reports Smoke',
      email,
      password,
      role: 'ADMIN',
      adminRegistrationKey: 'test-admin-key',
    }),
  });

  const token = reg.json?.data?.accessToken;
  if (!token) {
    console.log('REGISTER_STATUS=' + reg.status);
    console.log('REGISTER_ERROR=' + (reg.text || 'No response'));
    process.exit(1);
  }

  const overview = await request('/reports/overview', {
    method: 'GET',