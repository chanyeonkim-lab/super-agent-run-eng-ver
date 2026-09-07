// Vercel Serverless Function — question (pain point) store API (Upstash Redis)
//   GET  /api/questions                          → current question list (saved version if any, else the default 18)
//   POST /api/questions {action:'save', pin, questions}  → save the question list (back office)
//   POST /api/questions {action:'reset', pin}    → restore the default 18 questions
//
// PIN is 'salesforce', same as the leaderboard reset.
import { Redis } from '@upstash/redis';

const KEY = 'sar:questions';
const EDIT_PIN = process.env.RESET_PIN || 'salesforce';

const REST_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = (REST_URL && REST_TOKEN) ? new Redis({ url: REST_URL, token: REST_TOKEN }) : null;

// Default 18 questions (6 categories × 3) — ai = correct answer (AI way) / manual = manual way
const DEFAULTS = [
 {cat:"PROD",enemy:"goomba",scene:"Back from vacation",q:"You return from vacation to 500+ unread Slack & email alerts. Now what?",manual:"Read them one by one and lose an entire day",ai:"An Agent summarizes each channel and pulls out your action items"},
 {cat:"PROD",enemy:"koopa",scene:"Monday morning",q:"You know this week is packed, but nothing's organized. Now what?",manual:"Start poking at random tasks while priorities keep shifting",ai:"An Agent scans your calendar, email & CRM to auto-build a prioritized to-do list"},
 {cat:"PROD",enemy:"boo",scene:"Coaching your team",q:"You want to know what each team member is working on and how they work. How?",manual:"Ask in every 1:1 and end up going by gut feel",ai:"Each member's activity, blockers & results roll up automatically, so coaching points surface on their own"},

 {cat:"COL",enemy:"piranha",scene:"Working with an external partner",q:"You need to coordinate work with a supplier. How?",manual:"Email, calls, shared drives & chat apps all mixed together — the history scatters",ai:"Talk with the partner in one messaging channel where context and files accumulate"},
 {cat:"COL",enemy:"bullet",scene:"Repetitive questions",q:"Another team pings you the same question every single day. Now what?",manual:"Search and dig up the same materials every time, then answer politely (again)",ai:"An AI Agent answers repeat questions automatically, grounded in your internal knowledge"},
 {cat:"COL",enemy:"goomba",scene:"Meeting follow-up",q:"The meeting ends — what happens to the decisions and to-dos?",manual:"Everyone relies on memory and the action items quietly fizzle out",ai:"An Agent auto-captures the summary, actions, owners & due dates and shares them"},

 {cat:"SALES",enemy:"koopa",scene:"Logging sales activity",q:"Where do customer meetings and calls actually get recorded?",manual:"In the rep's head and a personal notebook — the org only sees a report",ai:"Conversations & notes are captured and structured in the CRM automatically"},
 {cat:"SALES",enemy:"piranha",scene:"Pipeline visibility",q:"What's the status of every deal in flight right now?",manual:"Every rep tracks it their own way — it never rolls up",ai:"Stage, amount & probability at a glance in the CRM pipeline"},
 {cat:"SALES",enemy:"boo",scene:"Revenue forecast",q:"What's the revenue forecast for this quarter?",manual:"Guess from rep intuition and a stitched-together spreadsheet",ai:"Forecast grounded in Commit & Must-win data"},

 {cat:"MKT",enemy:"bullet",scene:"Competitive & market research",q:"How do you stay on top of competitors and market trends?",manual:"Someone manually searches and compiles news and reports",ai:"An Agent continuously monitors your chosen sources and summarizes them"},
 {cat:"MKT",enemy:"goomba",scene:"Researching an account",q:"How do you research a prospect company?",manual:"Comb through their website and news and write it up by hand",ai:"An Agent auto-briefs you on company info and recent developments"},
 {cat:"MKT",enemy:"koopa",scene:"Lead management",q:"What happens to leads from trade shows and the web?",manual:"Pile up business cards in a spreadsheet and let them go cold",ai:"Auto-captured & scored → handed straight to sales in Sales Cloud"},

 {cat:"DA",enemy:"piranha",scene:"Manual roll-ups",q:"How do you build the monthly performance & production report?",manual:"Merge, copy-paste and re-formula a dozen spreadsheets every single time",ai:"Connect the data once and the dashboard refreshes itself"},
 {cat:"DA",enemy:"boo",scene:"Ask-in-plain-language analysis",q:"You wonder, 'why did deliveries slip this month?' Now what?",manual:"File a request with the analytics team and wait days",ai:"Ask in plain language and AI instantly analyzes the cause & trend and explains the insight"},
 {cat:"DA",enemy:"bullet",scene:"Anomaly detection",q:"When do you find out a metric is heading the wrong way?",manual:"Discover it late, at the end-of-month review",ai:"AI alerts you in real time the moment it crosses a threshold"},

 {cat:"DF",enemy:"goomba",scene:"Connecting across business units",q:"What if a Division A customer turns out to be a Division B customer too?",manual:"Each division manages its own data — cross-sell is nearly impossible to see",ai:"Unify the customer → instantly see 'this buyer of Product A also bought Product B'"},
 {cat:"DF",enemy:"koopa",scene:"Enriching with external data",q:"You need a customer's credit, financial & filing information. How?",manual:"Look up D&B, SEC filings & credit agencies separately and key it in by hand",ai:"External data is collected automatically, merged with internal data, and quality improves"},
 {cat:"DF",enemy:"piranha",scene:"Connecting internal systems",q:"How do you see whether a sales activity turned into a real order, delivery & usage?",manual:"SAP ERP, SCM, PLM & the data lake all run in silos — impossible to trace",ai:"Systems (ERP, etc.) connect smoothly → trace sales activity through to orders and product usage"}
];

const ALLOWED_ENEMY = ['goomba','koopa','piranha','boo','bullet'];
const ALLOWED_CAT   = ['PROD','COL','SALES','MKT','DA','DF'];

function clip(s, max){ return String(s == null ? '' : s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').trim().slice(0, max); }

function sanitize(list){
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const item of list.slice(0, 60)) {
    if (!item || typeof item !== 'object') continue;
    const cat  = ALLOWED_CAT.includes(item.cat) ? item.cat : 'PROD';
    const enemy= ALLOWED_ENEMY.includes(item.enemy) ? item.enemy : 'goomba';
    const scene= clip(item.scene, 40);
    const q    = clip(item.q, 200);
    const manual = clip(item.manual, 200);
    const ai   = clip(item.ai, 200);
    if (!q || !manual || !ai) continue;
    out.push({ cat, enemy, scene, q, manual, ai });
  }
  return out.length ? out : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      let questions = null;
      if (redis) {
        const stored = await redis.get(KEY);
        if (stored) questions = typeof stored === 'string' ? JSON.parse(stored) : stored;
      }
      const isDefault = !questions;
      return res.status(200).json({ ok: true, kv: !!redis, isDefault, questions: questions || DEFAULTS });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (clip(body.pin, 40) !== EDIT_PIN) return res.status(403).json({ ok: false, error: 'BAD_PIN' });
      if (!redis) return res.status(200).json({ ok: false, kv: false, error: 'KV_NOT_CONFIGURED' });

      if (body.action === 'reset') {
        await redis.del(KEY);
        return res.status(200).json({ ok: true, reset: true, questions: DEFAULTS });
      }

      // save
      const clean = sanitize(body.questions);
      if (!clean) return res.status(400).json({ ok: false, error: 'INVALID_QUESTIONS' });
      await redis.set(KEY, JSON.stringify(clean));
      return res.status(200).json({ ok: true, saved: true, count: clean.length });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
}
