import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporterPromise: Promise<Transporter> | null = null;
let usingEthereal = false;

/**
 * Lazily create a nodemailer transporter.
 * - If SMTP_HOST/SMTP_USER/SMTP_PASS are set, uses that real SMTP server.
 * - Otherwise spins up an Ethereal test account so emails "send" and produce a
 *   preview URL (logged to the console) — zero config needed for the demo.
 */
async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }
    // Dev fallback: Ethereal (captures mail, gives a web preview).
    usingEthereal = true;
    const test = await nodemailer.createTestAccount();
    // eslint-disable-next-line no-console
    console.log(`[mailer] No SMTP configured — using Ethereal test inbox (${test.user}). Emails will print a preview URL.`);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: test.user, pass: test.pass },
    });
  })();

  return transporterPromise;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
    if (usingEthereal) {
      const preview = nodemailer.getTestMessageUrl(info);
      // eslint-disable-next-line no-console
      console.log(`\n[mailer] Sent "${subject}" to ${to}\n  Preview: ${preview}\n`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[mailer] Sent "${subject}" to ${to}`);
    }
  } catch (err) {
    // Never let email failures break the request flow.
    // eslint-disable-next-line no-console
    console.error(`[mailer] Failed to send "${subject}" to ${to}:`, (err as Error).message);
  }
}

/* --------------------------------- Layout --------------------------------- */
function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#0B0D0F;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F4F5F6;padding:32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#121518;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;background:#10B981;color:#0B0D0F;font-weight:700;border-radius:8px;vertical-align:middle;">A</span>
          <span style="font-size:18px;font-weight:700;margin-left:8px;vertical-align:middle;">AssetFlow</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
          <div style="font-size:14px;line-height:1.6;color:#C7CBD1;">${body}</div>
          ${cta ? `<div style="margin:28px 0 8px;"><a href="${cta.url}" style="display:inline-block;background:#10B981;color:#0B0D0F;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;">${cta.label}</a></div>
          <p style="font-size:12px;color:#9CA3AF;margin-top:14px;">Or paste this link into your browser:<br><span style="color:#34D399;word-break:break-all;">${cta.url}</span></p>` : ''}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#6B7280;">
          AssetFlow — Enterprise Asset &amp; Resource Management. This is an automated message.
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

/* -------------------------------- Templates ------------------------------- */
export function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const body = `Hi ${name},<br><br>
    Welcome to <b>AssetFlow</b> — your account is ready. You've joined as an <b>Employee</b>;
    an administrator can promote you to Department Head or Asset Manager from the directory.<br><br>
    You can now view assets allocated to you, book shared resources, and raise maintenance requests.`;
  return send(to, 'Welcome to AssetFlow 🎉', layout('Welcome aboard!', body, { label: 'Open AssetFlow', url: `${env.WEB_ORIGIN}/login` }));
}

export function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${env.WEB_ORIGIN}/reset-password?token=${token}`;
  const body = `We received a request to reset your AssetFlow password.<br><br>
    Click the button below to choose a new one. This link expires in <b>30 minutes</b>.
    If you didn't request this, you can safely ignore this email.`;
  return send(to, 'Reset your AssetFlow password', layout('Password reset', body, { label: 'Reset password', url }));
}
