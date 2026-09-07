// Vercel Serverless Function — per-category product screenshot store (Upstash Redis)
//   GET  /api/images                                   → { ok, kv, images:{PROD:dataURL|null, ...} }
//   POST /api/images {action:'save', pin, cat, image}  → save one category's image (dataURL)
//   POST /api/images {action:'delete', pin, cat}       → delete one category's image
//
// Images are stored as base64 data URLs, one key per category (sar:img:CAT).
// The browser resizes/compresses before upload, keeping the request within Upstash's limit (1MB).
import { Redis } from '@upstash/redis';

const EDIT_PIN = process.env.RESET_PIN || 'salesforce';
const REST_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = (REST_URL && REST_TOKEN) ? new Redis({ url: REST_URL, token: REST_TOKEN }) : null;

const ALLOWED_CAT = ['PROD', 'COL', 'SALES', 'MKT', 'DA', 'DF'];
const KEY = (cat) => 'sar:img:' + cat;
// max data URL length (~1.4MB) — reject if it still exceeds this after compression
const MAX_LEN = 1400000;

function clip(s, max) {
  return String(s == null ? '' : s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim().slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const images = {};
      ALLOWED_CAT.forEach((c) => { images[c] = null; });
      if (redis) {
        const vals = await redis.mget(...ALLOWED_CAT.map(KEY));
        ALLOWED_CAT.forEach((c, i) => { images[c] = vals[i] || null; });
      }
      return res.status(200).json({ ok: true, kv: !!redis, images });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (clip(body.pin, 40) !== EDIT_PIN) return res.status(403).json({ ok: false, error: 'BAD_PIN' });
      if (!redis) return res.status(200).json({ ok: false, kv: false, error: 'KV_NOT_CONFIGURED' });

      const cat = ALLOWED_CAT.includes(body.cat) ? body.cat : null;
      if (!cat) return res.status(400).json({ ok: false, error: 'BAD_CAT' });

      if (body.action === 'delete') {
        await redis.del(KEY(cat));
        return res.status(200).json({ ok: true, deleted: true, cat });
      }

      if (body.action === 'save') {
        const img = String(body.image || '');
        if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(img)) {
          return res.status(400).json({ ok: false, error: 'BAD_IMAGE' });
        }
        if (img.length > MAX_LEN) {
          return res.status(413).json({ ok: false, error: 'IMAGE_TOO_LARGE' });
        }
        await redis.set(KEY(cat), img);
        return res.status(200).json({ ok: true, saved: true, cat, bytes: img.length });
      }

      return res.status(400).json({ ok: false, error: 'BAD_ACTION' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
}
