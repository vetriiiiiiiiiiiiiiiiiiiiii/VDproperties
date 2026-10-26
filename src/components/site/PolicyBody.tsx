import { formatDate } from "@/lib/format";

/** Renders plain policy text: "## " starts a heading, blank lines separate paragraphs. No HTML is interpreted. */
export function PolicyBody({ text, updated }: { text: string; updated: Date }) {
  return (
    <div className="wrap py-14">
      <div className="prose-vd max-w-3xl">
        {text.split(/\n{2,}/).map((block, i) =>
          block.startsWith("## ") ? <h2 key={i}>{block.slice(3)}</h2> : <p key={i} className="whitespace-pre-line">{block}</p>,
        )}
        <p className="annot-plain pt-6 text-slate">Last updated {formatDate(updated)}</p>
      </div>
    </div>
  );
}
