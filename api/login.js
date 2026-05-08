// Vercel Serverless Function — Login
// Müdür şifre girer, eşleşirse 7 günlük JWT token döner
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminPassword || !jwtSecret) {
    return res.status(500).json({ error: 'Sunucu yapılandırma hatası' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const password = body?.password || '';

  if (!password) {
    return res.status(400).json({ error: 'Şifre gerekli' });
  }

  if (password !== adminPassword) {
    // Brute force'a karşı küçük bir gecikme
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Yanlış şifre' });
  }

  const token = jwt.sign({ admin: true }, jwtSecret, { expiresIn: '7d' });

  return res.status(200).json({ token });
}
