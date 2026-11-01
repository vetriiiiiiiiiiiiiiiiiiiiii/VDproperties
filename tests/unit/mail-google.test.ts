import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseIdToken, safeNextPath } from "@/lib/google-auth";
import { isMailConfigured, sendMail } from "@/lib/mail";

describe("Resend email", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("MAIL_CAPTURE_DIR", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "V D Properties <no-reply@example.test>");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("posts to Resend with the key and message", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendMail("a@example.test", "Hello", "Body")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toEqual({ from: "V D Properties <no-reply@example.test>", to: ["a@example.test"], subject: "Hello", text: "Body" });
  });

  it("reports failure instead of throwing when Resend refuses or is unreachable", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"message":"domain not verified"}', { status: 403 }));
    expect(await sendMail("a@example.test", "Hello", "Body")).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await sendMail("a@example.test", "Hello", "Body")).toBe(false);
  });

  it("isn't configured without both a key and a sender", () => {
    expect(isMailConfigured()).toBe(true);
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isMailConfigured()).toBe(false);
  });
});

describe("Google ID tokens", () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const good = { iss: "https://accounts.google.com", aud: "client", nonce: "n", exp: 2000, sub: "1", email: "A@Example.test", email_verified: true, name: "A" };
  const check = (claims: object) => parseIdToken(`x.${b64(claims)}.y`, { clientId: "client", nonce: "n", issuers: ["https://accounts.google.com"], now: 1000_000 });

  it("accepts valid claims and lowercases the email", () => {
    expect(check(good)).toEqual({ sub: "1", email: "a@example.test", emailVerified: true, name: "A" });
  });
  it("refuses the wrong issuer, audience, nonce or an expired token", () => {
    expect(check({ ...good, iss: "https://evil.test" })).toBeNull();
    expect(check({ ...good, aud: "other" })).toBeNull();
    expect(check({ ...good, nonce: "x" })).toBeNull();
    expect(check({ ...good, exp: 10 })).toBeNull();
    expect(parseIdToken("garbage", { clientId: "client", nonce: "n", issuers: [] })).toBeNull();
  });
  it("only returns to same-site, non-admin paths", () => {
    expect(safeNextPath("/sell", "en")).toBe("/sell");
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "/admin", null]) expect(safeNextPath(bad, "ta")).toBe("/ta/account");
  });
});
