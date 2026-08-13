// Daily-update email reminder — runs on Vercel Cron at 8:30 PM IST (see vercel.json).
// Checks who hasn't posted a daily update today and emails only them via Resend.
//
// Required Vercel env vars (Project → Settings → Environment Variables):
//   SUPABASE_URL                e.g. https://atlvwgqpimltjzrhgkhy.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   Supabase → Settings → API (secret!)
//   RESEND_API_KEY              from https://resend.com (free: 100 emails/day)
//   CRON_SECRET                 any random string — Vercel sends it automatically
//                               with cron requests so nobody else can trigger this
// Optional:
//   REMIND_FROM                 e.g. "Sugar Shot Studio OS <studio@sugarshotfilms.com>"
//                               (needs the domain verified in Resend; until then the
//                               default onboarding@resend.dev only delivers to the
//                               Resend account owner's email — good for testing)
//
// Test manually: open https://<your-app>/api/remind?dry=1  with header
//   Authorization: Bearer <CRON_SECRET>
// dry=1 reports who WOULD be emailed without sending anything.

import { supabase } from './_lib.js';

// EDIT ME: the team roster. `name` must exactly match the name shown in Studio OS.
// Set email to null to skip someone (e.g. until their address is confirmed).
const TEAM = [
  { name: 'Sandeep Sugumaran',      email: null }, // e.g. 'sandeep@sugarshotfilms.com'
  { name: 'Anirudh Venkatachalam',  email: null },
  { name: 'Prithvi Dhondaley',      email: null },
  { name: 'Sean Somanna',           email: null },
  { name: 'Aasish Suresh',          email: 'contact@sugarshotfilms.com' },
  { name: 'Aparajitha Rajaram',     email: null },
  { name: 'Ivan Prince',            email: null },
  { name: 'Rahul KD',               email: null },
];

// Public holidays (IST dates, 'YYYY-MM-DD') — keep in sync with HOLIDAYS in studio.html.
const HOLIDAYS = [];

const APP_URL = 'https://sugarshot-tracker.vercel.app';

function istNow() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000); // shift so UTC getters read IST
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = istNow();
  const today = now.toISOString().slice(0, 10);
  const dry = !!(req.query && req.query.dry);

  // Sundays and holidays are exempt — no nagging.
  if (now.getUTCDay() === 0 || HOLIDAYS.includes(today)) {
    return res.status(200).json({ skipped: 'Sunday/holiday', date: today });
  }

  const { data, error } = await supabase
    .from('daily_updates')
    .select('author')
    .eq('day', today);
  if (error) {
    return res.status(500).json({ error: 'Supabase query failed: ' + error.message });
  }

  const posted = new Set((data || []).map(r => r.author));
  const missing = TEAM.filter(t => !posted.has(t.name));
  const toEmail = missing.filter(t => t.email);
  const skippedNoEmail = missing.filter(t => !t.email).map(t => t.name);

  const hrsLeft = Math.max(0, 22 - (now.getUTCHours() + now.getUTCMinutes() / 60));
  const deadline = hrsLeft > 0
    ? `You have about ${hrsLeft < 1 ? Math.round(hrsLeft * 60) + ' minutes' : hrsLeft.toFixed(1).replace('.0', '') + ' hours'} until the 10:00 PM cutoff.`
    : 'The 10:00 PM cutoff has passed — post now and request an exemption from your lead.';

  const results = [];
  for (const t of toEmail) {
    const first = t.name.split(' ')[0];
    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#FAFAF9;border-radius:14px">
        <div style="font-size:20px;font-weight:700;color:#0D0D0D">Sugar Shot <span style="color:#FF4C4C">Studio OS</span></div>
        <div style="margin-top:20px;font-size:15px;color:#0D0D0D">Hey ${first} 👋</div>
        <p style="font-size:14px;color:#4A4A48;line-height:1.6">You haven't posted your <strong>daily update</strong> yet. ${deadline}</p>
        <a href="${APP_URL}" style="display:inline-block;margin-top:8px;padding:11px 22px;background:#FF4C4C;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Post my update →</a>
        <p style="margin-top:24px;font-size:11px;color:#999997">Automatic reminder · sent only on days you haven't updated · Sundays &amp; holidays are off.</p>
      </div>`;
    if (dry) {
      results.push({ to: t.email, name: t.name, dry: true });
      continue;
    }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.REMIND_FROM || 'Sugar Shot Studio OS <onboarding@resend.dev>',
          to: [t.email],
          subject: `⏰ ${first}, your daily update is pending`,
          html,
        }),
      });
      const body = await r.json().catch(() => ({}));
      results.push({ to: t.email, name: t.name, ok: r.ok, id: body.id, error: r.ok ? undefined : body.message });
    } catch (e) {
      results.push({ to: t.email, name: t.name, ok: false, error: String(e) });
    }
  }

  return res.status(200).json({
    date: today,
    posted: [...posted],
    reminded: results,
    skippedNoEmail,
  });
}
