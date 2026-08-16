// Passwords API – Upstash Redis
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const PASSWORDS_KEY = 'passwords';

const DEFAULT_PASSWORDS = {
  Josef: {
    password: '1429',
    mustChange: true,
  },
  Týna: {
    password: '1429',
    mustChange: true,
  },
  Sunny: {
    password: '1711',
    mustChange: false,
  },
  Ondrej: {
    password: '1711',
    mustChange: false,
  },
  Anet: {
    password: 'Sunny',
    mustChange: false,
  },
};

async function getPasswords() {
  const stored = await redis.get(PASSWORDS_KEY);
  if (stored && typeof stored === 'object') {
    return stored;
  }
  await redis.set(PASSWORDS_KEY, DEFAULT_PASSWORDS);
  return { ...DEFAULT_PASSWORDS };
}

async function savePasswords(passwords) {
  await redis.set(PASSWORDS_KEY, passwords);
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
    if (action === 'check') {
      const { name, password } = req.body || {};

      if (!name || !password) {
        return res.status(400).json({ success: false, error: 'Chybí jméno nebo heslo' });
      }

      const passwords = await getPasswords();
      const user = passwords[name];

      if (!user) {
        return res.status(401).json({ success: false, error: 'Uživatel nenalezen' });
      }

      if (user.password !== password) {
        return res.status(401).json({ success: false, error: 'Nesprávné heslo' });
      }

      return res.status(200).json({
        success: true,
        mustChangePassword: user.mustChange,
      });
    }

    if (action === 'change') {
      const { name, oldPassword, newPassword } = req.body || {};

      if (!name || !oldPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Chybí potřebná data' });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Heslo musí mít alespoň 4 znaky',
        });
      }

      const passwords = await getPasswords();
      const user = passwords[name];

      if (!user) {
        return res.status(401).json({ success: false, error: 'Uživatel nenalezen' });
      }

      if (user.password !== oldPassword) {
        return res.status(401).json({
          success: false,
          error: 'Nesprávné aktuální heslo',
        });
      }

      passwords[name].password = newPassword;
      passwords[name].mustChange = false;
      await savePasswords(passwords);

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
