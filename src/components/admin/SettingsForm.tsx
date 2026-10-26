"use client";

import { saveSettings } from "@/app/admin/_actions/settings";
import { Area, Field, Panel, Status, Submit, useFormAction } from "./kit";

export type SettingsValues = Record<
  | "businessName" | "tagline" | "phone" | "whatsapp" | "email" | "addressLine" | "city" | "state" | "postalCode" | "officeMapUrl" | "businessHours"
  | "aboutIntro" | "aboutApproach" | "aboutValues" | "aboutServiceArea" | "aboutCustomers" | "registrationInfo" | "constructionNotes"
  | "privacyPolicy" | "termsConditions" | "socialLinks" | "constructionServices" | "constructionStages" | "strengths" | "faqs" | "visitBlackoutDates",
  string
> & { visitClosedWeekdays: number[] };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BLOCKS_HINT = "One item per block: first line is the heading, following lines the description. Separate items with a blank line. Only list what the company confirms.";

export function SettingsForm({ v }: { v: SettingsValues }) {
  const { state, onSubmit, pending } = useFormAction(saveSettings);
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Status state={state} />
      <Panel title="Business & contact" description="Shown in the footer, contact page and structured data. Leave a field empty to hide it.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Business name" name="businessName" defaultValue={v.businessName} state={state} />
          <Field label="Tagline" name="tagline" defaultValue={v.tagline} state={state} />
          <Field label="Official phone" name="phone" type="tel" defaultValue={v.phone} state={state} placeholder="+91 …" />
          <Field label="WhatsApp number" name="whatsapp" type="tel" defaultValue={v.whatsapp} state={state} hint="Enables WhatsApp buttons. Include the country code." />
          <Field label="Official email" name="email" type="email" defaultValue={v.email} state={state} />
          <Field label="Office map link (https)" name="officeMapUrl" type="url" defaultValue={v.officeMapUrl} state={state} />
          <Field label="Address line" name="addressLine" defaultValue={v.addressLine} state={state} className="md:col-span-2" />
          <Field label="City" name="city" defaultValue={v.city} state={state} />
          <Field label="State" name="state" defaultValue={v.state} state={state} />
          <Field label="PIN code" name="postalCode" defaultValue={v.postalCode} state={state} />
          <Area label="Business hours" name="businessHours" defaultValue={v.businessHours} rows={2} state={state} />
          <Area label="Social media links" name="socialLinks" defaultValue={v.socialLinks} rows={3} state={state} hint="One per line: Label | https://…" className="md:col-span-2" />
        </div>
      </Panel>

      <Panel title="About page" description="Don't include founding years, customer counts, certifications or milestones unless you can evidence them.">
        <div className="grid gap-5">
          <Area label="Company introduction" name="aboutIntro" defaultValue={v.aboutIntro} rows={5} state={state} />
          <Area label="Our approach" name="aboutApproach" defaultValue={v.aboutApproach} rows={4} state={state} />
          <Area label="Values" name="aboutValues" defaultValue={v.aboutValues} rows={4} state={state} />
          <Area label="Working with customers" name="aboutCustomers" defaultValue={v.aboutCustomers} rows={4} state={state} />
          <Area label="Service area description" name="aboutServiceArea" defaultValue={v.aboutServiceArea} rows={3} state={state} />
          <Area label="Verified registrations & credentials" name="registrationInfo" defaultValue={v.registrationInfo} rows={3} state={state} hint="e.g. RERA or company registration numbers — only those you hold certificates for." />
        </div>
      </Panel>

      <Panel title="Homepage & construction content">
        <div className="grid gap-5">
          <Area label="Why V D Properties — strengths" name="strengths" defaultValue={v.strengths} rows={8} state={state} hint={BLOCKS_HINT + " The section is hidden when empty."} />
          <Area label="Construction introduction" name="constructionNotes" defaultValue={v.constructionNotes} rows={3} state={state} />
          <Area label="Construction services" name="constructionServices" defaultValue={v.constructionServices} rows={8} state={state} hint={BLOCKS_HINT} />
          <Area label="Construction stages" name="constructionStages" defaultValue={v.constructionStages} rows={8} state={state} hint={BLOCKS_HINT} />
          <Area label="FAQs" name="faqs" defaultValue={v.faqs} rows={10} state={state} hint="First line is the question, following lines the answer. Separate with a blank line." />
        </div>
      </Panel>

      <Panel title="Site visit availability" description="Visitors can't request dates you mark unavailable. This isn't a live calendar — staff still confirm every visit.">
        <fieldset>
          <legend className="field-label">Closed weekdays</legend>
          <div className="flex flex-wrap gap-4">
            {DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="visitClosedWeekdays" value={i} defaultChecked={v.visitClosedWeekdays.includes(i)} className="h-4 w-4 accent-emerald" /> {d}
              </label>
            ))}
          </div>
          {state?.errors?.visitClosedWeekdays && <p className="field-error">{state.errors.visitClosedWeekdays}</p>}
        </fieldset>
        <Area label="Unavailable dates" name="visitBlackoutDates" defaultValue={v.visitBlackoutDates} rows={3} state={state} hint="One date per line as YYYY-MM-DD, e.g. public holidays." className="mt-5" />
      </Panel>

      <Panel title="Policies" description="Leave empty to use the built-in drafts, which describe what this website does with data. Have your legal adviser review them.">
        <div className="grid gap-5">
          <Area label="Privacy policy" name="privacyPolicy" defaultValue={v.privacyPolicy} rows={8} state={state} hint="Plain text. Start a line with “## ” for a heading." />
          <Area label="Terms & conditions" name="termsConditions" defaultValue={v.termsConditions} rows={8} state={state} />
        </div>
      </Panel>

      <div className="sticky bottom-0 z-10 border border-line bg-white/95 p-4"><Submit pending={pending}>Save settings</Submit></div>
    </form>
  );
}
