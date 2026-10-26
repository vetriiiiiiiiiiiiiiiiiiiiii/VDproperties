import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { absoluteUrl } from "./site";

let transporter: Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return (transporter = null);
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

function recipients() {
  return (process.env.LEAD_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Notifies staff of a new lead. Deliberately contains no customer contact details —
 * staff open the dashboard to see them — so personal data isn't copied into inboxes.
 */
export async function notifyNewLead(kind: string, subject: string, adminPath: string) {
  const t = getTransporter();
  const to = recipients();
  if (!t || to.length === 0 || !process.env.MAIL_FROM) return;
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: `New ${kind}: ${subject}`.slice(0, 150),
      text: `A new ${kind} has arrived for ${subject}.\n\nOpen it in the dashboard: ${absoluteUrl(adminPath)}\n`,
    });
  } catch (err) {
    // The lead is already saved; an email failure must not fail the visitor's submission.
    console.error("Lead notification email failed", err);
  }
}

/** New-listing alert to a customer who opted in. Only sent when SMTP is configured. */
export async function sendListingAlert(to: string, searchName: string, title: string, path: string) {
  const t = getTransporter();
  if (!t || !process.env.MAIL_FROM) return false;
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: `New listing for your saved search “${searchName}”`.slice(0, 150),
      text: `A newly published property may suit your saved search “${searchName}”:\n\n${title}\n${absoluteUrl(path)}\n\nYou receive this because you switched on alerts. Turn them off any time in your account: ${absoluteUrl("/account")}\n`,
    });
    return true;
  } catch (err) {
    console.error("Listing alert failed", err);
    return false;
  }
}
