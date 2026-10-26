"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localePath } from "./config";
import { useI18n } from "./client";

/** Drop-in replacement for next/link that keeps visitors in their chosen language. */
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  return <NextLink href={typeof href === "string" ? localePath(locale, href) : href} {...rest} />;
}
