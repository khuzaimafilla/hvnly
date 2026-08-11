import midtransClient from 'midtrans-client';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { items, customer, total } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const orderId = `HVN-${Date.now().toString().slice(-6)}`;
    const orderPayload = {
      orderId,
      name: customer?.name || 'Pelanggan',
      phone: customer?.phone || '',
      gmaps: customer?.gmaps || '',
      notes: customer?.notes || '-',
      items,
      total: Math.round(Number(total)),
      status: 'PAID',
      timestamp: new Date().toISOString()
    };

    const tokenString = Buffer.from(JSON.stringify(orderPayload)).toString('base64url');

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      const mockSnapToken = `MOCK-SNAP-${Date.now()}`;
      return res.status(200).json({
        token: mockSnapToken,
        order_token: tokenString,
        mock: true
      });
    }

    const snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: serverKey,
      clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
    });

    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: Math.round(Number(total)) },
      customer_details: { first_name: customer?.name || 'Pelanggan', phone: customer?.phone || '' }
    };

    const transaction = await snap.createTransaction(parameter);
    return res.status(200).json({
      token: transaction.token,
      order_id: orderId,
      order_token: tokenString,
      mock: false
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
