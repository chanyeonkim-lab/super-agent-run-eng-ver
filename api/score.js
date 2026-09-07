// Vercel Serverless Function — leaderboard API (Upstash Redis)
//   GET  /api/score             → top rankings + stats
//   POST /api/score             → { name, id, coins } submit a score (keeps each player's personal best only)
//   POST /api/score {action:'reset', pin} → reset the leaderboard (pin required)
//
// When you connect Redis (Upstash) via Vercel Storage, either KV_REST_API_* or UPSTASH_REDIS_REST_*
// env vars are injected. We check both so it works regardless of which names are present.
import { Redis } from '@upstash/redis';

const BOARD = 'sar:board';        // sorted set: member=`name::id`, score=coins
const RESET_PIN = process.env.RESET_PIN || 'salesforce';
const SEP = '::';

const REST_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = (REST_URL && REST_TOKEN) ? new Redis({ url: REST_URL, token: REST_TOKEN }) : null;

function clean(s, max) {
  // strip control chars (0x00-0x1F) and the separator, then trim/length-limit
  return String(s == null ? '' : s)
    .replace(/[\x00-\x1f]/g, '')
    .split(SEP).join('')
    .trim()
    .slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // notice when storage is not connected
  if (!redis) {
    if (req.method === 'GET') return res.status(200).json({ ok: false, kv: false, players: [], total: 0 });
    return res.status(200).json({ ok: false, kv: false, error: 'KV_NOT_CONFIGURED' });
  }

  try {
    if (req.method === 'GET') {
      const raw = await redis.zrange(BOARD, 0, 49, { rev: true, withScores: true });
      const players = [];
      for (let i = 0; i < raw.length; i += 2) {
        const member = String(raw[i]);
        const coins = Number(raw[i + 1]) || 0;
        const name = member.includes(SEP) ? member.split(SEP)[0] : member;
        players.push({ name, coins });
      }
      const total = await redis.zcard(BOARD);
      return res.status(200).json({ ok: true, kv: true, players, total });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      if (body.action === 'reset') {
        if (clean(body.pin, 40) !== RESET_PIN) return res.status(403).json({ ok: false, error: 'BAD_PIN' });
        await redis.del(BOARD);
        return res.status(200).json({ ok: true, reset: true });
      }

      const name = clean(body.name, 16) || 'Anonymous';
      const id = clean(body.id, 24) || Math.random().toString(36).slice(2, 10);
      let coins = Math.floor(Number(body.coins));
      if (!Number.isFinite(coins) || coins < 0) coins = 0;
      if (coins > 100000) coins = 100000; // guard

      const member = name + SEP + id;
      const cur = await redis.zscore(BOARD, member);
      if (cur == null || coins > Number(cur)) {
        await redis.zadd(BOARD, { score: coins, member });
      }
      const best = Math.max(coins, Number(cur) || 0);
      return res.status(200).json({ ok: true, kv: true, best });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
}
