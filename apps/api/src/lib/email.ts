/**
 * Sending emails (verification links, password resets).
 *
 * If SMTP is not configured (typical in development), the email is printed to
 * the console instead, so you can still copy the link and continue.
 */
import nodemailer from 'nodemailer';
import { env, features } from '../config/env.js';

const transporter = features.smtp
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // port 465 uses TLS from the start; 587 upgrades later
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

type Email = { to: string; subject: string; heading: string; body: string; buttonText: string; buttonUrl: string };

/** Make text safe to put inside HTML (event names and user names are typed by users). */
export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** A small, branded HTML email with one button. Inline styles because email clients ignore <style>. */
const renderEmail = (email: Email) => {
  const url = escapeHtml(email.buttonUrl);
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#37352f">
    <p style="font-size:18px;font-weight:700;margin:0 0 24px">📸 PhotoMatch</p>
    <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(email.heading)}</h1>
    <p style="font-size:15px;line-height:1.6;color:#787774">${escapeHtml(email.body)}</p>
    <a href="${url}" style="display:inline-block;margin:20px 0;padding:10px 18px;background:#2383e2;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(email.buttonText)}</a>
    <p style="font-size:12px;color:#a5a29c">If the button doesn't work, paste this link into your browser:<br>${url}</p>
  </div>`;
};

export async function sendEmail(email: Email) {
  if (!transporter) {
    console.log(`\n📧 [email not sent — SMTP not configured]\n   To: ${email.to}\n   ${email.subject}\n   ${email.buttonUrl}\n`);
    return;
  }
  await transporter.sendMail({ from: env.EMAIL_FROM, to: email.to, subject: email.subject, html: renderEmail(email) });
}
