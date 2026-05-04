import { createHmac, timingSafeEqual } from "node:crypto";
import { requireServerEnv } from "./env";

type ProviderOAuthState = {
  userId: string;
  organizationId: string;
  createdAt: number;
};

function sign(value: string) {
  return createHmac("sha256", requireServerEnv("betterAuthSecret")).update(value).digest("base64url");
}

export function createProviderOAuthState(userId: string, organizationId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, organizationId, createdAt: Date.now() } satisfies ProviderOAuthState)).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyProviderOAuthState(value: string | null) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ProviderOAuthState;

    if (Date.now() - parsed.createdAt > 10 * 60 * 1000) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
