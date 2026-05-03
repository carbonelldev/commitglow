import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";

// better-auth owns validation, session issuance, and provider callback handling for this route.
export const { GET, POST } = toNextJsHandler(auth.handler);
