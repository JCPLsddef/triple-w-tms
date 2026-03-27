'use strict';

// ============================================================
//  Triple W Rentals — Lead Form Handler
//  Vercel Serverless Function
//
//  REQUIRED ENV VAR (set in Vercel dashboard → Settings → Environment Variables):
//    RESEND_API_KEY  =  re_...your_key_here...
//
//  OPTIONAL ENV VAR (once triplewrentals.com is verified in Resend):
//    FROM_EMAIL  =  Triple W Rentals <noreply@triplewrentals.com>
//
//  Without FROM_EMAIL, emails send from onboarding@resend.dev (works immediately,
//  no domain verification required — fine for launch).
// ============================================================

const { Resend } = require('resend');

const TO_EMAILS  = ['jcpl-07@hotmail.com', 'triplewrentals@gmail.com'];
const FROM_EMAIL = process.env.FROM_EMAIL || 'Triple W Rentals <onboarding@resend.dev>';
const REPLY_TO   = 'triplewrentals@gmail.com';

module.exports = async function handler(req, res) {

    // ---- CORS ---- //
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

    // ---- Honeypot: bots fill _hp, humans don't ---- //
    const body = req.body || {};
    if (body._hp) {
        // Silently accept to not tip off bots
        return res.status(200).json({ success: true });
    }

    // ---- Sanitize & extract fields ---- //
    const cap = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const name        = cap(body.name,        120);
    const email       = cap(body.email,       254);
    const phone       = cap(body.phone,        30);
    const groupSize   = cap(body.groupSize,    80);
    const dates       = cap(body.dates,       120);
    const rvPref      = cap(body.rvPreference, 120);
    const message     = cap(body.message,     2000);
    const source      = cap(body.source,       200);

    // ---- Validate required fields ---- //
    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Missing required fields: name, email, phone' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    // ---- Require API key ---- //
    if (!process.env.RESEND_API_KEY) {
        console.error('[submit-form] RESEND_API_KEY is not set');
        return res.status(500).json({ error: 'Server configuration error. Please call (972) 965-6901.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const ts     = new Date().toLocaleString('en-US', {
        timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short'
    });

    // ================================================================
    //  EMAIL 1: Team notification
    // ================================================================
    const notifyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f0ede8; margin: 0; padding: 40px 16px; }
    .wrap { max-width: 580px; margin: 0 auto; }
    .card { background: #16130f; border-radius: 8px; overflow: hidden; }
    .top  { background: #c9962c; padding: 18px 32px; }
    .top-label { font-size: 11px; font-weight: 700; letter-spacing: .12em;
                 text-transform: uppercase; color: #0a0a0a; opacity: .75; }
    .top-name  { font-size: 26px; font-weight: 700; color: #0a0a0a; margin-top: 4px; }
    .body  { padding: 28px 32px 32px; }
    .row   { margin-bottom: 18px; }
    .lbl   { font-size: 10px; font-weight: 600; letter-spacing: .13em;
             text-transform: uppercase; color: #7a6e62; margin-bottom: 3px; }
    .val   { font-size: 15px; color: #e8e0d4; line-height: 1.5; }
    .val a { color: #c9962c; text-decoration: none; }
    hr     { border: none; border-top: 1px solid #2a2520; margin: 20px 0; }
    .cta   { display: inline-block; background: #c9962c; color: #0a0a0a;
             font-size: 14px; font-weight: 700; padding: 13px 28px;
             border-radius: 4px; text-decoration: none; margin-top: 6px; }
    .foot  { font-size: 11px; color: #4a4038; margin-top: 22px; line-height: 1.6; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="top">
      <div class="top-label">&#127937; New WÜRTH 400 Lead</div>
      <div class="top-name">${esc(name)}</div>
    </div>
    <div class="body">

      <div class="row">
        <div class="lbl">Phone</div>
        <div class="val"><a href="tel:${esc(phone)}">${esc(phone)}</a></div>
      </div>
      <div class="row">
        <div class="lbl">Email</div>
        <div class="val"><a href="mailto:${esc(email)}">${esc(email)}</a></div>
      </div>

      <hr>

      ${groupSize ? `<div class="row"><div class="lbl">Group Size</div><div class="val">${esc(groupSize)}</div></div>` : ''}
      ${dates     ? `<div class="row"><div class="lbl">Requested Dates</div><div class="val">${esc(dates)}</div></div>` : ''}
      ${rvPref    ? `<div class="row"><div class="lbl">RV Preference</div><div class="val">${esc(rvPref)}</div></div>` : ''}

      ${message ? `<hr><div class="row"><div class="lbl">Notes</div><div class="val">${esc(message).replace(/\n/g, '<br>')}</div></div>` : ''}

      <hr>

      <a href="tel:${esc(phone)}" class="cta">&#128222; Call ${esc(firstName(name))}</a>

      <p class="foot">
        Received ${ts} CT &nbsp;&#183;&nbsp; ${esc(source || 'WÜRTH 400 Landing Page')}
      </p>
    </div>
  </div>
</div>
</body>
</html>`;

    // ================================================================
    //  EMAIL 2: Lead confirmation
    // ================================================================
    const confirmHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f0ede8; margin: 0; padding: 40px 16px; }
    .wrap { max-width: 560px; margin: 0 auto; }
    .card { background: #16130f; border-radius: 8px; padding: 36px 32px; color: #e8e0d4; }
    .brand { font-size: 13px; font-weight: 700; letter-spacing: .14em;
             text-transform: uppercase; color: #c9962c; margin-bottom: 24px; }
    h2 { font-size: 22px; margin: 0 0 14px; color: #f4efe6; }
    p  { font-size: 15px; color: #9e9080; line-height: 1.8; margin: 0 0 16px; }
    .hi { color: #e8e0d4; }
    hr  { border: none; border-top: 1px solid #2a2520; margin: 24px 0; }
    .cta { display: inline-block; background: #c9962c; color: #0a0a0a;
           font-size: 14px; font-weight: 700; padding: 13px 28px;
           border-radius: 4px; text-decoration: none; margin: 8px 0 20px; }
    .summary { background: #0f0d0a; border-radius: 6px; padding: 20px 22px; margin: 0 0 20px; }
    .s-row { display: flex; justify-content: space-between;
             font-size: 13px; margin-bottom: 10px; }
    .s-lbl { color: #5e5650; }
    .s-val { color: #e8e0d4; }
    .foot  { font-size: 11px; color: #4a4038; margin-top: 20px; line-height: 1.7; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="brand">Triple W Rentals</div>
    <h2>Got your request, ${esc(firstName(name))}.</h2>
    <p>
      We'll reach out within a few hours to confirm availability for the
      <span class="hi">WÜRTH 400 weekend (May 1–3, 2026)</span>
      and walk you through your options.
    </p>
    <p>Want to talk now?</p>
    <a href="tel:+19729656901" class="cta">&#128222; (972) 965-6901</a>

    <hr>

    <div class="summary">
      ${groupSize ? `<div class="s-row"><span class="s-lbl">Group Size</span><span class="s-val">${esc(groupSize)}</span></div>` : ''}
      ${dates     ? `<div class="s-row"><span class="s-lbl">Dates</span><span class="s-val">${esc(dates)}</span></div>` : ''}
      ${rvPref    ? `<div class="s-row"><span class="s-lbl">RV Preference</span><span class="s-val">${esc(rvPref)}</span></div>` : ''}
      <div class="s-row">
        <span class="s-lbl">Starting from</span>
        <span class="s-val" style="color:#c9962c">$200/night</span>
      </div>
    </div>

    <p>Looking forward to making your race weekend unforgettable.</p>

    <p style="font-size:13px; color:#5e5650; margin-top:20px;">
      — The Triple W Rentals Team<br>
      <a href="https://www.triplewrentals.com" style="color:#c9962c">triplewrentals.com</a>
    </p>

    <p class="foot">
      You're receiving this because you submitted a quote request on our landing page.
      One-time confirmation — you are not being added to any marketing list.
    </p>
  </div>
</div>
</body>
</html>`;

    // ================================================================
    //  Send emails
    // ================================================================
    try {
        // 1 — Team notification (must succeed)
        const notifyResult = await resend.emails.send({
            from:    FROM_EMAIL,
            to:      TO_EMAILS,
            replyTo: email,
            subject: `New TMS Inquiry — ${name} · ${groupSize || 'Group TBD'} · ${dates || 'Dates TBD'}`,
            html:    notifyHtml,
        });

        if (notifyResult.error) {
            const errDetail = JSON.stringify(notifyResult.error, null, 2);
            console.error('[submit-form] notify error (full):', errDetail);
            return res.status(500).json({ error: 'Email delivery failed. Please call (972) 965-6901.', _debug: notifyResult.error });
        }

        // 2 — Lead confirmation (non-fatal — failure doesn't block 200)
        try {
            await resend.emails.send({
                from:    FROM_EMAIL,
                to:      [email],
                replyTo: REPLY_TO,
                subject: 'Your WÜRTH 400 RV Quote — Triple W Rentals',
                html:    confirmHtml,
            });
        } catch (confirmErr) {
            // Log but don't fail the request
            console.warn('[submit-form] confirmation email failed (non-fatal):', confirmErr.message);
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('[submit-form] Resend exception:', err);
        return res.status(500).json({ error: 'Email service error. Please call (972) 965-6901.' });
    }
};

// ---- Helpers ---- //
function esc(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

function firstName(fullName) {
    return (fullName || '').split(/\s+/)[0] || fullName;
}
