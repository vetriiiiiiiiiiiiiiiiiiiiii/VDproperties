import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { SiteImageSlot } from "@/components/admin/SiteImageSlot";
import { requirePage } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatFaqs, formatSocialLinks, formatTitledBlocks } from "@/lib/settings-format";

export const metadata = { title: "Company settings" };

export default async function SettingsPage() {
  await requirePage("settings:manage");
  const s = await getSettings();
  const t = (v: string | null) => v ?? "";
  return (
    <>
      <PageHeader title="Company settings" description="The official details and content shown across the website. Never enter details the company hasn't confirmed." />
      <div className="space-y-6">
        <Panel title="Site photographs" description="Use authentic photographs the company has permission to publish.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SiteImageSlot field="heroImage" label="Homepage hero" url={s.heroImageUrl} alt={s.heroImageAlt} fallback="placeholder:hero" />
            <SiteImageSlot field="homesImage" label="Homes & construction" url={s.homesImageUrl} alt={s.homesImageAlt} fallback="placeholder:construction" />
            <SiteImageSlot field="enquiryImage" label="Enquiry section" url={s.enquiryImageUrl} alt={s.enquiryImageAlt} fallback="placeholder:villa" />
            <SiteImageSlot field="aboutImage" label="About page" url={s.aboutImageUrl} alt={s.aboutImageAlt} fallback="placeholder:site-plan" />
          </div>
        </Panel>
        <SettingsForm
          v={{
            businessName: s.businessName, tagline: s.tagline, phone: t(s.phone), whatsapp: t(s.whatsapp), email: t(s.email), addressLine: t(s.addressLine),
            city: t(s.city), state: t(s.state), postalCode: t(s.postalCode), officeMapUrl: t(s.officeMapUrl), businessHours: t(s.businessHours),
            aboutIntro: t(s.aboutIntro), aboutApproach: t(s.aboutApproach), aboutValues: t(s.aboutValues), aboutServiceArea: t(s.aboutServiceArea),
            aboutCustomers: t(s.aboutCustomers), registrationInfo: t(s.registrationInfo), constructionNotes: t(s.constructionNotes),
            privacyPolicy: t(s.privacyPolicy), termsConditions: t(s.termsConditions), socialLinks: formatSocialLinks(s.socialLinks),
            constructionServices: formatTitledBlocks(s.constructionServices), constructionStages: formatTitledBlocks(s.constructionStages),
            strengths: formatTitledBlocks(s.strengths), faqs: formatFaqs(s.faqs), visitBlackoutDates: s.visitBlackoutDates.join("\n"), visitClosedWeekdays: s.visitClosedWeekdays,
          }}
        />
      </div>
    </>
  );
}
