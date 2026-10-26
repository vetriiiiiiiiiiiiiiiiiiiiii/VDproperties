import type { FaqItem, SocialLink, TitledItem } from "./settings";

/**
 * Lists are edited as plain text: items separated by a blank line, first line is the title,
 * the remaining lines the body. Keeps the admin simple without a rich editor.
 */
export function parseTitledBlocks(text: string): TitledItem[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [title, ...rest] = block.split("\n");
      return { title: title.trim().slice(0, 120), body: rest.join("\n").trim().slice(0, 1500) };
    })
    .slice(0, 30);
}

export function formatTitledBlocks(items: TitledItem[]) {
  return items.map((i) => `${i.title}\n${i.body}`).join("\n\n");
}

export function parseFaqs(text: string): FaqItem[] {
  return parseTitledBlocks(text).map((i) => ({ question: i.title, answer: i.body })).filter((f) => f.answer);
}

export function formatFaqs(items: FaqItem[]) {
  return items.map((f) => `${f.question}\n${f.answer}`).join("\n\n");
}

/** "Label | https://…" per line. Only https links are kept. */
export function parseSocialLinks(text: string): SocialLink[] {
  return text
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter(([label, url]) => label && url && /^https:\/\/[^\s]+$/.test(url))
    .map(([label, url]) => ({ label: label.slice(0, 40), url: url.slice(0, 300) }))
    .slice(0, 12);
}

export function formatSocialLinks(items: SocialLink[]) {
  return items.map((s) => `${s.label} | ${s.url}`).join("\n");
}

export function parseDates(text: string) {
  return [...new Set(text.split(/[\s,]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(0, 200);
}
