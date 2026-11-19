import { timingSafeEqual } from "node:crypto";

function agentKeyMatches(request: Request) {
  const expected = process.env.AGENT_API_KEY;
  const supplied = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export function requireAgentAuthorization(request: Request): Response | null {
  if (!process.env.AGENT_API_KEY) {
    return Response.json({ detail: "agent API is not configured" }, { status: 503 });
  }
  if (!agentKeyMatches(request)) {
    return Response.json({ detail: "unauthorized" }, { status: 401 });
  }
  return null;
}

export function isAgentAuthorized(request: Request) {
  return agentKeyMatches(request);
}
