// Vercel Serverless Function — category vote API (Upstash Redis)
//   GET  /api/vote                         → per-category tally { counts:{PROD:..}, total }
//   POST /api/vote { category }            → +1 for that category
//   POST /api/vote { action:'reset', pin }  → reset votes (pin='salesforce')
import { Redis } from '@upstash/redis';

const KEY = 'sar:votes';               // hash: field=category, value=count
const RESET_PIN = process.env.RESET_PIN || 'salesforce';
const ALLOWED_CAT = ['PROD','COL','SALES','MKT','DA','DF'];

const REST_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = (REST_URL && REST_TOKEN) ? new Redis({ url: REST_URL, token: REST_TOKEN }) : null;

function clip(s, max){ return String(s == null ? '' : s).replace(/[\x00-\x1f]/g,'').trim().slice(0, max); }

function emptyCounts(){ const c = {}; ALLOWED_CAT.forEach(k => c[k] = 0); return c; }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!redis) {
    if (req.method === 'GET') return res.status(200).json({ ok: false, kv: false, counts: emptyCounts(), total: 0 });
    return res.status(200).json({ ok: false, kv: false, error: 'KV_NOT_CONFIGURED' });
  }

  try {
    if (req.method === 'GET') {
      const raw = (await redis.hgetall(KEY)) || {};
      const counts = emptyCounts();
      let total = 0;
      for (const k of ALLOWED_CAT) { const n = Number(raw[k]) || 0; counts[k] = n; total += n; }
      return res.status(200).json({ ok: true, kv: true, counts, total });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      if (body.action === 'reset') {
        if (clip(body.pin, 40) !== RESET_PIN) return res.status(403).json({ ok: false, error: 'BAD_PIN' });
        await redis.del(KEY);
        return res.status(200).json({ ok: true, reset: true });
      }

      const cat = clip(body.category, 12);
      if (!ALLOWED_CAT.includes(cat)) return res.status(400).json({ ok: false, error: 'BAD_CATEGORY' });
      await redis.hincrby(KEY, cat, 1);
      return res.status(200).json({ ok: true, kv: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
}
