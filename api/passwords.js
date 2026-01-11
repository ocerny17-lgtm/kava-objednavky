// Vercel Serverless Function for password management
// Using simple in-memory storage (for production, use Vercel KV or database)
let passwordsStorage = {
  'Josef': {
    password: '1429', // Initial password
    mustChange: true  // Must change password on first login
  },
  'Týna': {
    password: '1429', // Initial password
    mustChange: true  // Must change password on first login
  },
  'Sunny': {
    password: '1711',
    mustChange: false
  },
  'Ondrej': {
    password: '1711',
    mustChange: false
  },
  'Anet': {
    password: 'Sunny',
    mustChange: false
  }
};

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
    if (action === 'check') {
      // Check password
      const { name, password } = req.body;
      
      if (!name || !password) {
        return res.status(400).json({ success: false, error: 'Chybí jméno nebo heslo' });
      }

      const user = passwordsStorage[name];
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'Uživatel nenalezen' });
      }

      if (user.password !== password) {
        return res.status(401).json({ success: false, error: 'Nesprávné heslo' });
      }

      return res.status(200).json({ 
        success: true, 
        mustChangePassword: user.mustChange 
      });
    }

    if (action === 'change') {
      // Change password
      const { name, oldPassword, newPassword } = req.body;
      
      if (!name || !oldPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Chybí potřebná data' });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'Heslo musí mít alespoň 4 znaky' });
      }

      const user = passwordsStorage[name];
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'Uživatel nenalezen' });
      }

      if (user.password !== oldPassword) {
        return res.status(401).json({ success: false, error: 'Nesprávné aktuální heslo' });
      }

      // Update password
      passwordsStorage[name].password = newPassword;
      passwordsStorage[name].mustChange = false;

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Neznámá akce' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}

