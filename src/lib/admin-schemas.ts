import { z } from "zod";

export const optEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.email("Enter a valid email").max(120).optional(),
);
