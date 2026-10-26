import type { Locale } from "../config";
import { account } from "./account";
import { common } from "./common";
import { home } from "./home";
import { market } from "./market";
import { listings } from "./listings";
import { pages } from "./pages";
import { plotfit } from "./plotfit";
import { studio } from "./studio";
import { twin } from "./twin";

function build(locale: Locale) {
  return {
    ...common[locale],
    home: home[locale],
    market: market[locale],
    listings: listings[locale],
    pages: pages[locale],
    twin: twin[locale],
    studio: studio[locale],
    plotfit: plotfit[locale],
    account: account[locale],
  };
}

export type Dict = ReturnType<typeof build>;
export const DICTS: Record<Locale, Dict> = { en: build("en"), ta: build("ta") };
