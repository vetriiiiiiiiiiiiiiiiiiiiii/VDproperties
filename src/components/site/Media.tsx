import Image from "next/image";
import { Illustration, type IllustrationVariant, type Tone } from "./Illustration";

/**
 * Renders a stored image URL. URLs of the form "placeholder:<variant>" render a labelled sample
 * illustration instead, so sample content never borrows real-looking photographs.
 */
export function Media({
  src,
  alt,
  sizes = "100vw",
  priority = false,
  className = "",
  tone,
}: {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  tone?: Tone;
}) {
  if (!src || src.startsWith("placeholder:")) {
    const variant = (src?.slice("placeholder:".length) || "elevation") as IllustrationVariant;
    return <Illustration variant={variant} tone={tone} title={alt} className={`absolute inset-0 ${className}`} />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}
