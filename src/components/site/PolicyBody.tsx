import { getI18n } from "@/i18n/server";

/** Renders plain policy text: "## " starts a heading, blank lines separate paragraphs. No HTML is interpreted. */
export async function PolicyBody({ text, updated }: { text: string; updated: Date }) {
  const { t, f } = await getI18n();
  return (
    <div className="wrap py-14">
      <div className="prose-vd max-w-3xl">
        {text.split(/\n{2,}/).map((block, i) =>
          block.startsWith("## ") ? <h2 key={i}>{block.slice(3)}</h2> : <p key={i} className="whitespace-pre-line">{block}</p>,
        )}
        <p className="annot-plain pt-6 text-slate">{t.lastUpdated(f.date(updated))}</p>
      </div>
    </div>
  );
}
