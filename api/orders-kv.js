// Vercel Serverless Function for orders API with Vercel KV
// To use this version, rename this file to orders.js and install @vercel/kv
// npm install @vercel/kv
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get action from query (GET) or body (POST)
  const action = req.method === 'GET' ? req.query.action : req.body?.action;

  try {
    if (action === 'get') {
      // Get all orders from KV
      const orders = await kv.get('orders') || [];
      // Filter out completed orders
      const activeOrders = orders.filter(order => order.status !== 'completed');
      return res.status(200).json({ success: true, orders: activeOrders });
    }

    if (action === 'create') {
      const { order } = req.body;
      if (!order) {
        return res.status(400).json({ success: false, error: 'Chybí data objednávky' });
      }

      const orders = await kv.get('orders') || [];
      orders.push(order);
      await kv.set('orders', orders);
      
      return res.status(200).json({ success: true });
    }

    if (action === 'accept') {
      const { orderId, barista } = req.body;
      
      if (!orderId || !barista) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky nebo jméno baristy' });
      }

      const orders = await kv.get('orders') || [];
      const orderIndex = orders.findIndex(o => o.id == orderId);
      
      if (orderIndex === -1 || orders[orderIndex].status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena nebo již byla přijata' });
      }

      orders[orderIndex].status = 'in-progress';
      orders[orderIndex].barista = barista;
      orders[orderIndex].acceptedAt = new Date().toISOString();
      
      await kv.set('orders', orders);
      return res.status(200).json({ success: true });
    }

    if (action === 'complete') {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const orders = await kv.get('orders') || [];
      const filteredOrders = orders.filter(o => o.id != orderId);
      
      await kv.set('orders', filteredOrders);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Neznámá akce' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}

