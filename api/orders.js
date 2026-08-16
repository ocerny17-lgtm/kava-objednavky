// Orders API – Upstash Redis (atomické ukládání, bezpečné při souběhu)
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
const ORDER_IDS = 'coffee:order-ids';
const orderKey = (id) => `coffee:order:${id}`;

async function migrateLegacyOrdersIfNeeded() {
  const existing = await redis.zcard(ORDER_IDS);
  if (existing > 0) return;

  const legacy = await redis.get('orders');
  if (!Array.isArray(legacy) || !legacy.length) return;

  for (const order of legacy) {
    if (order?.id == null) continue;
    await saveOrder(order);
  }
  await redis.del('orders');
}

async function loadAllOrders() {
  await migrateLegacyOrdersIfNeeded();

  const ids = await redis.zrange(ORDER_IDS, 0, -1);
  if (!ids.length) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(orderKey(id));
  const rows = await pipeline.exec();
  return rows.filter(Boolean);
}

async function saveOrder(order) {
  const id = String(order.id);
  const score = Number(order.id) || Date.now();
  await redis.set(orderKey(id), order);
  await redis.zadd(ORDER_IDS, { score, member: id });
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
      const orders = await loadAllOrders();
      const now = new Date();
      const toComplete = [];

      const activeOrders = orders.filter((order) => {
        if (order.status === 'completed') return false;
        if (order.status === 'delivering' && order.deliveringAt) {
          const secondsAgo = (now - new Date(order.deliveringAt)) / 1000;
          if (secondsAgo > 300) {
            toComplete.push({
              ...order,
              status: 'completed',
              completedAt: new Date().toISOString(),
            });
            return false;
          }
        }
        return true;
      });

      for (const order of toComplete) {
        await saveOrder(order);
      }

      return res.status(200).json({ success: true, orders: activeOrders });
    }

    if (action === 'getHistory') {
      const orders = await loadAllOrders();
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
      const { order } = req.body || {};
      if (!order || order.id == null) {
        return res.status(400).json({ success: false, error: 'Chybí data objednávky' });
      }

      // Každá objednávka = vlastní klíč → souběžné create se nepřepisují
      await saveOrder(order);
      return res.status(200).json({ success: true });
    }

    if (action === 'accept') {
      const { orderId, barista } = req.body || {};
      if (!orderId || !barista) {
        return res.status(400).json({
          success: false,
          error: 'Chybí ID objednávky nebo jméno baristy',
        });
      }

      const order = await redis.get(orderKey(orderId));
      if (!order || order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Objednávka nebyla nalezena nebo již byla přijata',
        });
      }

      order.status = 'in-progress';
      order.barista = barista;
      order.acceptedAt = new Date().toISOString();
      await saveOrder(order);
      return res.status(200).json({ success: true });
    }

    if (action === 'deliver') {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const order = await redis.get(orderKey(orderId));
      if (!order) {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena' });
      }

      order.status = 'delivering';
      order.deliveringAt = new Date().toISOString();
      await saveOrder(order);
      return res.status(200).json({ success: true });
    }

    if (action === 'complete') {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const order = await redis.get(orderKey(orderId));
      if (!order) {
        return res.status(400).json({ success: false, error: 'Objednávka nebyla nalezena' });
      }

      order.status = 'completed';
      order.completedAt = new Date().toISOString();
      await saveOrder(order);
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Chybí ID objednávky' });
      }

      const order = await redis.get(orderKey(orderId));
      if (order) {
        order.status = 'completed';
        order.completedAt = new Date().toISOString();
        await saveOrder(order);
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
