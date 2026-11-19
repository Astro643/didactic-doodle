import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "green_proxy_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function sessionSecret() {
  const secret = process.env.GREEN_PROXY_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

function valuesMatch(expected: string, supplied: string) {
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function signature(expiresAt: string, secret: string) {
  return createHmac("sha256", `${secret}\0${process.env.GREEN_PROXY_PASSWORD}`).update(expiresAt).digest("base64url");
}

function sessionCookie(request: Request) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;
  const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return entry?.slice(SESSION_COOKIE.length + 1);
}

function hasValidSession(request: Request) {
  const secret = sessionSecret();
  const value = sessionCookie(request);
  if (!secret || !value) return false;

  const separator = value.indexOf(".");
  if (separator <= 0) return false;
  const expiresAt = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  if (!/^\d{10,}$/.test(expiresAt) || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = signature(expiresAt, secret);
  return valuesMatch(expectedSignature, suppliedSignature);
}

export function isAgentApiKeyAuthorized(request: Request) {
  const expected = process.env.AGENT_API_KEY;
  const supplied = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  return Boolean(expected && supplied && valuesMatch(expected, supplied));
}

export function isGreenProxyConfigured() {
  return Boolean(
    process.env.GREEN_PROXY_PASSWORD &&
      process.env.GREEN_PROXY_PASSWORD.length >= 16 &&
      sessionSecret(),
  );
}

export function isGreenProxyAuthorized(request: Request) {
  return hasValidSession(request) || isAgentApiKeyAuthorized(request);
}

export function isGreenProxySessionAuthorized(request: Request) {
  return hasValidSession(request);
}

export function verifyGreenProxyPassword(supplied: unknown) {
  const expected = process.env.GREEN_PROXY_PASSWORD;
  if (!isGreenProxyConfigured() || !expected || typeof supplied !== "string" || supplied.length > 1024) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export function createGreenProxyCookie() {
  const secret = sessionSecret();
  if (!secret) throw new Error("GREEN_PROXY_SESSION_SECRET must be at least 32 characters");

  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  const value = `${expiresAt}.${signature(expiresAt, secret)}`;
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearGreenProxyCookie() {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function requireGreenProxyAuthorization(request: Request): Response | null {
  if (!isGreenProxyConfigured()) {
    return Response.json({ detail: "Green Proxy authentication is not configured" }, { status: 503 });
  }
  if (!isGreenProxyAuthorized(request)) {
    return Response.json({ detail: "unauthorized" }, { status: 401 });
  }
  return null;
}
