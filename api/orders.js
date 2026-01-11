// Vercel Serverless Function for orders API
// Using Vercel KV for persistent storage (or fallback to in-memory)
// Install @vercel/kv: npm install @vercel/kv
// Setup Vercel KV in Vercel dashboard under Storage

// Fallback in-memory storage (only used if KV is not available)
let ordersStorage = [];
let kvInstance = null;
let kvChecked = false;

// Helper function to get KV instance
async function getKV() {
  if (kvChecked) {
    return kvInstance;
  }
  
  kvChecked = true;
  try {
    const kvModule = await import('@vercel/kv');
    kvInstance = kvModule.kv;
    console.log('Using Vercel KV for persistent storage');
    return kvInstance;
  } catch (e) {
    // KV not available, will use in-memory storage
    console.log('Vercel KV not available, using in-memory storage (data may be lost)');
    kvInstance = null;
    return null;
  }
}

// Helper function to get orders
async function getOrders() {
  const kv = await getKV();
  if (kv) {
    try {
      const orders = await kv.get('orders');
      return orders || [];
    } catch (error) {
      console.error('Error reading from KV, falling back to memory:', error);
      return ordersStorage;
    }
  }
  return ordersStorage;
}

// Helper function to save orders
async function saveOrders(orders) {
  const kv = await getKV();
  if (kv) {
    try {
      await kv.set('orders', orders);
      return true;
    } catch (error) {
      console.error('Error saving to KV, falling back to memory:', error);
      ordersStorage = orders;
      return false;
    }
  }
  ordersStorage = orders;
  return true;
}

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
      const orders = await getOrders();
      const now = new Date();
      
      // Filter out completed orders and delivering orders older than 5 minutes (300 seconds)
      // Zákazníci vidí objednávky ještě 5 minut po označení jako odnášené
      const activeOrders = orders.filter(order => {
        if (order.status === 'completed') return false;
        if (order.status === 'delivering' && order.deliveringAt) {
          const deliveringTime = new Date(order.deliveringAt);
          const secondsAgo = (now - deliveringTime) / 1000;
          if (secondsAgo > 300) { // 5 minut = 300 sekund
            // Automaticky označit jako completed po 5 minutách
            order.status = 'completed';
            order.completedAt = new Date().toISOString();
            return false;
          }
        }
        return true;
      });
      
      // Automaticky označit delivering orders starší než 5 minut jako completed
      let needsUpdate = false;
      const cleanedOrders = orders.map(order => {
        if (order.status === 'delivering' && order.deliveringAt) {
          const deliveringTime = new Date(order.deliveringAt);
          const secondsAgo = (now - deliveringTime) / 1000;
          if (secondsAgo > 300) {
            needsUpdate = true;
            return {
              ...order,
              status: 'completed',
              completedAt: new Date().toISOString()
            };
          }
        }
        return order;
      });
      
      if (needsUpdate) {
        await saveOrders(cleanedOrders);
      }
      
      return res.status(200).json({ success: true, orders: activeOrders });
    }

    if (action === 'getHistory') {
      // Get history of completed orders for baristas
      const orders = await getOrders();
      const completedOrders = orders.filter(order => order.status === 'completed')
        .sort((a, b) => {
          const timeA = new Date(a.completedAt || a.deliveringAt || a.timestamp);
          const timeB = new Date(b.completedAt || b.deliveringAt || b.timestamp);
          return timeB - timeA; // Newest first
        })
        .slice(0, 50); // Limit to last 50 orders
      
      return res.status(200).json({ success: true, orders: completedOrders });
    }

    if (action === 'create') {
      const { order } = req.body;
      if (!order) {
        return res.status(400).json({ success: false, error: 'Chybí data objednávky' });
      }

      const orders = await getOrders();
      orders.push(order);
      await saveOrders(orders);
      
      return res.status(200).json({ success: true });
    }

    if (action === 'accept') {
      const { orderId, barista } = req.body;
      
      if (!orderId || !barista) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky nebo jméno baristy' });
      }

      const orders = await getOrders();
      const orderIndex = orders.findIndex(o => o.id == orderId);
      
      if (orderIndex === -1 || orders[orderIndex].status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena nebo již byla přijata' });
      }

      orders[orderIndex].status = 'in-progress';
      orders[orderIndex].barista = barista;
      orders[orderIndex].acceptedAt = new Date().toISOString();
      
      await saveOrders(orders);
      return res.status(200).json({ success: true });
    }

    if (action === 'deliver') {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const orders = await getOrders();
      const orderIndex = orders.findIndex(o => o.id == orderId);
      
      if (orderIndex === -1) {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena' });
      }

      orders[orderIndex].status = 'delivering';
      orders[orderIndex].deliveringAt = new Date().toISOString();
      
      await saveOrders(orders);
      return res.status(200).json({ success: true });
    }

    if (action === 'complete') {
      // Manually mark order as completed (for barista history management)
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const orders = await getOrders();
      const orderIndex = orders.findIndex(o => o.id == orderId);
      
      if (orderIndex === -1) {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena' });
      }

      orders[orderIndex].status = 'completed';
      orders[orderIndex].completedAt = new Date().toISOString();
      
      await saveOrders(orders);
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const orders = await getOrders();
      // Instead of deleting, mark as completed to preserve history
      const orderIndex = orders.findIndex(o => o.id == orderId);
      
      if (orderIndex !== -1) {
        orders[orderIndex].status = 'completed';
        orders[orderIndex].completedAt = new Date().toISOString();
        await saveOrders(orders);
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Neznámá akce' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}
