// A local stand-in for Google's sign-in, used only by the end-to-end tests.
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const BASE = "http://localhost:3201";
let identity = null;
const codes = new Map();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  let body = "";
  for await (const c of req) body += c;
  if (url.pathname === "/health") return res.end("ok");
  if (url.pathname === "/next") {
    identity = JSON.parse(body);
    return res.end("ok");
  }
  if (url.pathname === "/authorize") {
    const code = randomBytes(12).toString("hex");
    const q = url.searchParams;
    codes.set(code, { nonce: q.get("nonce"), challenge: q.get("code_challenge"), client: q.get("client_id"), identity });
    const back = new URL(q.get("redirect_uri"));
    back.searchParams.set("code", code);
    back.searchParams.set("state", q.get("state"));
    res.writeHead(302, { Location: back.toString() });
    return res.end();
  }
  if (url.pathname === "/token") {
    const p = new URLSearchParams(body);
    const c = codes.get(p.get("code"));
    codes.delete(p.get("code"));
    const pkce = c && createHash("sha256").update(p.get("code_verifier") ?? "").digest("base64url") === c.challenge;
    if (!pkce || p.get("client_secret") !== "e2e-google-secret") {
      res.writeHead(400);
      return res.end("{}");
    }
    const claims = { iss: BASE, aud: c.client, nonce: c.nonce, exp: Math.floor(Date.now() / 1000) + 600, ...c.identity };
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ id_token: `${b64({ alg: "none" })}.${b64(claims)}.x` }));
  }
  res.writeHead(404);
  res.end();
}).listen(3201);
