// ============================================================
//  Triple W Rentals — Lead Form Handler
//  Deployed as a Vercel Serverless Function
//
//  REQUIRED ENV VAR:
//    RESEND_API_KEY = re_KCWqH1xQ_... (set in Vercel dashboard)
//
//  REQUIRED SENDER SETUP:
//    1. Go to https://resend.com/domains
//    2. Add and verify triplewrentals.com
//    3. Once verified, the FROM_EMAIL below will work
//    Until then: test mode sends from onboarding@resend.dev
//       (limited to account owner's email — fine for initial testing)
// ============================================================

const { Resend } = require('resend');

// ---- Configuration (edit here if needed) ---- //
const TO_EMAILS   = ['jcpl-07@hotmail.com', 'triplewrentals@gmail.com'];
const FROM_EMAIL  = process.env.FROM_EMAIL  || 'Triple W Rentals <leads@triplewrentals.com>';
const REPLY_TO    = 'triplewrentals@gmail.com';
// ------------------------------------------------ //

module.exports = async function handler(req, res) {

    // CORS — allow from any origin (landing page may be on custom domain)
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

    // ---- Validate required fields ---- //
    const { name, email, phone, groupSize, dates, rvPreference, message, source } = req.body || {};

    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Missing required fields: name, email, phone' });
    }

    // Basic email format check
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    // ---- Init Resend ---- //
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // ---- Build notification email (to Triple W team) ---- //
    const notifyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f8f6f2; margin: 0; padding: 40px 20px; }
    .card { background: #1a1714; border-radius: 10px; padding: 36px 40px;
            max-width: 580px; margin: 0 auto; color: #f4efe6; }
    .badge { display: inline-block; background: #c9962c;
             color: #0a0a0a; font-size: 11px; font-weight: 700;
             letter-spacing: .1em; text-transform: uppercase;
             padding: 5px 14px; border-radius: 3px; margin-bottom: 20px; }
    h2 { font-size: 24px; margin: 0 0 6px; color: #f4efe6; }
    .sub { color: #9e9080; font-size: 13px; margin-bottom: 28px; }
    .field { margin-bottom: 16px; }
    .label { font-size: 10px; font-weight: 600; letter-spacing: .12em;
             text-transform: uppercase; color: #9e9080; margin-bottom: 4px; }
    .value { font-size: 15px; color: #f4efe6; line-height: 1.5; }
    .divider { border: none; border-top: 1px solid #2a2520; margin: 24px 0; }
    .call-btn { display: inline-block; background: #c9962c; color: #0a0a0a;
                font-weight: 700; font-size: 14px; padding: 13px 28px;
                border-radius: 4px; text-decoration: none; margin-top: 8px; }
    .footer-note { font-size: 11px; color: #5e5650; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🏁 New WÜRTH 400 Lead</div>
    <h2>${escapeHtml(name)}</h2>
    <p class="sub">Submitted via the Texas Motor Speedway landing page</p>

    <div class="field">
      <div class="label">Phone</div>
      <div class="value"><a href="tel:${escapeHtml(phone)}" style="color:#c9962c">${escapeHtml(phone)}</a></div>
    </div>
    <div class="field">
      <div class="label">Email</div>
      <div class="value"><a href="mailto:${escapeHtml(email)}" style="color:#c9962c">${escapeHtml(email)}</a></div>
    </div>

    <hr class="divider">

    <div class="field">
      <div class="label">Group Size</div>
      <div class="value">${groupSize ? escapeHtml(groupSize) : 'Not specified'}</div>
    </div>
    <div class="field">
      <div class="label">Event Dates</div>
      <div class="value">${dates ? escapeHtml(dates) : 'Not specified'}</div>
    </div>
    <div class="field">
      <div class="label">RV Preference</div>
      <div class="value">${rvPreference ? escapeHtml(rvPreference) : 'Not specified'}</div>
    </div>

    ${message ? `
    <hr class="divider">
    <div class="field">
      <div class="label">Notes / Message</div>
      <div class="value">${escapeHtml(message)}</div>
    </div>` : ''}

    <hr class="divider">

    <a href="tel:${escapeHtml(phone)}" class="call-btn">📞 Call ${escapeHtml(name.split(' ')[0])}</a>

    <p class="footer-note">
      Source: ${escapeHtml(source || 'WÜRTH 400 Landing Page')} &nbsp;·&nbsp;
      ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })} CT
    </p>
  </div>
</body>
</html>`.trim();

    // ---- Build confirmation email (to the lead) ---- //
    const confirmHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f8f6f2; margin: 0; padding: 40px 20px; }
    .card { background: #1a1714; border-radius: 10px; padding: 36px 40px;
            max-width: 560px; margin: 0 auto; color: #f4efe6; }
    .logo { font-size: 18px; font-weight: 700; color: #c9962c; margin-bottom: 24px; }
    h2 { font-size: 22px; margin: 0 0 12px; }
    p { font-size: 15px; color: #9e9080; line-height: 1.75; margin-bottom: 16px; }
    .highlight { color: #f4efe6; }
    .cta { display: inline-block; background: #c9962c; color: #0a0a0a;
           font-weight: 700; font-size: 14px; padding: 13px 28px;
           border-radius: 4px; text-decoration: none; margin: 8px 0 20px; }
    .divider { border: none; border-top: 1px solid #2a2520; margin: 24px 0; }
    .summary { background: #111; border-radius: 6px; padding: 20px 22px; margin-bottom: 16px; }
    .s-row { display: flex; justify-content: space-between; margin-bottom: 10px;
             font-size: 13px; }
    .s-label { color: #5e5650; }
    .s-value { color: #f4efe6; text-align: right; }
    .footer-note { font-size: 11px; color: #5e5650; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Triple W Rentals</div>
    <h2>Got your quote request, ${escapeHtml(name.split(' ')[0])}.</h2>
    <p>
      We'll reach back to you within a few hours to confirm availability
      for the <span class="highlight">WÜRTH 400 weekend (May 1–3, 2026)</span>
      and walk you through your options.
    </p>
    <p>
      In the meantime, if you want to talk to someone right now:
    </p>
    <a href="tel:+19729656901" class="cta">📞 Call (972) 965-6901</a>

    <hr class="divider">

    <div class="summary">
      ${groupSize ? `<div class="s-row"><span class="s-label">Group Size</span><span class="s-value">${escapeHtml(groupSize)}</span></div>` : ''}
      ${dates     ? `<div class="s-row"><span class="s-label">Dates</span><span class="s-value">${escapeHtml(dates)}</span></div>` : ''}
      ${rvPreference ? `<div class="s-row"><span class="s-label">RV Preference</span><span class="s-value">${escapeHtml(rvPreference)}</span></div>` : ''}
      <div class="s-row"><span class="s-label">Starting from</span><span class="s-value" style="color:#c9962c">$200/night</span></div>
    </div>

    <p>Looking forward to making your race weekend something to remember.</p>

    <p style="font-size:13px;margin-top:20px;">
      — The Triple W Rentals Team<br>
      <a href="https://www.triplewrentals.com" style="color:#c9962c">triplewrentals.com</a>
    </p>

    <p class="footer-note">
      You're receiving this because you submitted a quote request on our landing page.
      This is a one-time confirmation — no marketing lists.
    </p>
  </div>
</body>
</html>`.trim();

    // ---- Send emails ---- //
    try {
        // 1. Notify the Triple W team
        const notifyResult = await resend.emails.send({
            from:     FROM_EMAIL,
            to:       TO_EMAILS,
            replyTo:  email,
            subject:  `🏁 New WÜRTH 400 Lead — ${name} (${groupSize || 'Group TBD'})`,
            html:     notifyHtml,
        });

        if (notifyResult.error) {
            console.error('Resend notify error:', notifyResult.error);
            return res.status(500).json({ error: 'Failed to send notification email' });
        }

        // 2. Confirmation to the lead
        await resend.emails.send({
            from:    FROM_EMAIL,
            to:      [email],
            replyTo: REPLY_TO,
            subject: `Your WÜRTH 400 RV Quote — Triple W Rentals`,
            html:    confirmHtml,
        });

        // Success — confirmation email failure is non-fatal
        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('Resend exception:', err);
        return res.status(500).json({ error: 'Email service error. Please call (972) 965-6901.' });
    }
};

// ---- Utility: escape HTML to prevent injection in email ---- //
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
