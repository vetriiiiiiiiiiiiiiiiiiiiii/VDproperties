"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { SiteVisitForm } from "@/components/forms/SiteVisitForm";
import { PurchaseForm, type Buyer } from "@/components/forms/PurchaseForm";

export function EnquiryPanel({
  subject,
  label,
  canVisit,
  visit,
  businessName,
  phoneHref,
  whatsappHref,
  phone,
  noun,
  buyer,
  next = "/account",
}: {
  /** When set, a third tab lets signed-in buyers request to buy with an appointment. */
  buyer?: Buyer;
  next?: string;
  noun?: string;
  subject: { propertyId?: string; projectId?: string };
  label: string;
  canVisit: boolean;
  visit: { closedWeekdays: number[]; blackoutDates: string[]; maxDays: number };
  businessName: string;
  phoneHref?: string;
  whatsappHref?: string;
  phone?: string;
}) {
  const { t } = useI18n();
  const x = t.listings.panel;
  const [tab, setTab] = useState<"enquire" | "visit" | "buy">("enquire");
  const tabs = buyer ? 3 : 2;
  const at = tab === "enquire" ? 0 : tab === "visit" ? 1 : 2;
  const value = subject.propertyId ? `p:${subject.propertyId}` : `j:${subject.projectId}`;
  return (
    <div className="surface overflow-hidden" id="enquire">
      <div role="tablist" aria-label={x.options} className={`liquid-seg m-3 text-sm ${buyer ? "!rounded-2xl [&>*]:!rounded-xl before:!rounded-xl" : ""}`} style={{ "--n": tabs, "--at": at } as React.CSSProperties}>
        <button role="tab" type="button" id="tab-enq" aria-selected={tab === "enquire"} aria-controls="panel-enq" onClick={() => setTab("enquire")} className="liquid-seg-item whitespace-normal py-2.5 font-semibold">
          {x.enquire(noun ?? x.property)}
        </button>
        <button role="tab" type="button" id="tab-visit" aria-selected={tab === "visit"} aria-controls="panel-visit" disabled={!canVisit} onClick={() => setTab("visit")} className="liquid-seg-item whitespace-normal py-2.5 font-semibold disabled:text-slate/60">
          {x.visit}
        </button>
        {buyer && (
          <button role="tab" type="button" id="tab-buy" aria-selected={tab === "buy"} aria-controls="panel-buy" onClick={() => setTab("buy")} className="liquid-seg-item whitespace-normal py-2.5 font-semibold">
            {t.market.buy.button}
          </button>
        )}
      </div>
      <div className="p-5 sm:p-6">
        <div role="tabpanel" id="panel-enq" aria-labelledby="tab-enq" hidden={tab !== "enquire"}>
          <EnquiryForm {...subject} propertyLabel={label} businessName={businessName} />
        </div>
        {canVisit && (
          <div role="tabpanel" id="panel-visit" aria-labelledby="tab-visit" hidden={tab !== "visit"}>
            <SiteVisitForm options={{ properties: [{ value, label }], projects: [] }} selected={value} {...visit} businessName={businessName} />
          </div>
        )}
        {buyer && (
          <div role="tabpanel" id="panel-buy" aria-labelledby="tab-buy" hidden={tab !== "buy"}>
            <PurchaseForm propertyId={subject.propertyId!} buyer={buyer} maxDays={visit.maxDays} next={next} />
          </div>
        )}
      </div>
      {(phoneHref || whatsappHref) && (
        <div className="grid border-t border-line sm:grid-cols-2">
          {phoneHref && (
            <a href={phoneHref} className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-navy hover:bg-ivory">
              {x.call}{phone ? ` · ${phone}` : ""}
            </a>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-t border-line px-4 py-4 text-sm font-semibold text-emerald hover:bg-ivory sm:border-l sm:border-t-0">
              {x.whatsapp}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
