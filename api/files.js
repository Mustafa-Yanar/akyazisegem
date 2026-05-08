// Vercel Serverless Function — GitHub Contents API'dan dosya okur
// Tek endpoint: hem GET (oku) hem PUT (yaz) destekler
import jwt from 'jsonwebtoken';

const REPO_OWNER = 'Mustafa-Yanar';
const REPO_NAME = 'akyazisegem';
const REPO_BRANCH = 'main';

function verifyAuth(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Yetki yok');
  jwt.verify(token, process.env.JWT_SECRET);
}

export default async function handler(req, res) {
  try {
    verifyAuth(req);
  } catch {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'PUT') {
    return handlePut(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  const path = req.query?.path;
  if (!path) return res.status(400).json({ error: 'Dosya yolu gerekli' });

  // Güvenlik: sadece izin verilen dosyalar okunabilir
  const allowedFiles = ['gallery.json', 'achievements.json', 'config.json'];
  if (!allowedFiles.includes(path)) {
    return res.status(403).json({ error: 'Bu dosyaya erişim izni yok' });
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`;

  try {
    const r = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'akyazisegem-admin'
      }
    });

    if (r.status === 404) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'GitHub hatası: ' + text });
    }

    const data = await r.json();
    // GitHub base64 encoded content döner; client tarafında decode edilecek
    return res.status(200).json({
      sha: data.sha,
      content: data.content,
      encoding: data.encoding
    });
  } catch (e) {
    return res.status(500).json({ error: 'Sunucu hatası: ' + e.message });
  }
}

async function handlePut(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { path, content, sha, message } = body || {};

  if (!path || !content) {
    return res.status(400).json({ error: 'Eksik veri' });
  }

  // Güvenlik: sadece izin verilen dosyalar yazılabilir
  const allowedFiles = ['gallery.json', 'achievements.json', 'config.json'];
  if (!allowedFiles.includes(path)) {
    return res.status(403).json({ error: 'Bu dosyaya yazma izni yok' });
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

  try {
    const r = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'akyazisegem-admin'
      },
      body: JSON.stringify({
        message: message || 'Admin paneli üzerinden güncellendi',
        content: content, // base64 encoded — client tarafından
        sha: sha || undefined,
        branch: REPO_BRANCH
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'GitHub yazma hatası: ' + text });
    }

    const data = await r.json();
    return res.status(200).json({ sha: data.content.sha });
  } catch (e) {
    return res.status(500).json({ error: 'Sunucu hatası: ' + e.message });
  }
}
