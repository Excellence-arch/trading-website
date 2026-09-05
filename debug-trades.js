const http = require('http');

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function debugTrades() {
  const loginRes = await request('http://localhost:3001/api/auth/login', { method: 'POST' }, {
    email: 'demo@tradingterminal.io',
    password: 'Demo1234!'
  });
  const token = JSON.parse(loginRes.data).token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const tradesRes = await request('http://localhost:3001/api/trades', { headers: authHeaders });
  console.log('tradesRes status:', tradesRes.status);
  console.log('tradesRes body snippet:', tradesRes.data.substring(0, 300));
}

debugTrades();
