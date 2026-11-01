import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { absoluteUrl } from "./site";

/** Development and tests only: writes messages to this folder as JSON instead of sending them. */
const captureDir = () => process.env.MAIL_CAPTURE_DIR || "";

export function isMailConfigured() {
  return !!process.env.MAIL_FROM && (!!process.env.RESEND_API_KEY || !!captureDir());
}

/** Sends one plain-text email. Never throws: callers have already saved their data. Returns whether it went out. */
export async function sendMail(to: string | string[], subject: string, text: string) {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[mail not configured] To: ${to}\n${subject}\n${text}`);
    return false;
  }
  try {
    if (captureDir()) {
      await mkdir(captureDir(), { recursive: true });
      await writeFile(path.join(captureDir(), `${Date.now()}-${randomUUID()}.json`), JSON.stringify({ to, subject: subject.slice(0, 150), text }));
      return true;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: Array.isArray(to) ? to : [to], subject: subject.slice(0, 150), text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Resend's error says why (for example an unverified sending domain); it never contains the key.
      console.error("Resend rejected an email", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email failed", err);
    return false;
  }
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
  const to = recipients();
  if (to.length === 0) return;
  // The lead is already saved; an email failure must not fail the visitor's submission.
  await sendMail(to, `New ${kind}: ${subject}`, `A new ${kind} has arrived for ${subject}.\n\nOpen it in the dashboard: ${absoluteUrl(adminPath)}\n`);
}

/** New-listing alert to a customer who opted in. Only sent when email is configured. */
export async function sendListingAlert(to: string, searchName: string, title: string, listingPath: string) {
  return sendMail(
    to,
    `New listing for your saved search “${searchName}”`,
    `A newly published property may suit your saved search “${searchName}”:\n\n${title}\n${absoluteUrl(listingPath)}\n\nYou receive this because you switched on alerts. Turn them off any time in your account: ${absoluteUrl("/account")}\n`,
  );
}
