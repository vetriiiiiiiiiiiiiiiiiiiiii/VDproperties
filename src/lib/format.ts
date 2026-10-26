const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Formats rupees the way Indian buyers read them: ₹45 lakh, ₹1.25 crore, ₹8,50,000. */
export function formatPrice(amount: number) {
  if (amount >= 1_00_00_000) return `₹${trim(amount / 1_00_00_000)} crore`;
  if (amount >= 1_00_000) return `₹${trim(amount / 1_00_000)} lakh`;
  return `₹${inr.format(amount)}`;
}

export function formatRupeesFull(amount: number) {
  return `₹${inr.format(amount)}`;
}

function trim(n: number) {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function formatArea(sqft: number) {
  return `${inr.format(Math.round(sqft))} sq ft`;
}

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...opts }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return formatDate(date, { dateStyle: "medium", timeStyle: "short" });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Strips everything but digits and a leading +, for tel: and wa.me links. */
export function phoneHref(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function whatsappHref(number: string, text?: string) {
  const digits = number.replace(/\D/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}
