import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token } = req.query || {};
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token parameter is required' });
  }

  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);

    if (payload && payload.orderId && payload.status === 'PAID') {
      return res.status(200).json({ valid: true, payload });
    }

    return res.status(200).json({ valid: false, error: 'Invalid order token structure' });
  } catch (err) {
    return res.status(200).json({ valid: false, error: err.message });
  }
}
