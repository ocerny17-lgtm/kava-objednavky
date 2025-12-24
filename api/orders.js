// Vercel Serverless Function for orders API
// Using simple in-memory storage (for production, use Vercel KV or database)
let ordersStorage = [];

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
      // Get all orders
      const orders = ordersStorage || [];
      const now = new Date();
      
      // Filter out completed orders and delivering orders older than 30 seconds
      const activeOrders = orders.filter(order => {
        if (order.status === 'completed') return false;
        if (order.status === 'delivering' && order.deliveringAt) {
          const deliveringTime = new Date(order.deliveringAt);
          const secondsAgo = (now - deliveringTime) / 1000;
          if (secondsAgo > 30) {
            // Remove this order
            return false;
          }
        }
        return true;
      });
      
      // Clean up delivering orders older than 30 seconds
      ordersStorage = ordersStorage.filter(order => {
        if (order.status === 'delivering' && order.deliveringAt) {
          const deliveringTime = new Date(order.deliveringAt);
          const secondsAgo = (now - deliveringTime) / 1000;
          return secondsAgo <= 30;
        }
        return true;
      });
      
      return res.status(200).json({ success: true, orders: activeOrders });
    }

    if (action === 'create') {
      const { order } = req.body;
      if (!order) {
        return res.status(400).json({ success: false, error: 'Chybí data objednávky' });
      }

      ordersStorage.push(order);
      
      return res.status(200).json({ success: true });
    }

    if (action === 'accept') {
      const { orderId, barista } = req.body;
      
      if (!orderId || !barista) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky nebo jméno baristy' });
      }

      const orderIndex = ordersStorage.findIndex(o => o.id == orderId);
      
      if (orderIndex === -1 || ordersStorage[orderIndex].status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena nebo již byla přijata' });
      }

      ordersStorage[orderIndex].status = 'in-progress';
      ordersStorage[orderIndex].barista = barista;
      ordersStorage[orderIndex].acceptedAt = new Date().toISOString();
      
      return res.status(200).json({ success: true });
    }

    if (action === 'deliver') {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const orderIndex = ordersStorage.findIndex(o => o.id == orderId);
      
      if (orderIndex === -1) {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena' });
      }

      ordersStorage[orderIndex].status = 'delivering';
      ordersStorage[orderIndex].deliveringAt = new Date().toISOString();
      
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      ordersStorage = ordersStorage.filter(o => o.id != orderId);
      
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Neznámá akce' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}

