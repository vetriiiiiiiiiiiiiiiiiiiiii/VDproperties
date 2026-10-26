import type { Metadata, Viewport } from "next";
import { Catamaran, IBM_Plex_Mono, Manrope, Newsreader, Noto_Serif_Tamil } from "next/font/google";
import { LiquidDefs } from "@/components/liquid/LiquidDefs";
import { I18nProvider } from "@/i18n/client";
import { HTML_LANG } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { allowIndexing, siteUrl } from "@/lib/site";
import "./globals.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", style: ["normal", "italic"] });
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });
// Tamil faces: only fetched by the browser when Tamil glyphs are actually rendered (unicode-range).
const tamilSans = Catamaran({ subsets: ["tamil"], variable: "--font-tamil-sans", display: "swap", preload: false });
const tamilSerif = Noto_Serif_Tamil({ subsets: ["tamil"], variable: "--font-tamil-serif", display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: locale === "ta" ? "வி டி பிராப்பர்ட்டீஸ் — இன்றிலிருந்தே சிறப்பாகக் கட்டுங்கள்" : "V D Properties — Build Better From Now",
      template: locale === "ta" ? "%s · வி டி பிராப்பர்ட்டீஸ்" : "%s · V D Properties",
    },
    description: "Residential plots and land, developed properties and homes built by V D Properties.",
    robots: allowIndexing ? undefined : { index: false, follow: false },
    openGraph: { siteName: "V D Properties", type: "website", locale: locale === "ta" ? "ta_IN" : "en_IN", alternateLocale: locale === "ta" ? "en_IN" : "ta_IN" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { themeColor: "#0C3F19" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={HTML_LANG[locale]} className={`${serif.variable} ${sans.variable} ${mono.variable} ${tamilSans.variable} ${tamilSerif.variable}`}>
      <body>
        <LiquidDefs />
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
