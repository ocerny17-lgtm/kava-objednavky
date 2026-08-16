// Orders API – Upstash Redis (náhrada zrušeného Vercel KV)
import { Redis } from '@upstash/redis';

function createRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Redis není nastavený. Ve Vercelu připoj Storage (Upstash Redis) k projektu a udělej Redeploy.'
    );
  }
  return new Redis({ url, token });
}

const redis = createRedis();
const ORDERS_KEY = 'orders';

async function getOrders() {
  const orders = await redis.get(ORDERS_KEY);
  return Array.isArray(orders) ? orders : [];
}

async function saveOrders(orders) {
  await redis.set(ORDERS_KEY, orders);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.method === 'GET' ? req.query.action : req.body?.action;

  try {
    if (action === 'get') {
      const orders = await getOrders();
      const now = new Date();

      // Zákazníci vidí objednávky ještě 5 minut po označení jako odnášené
      const activeOrders = orders.filter((order) => {
        if (order.status === 'completed') return false;
        if (order.status === 'delivering' && order.deliveringAt) {
          const deliveringTime = new Date(order.deliveringAt);
          const secondsAgo = (now - deliveringTime) / 1000;
          if (secondsAgo > 300) {
            order.status = 'completed';
            order.completedAt = new Date().toISOString();
            return false;
          }
        }
        return true;
      });

      let needsUpdate = false;
      const cleanedOrders = orders.map((order) => {
        if (order.status === 'delivering' && order.deliveringAt) {
          const deliveringTime = new Date(order.deliveringAt);
          const secondsAgo = (now - deliveringTime) / 1000;
          if (secondsAgo > 300) {
            needsUpdate = true;
            return {
              ...order,
              status: 'completed',
              completedAt: new Date().toISOString(),
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
      const orders = await getOrders();
      const completedOrders = orders
        .filter((order) => order.status === 'completed')
        .sort((a, b) => {
          const timeA = new Date(a.completedAt || a.deliveringAt || a.timestamp);
          const timeB = new Date(b.completedAt || b.deliveringAt || b.timestamp);
          return timeB - timeA;
        })
        .slice(0, 50);

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
        return res.status(400).json({
          success: false,
          error: 'Chybí ID objednávky nebo jméno baristy',
        });
      }

      const orders = await getOrders();
      const orderIndex = orders.findIndex((o) => o.id == orderId);

      if (orderIndex === -1 || orders[orderIndex].status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Objednávka nebyla nalezena nebo již byla přijata',
        });
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
      const orderIndex = orders.findIndex((o) => o.id == orderId);

      if (orderIndex === -1) {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena' });
      }

      orders[orderIndex].status = 'delivering';
      orders[orderIndex].deliveringAt = new Date().toISOString();

      await saveOrders(orders);
      return res.status(200).json({ success: true });
    }

    if (action === 'complete') {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const orders = await getOrders();
      const orderIndex = orders.findIndex((o) => o.id == orderId);

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
      const orderIndex = orders.findIndex((o) => o.id == orderId);

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
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message,
    });
  }
}
