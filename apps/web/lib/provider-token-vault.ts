import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { requireServerEnv } from "./env";

const tokenPrefix = "vault:v1";

function getKey() {
  return createHash("sha256").update(requireServerEnv("betterAuthSecret")).digest();
}

export type StoredProviderToken = {
  token: string;
  username?: string;
  baseUrl?: string;
};

export function encryptProviderToken(value: StoredProviderToken) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [tokenPrefix, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptProviderToken(value: string | null | undefined): StoredProviderToken | null {
  if (!value?.startsWith(`${tokenPrefix}:`)) {
    return null;
  }

  const [, , ivValue, tagValue, encryptedValue] = value.split(":");

  if (!ivValue || !tagValue || !encryptedValue) {
    return null;
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(decrypted) as StoredProviderToken;

    return typeof parsed.token === "string" ? parsed : null;
  } catch {
    return null;
  }
}
