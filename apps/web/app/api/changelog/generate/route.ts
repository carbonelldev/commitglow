import {
  type ChangelogGenerationOptions,
  changelogModel,
  changelogSystemPrompt,
  changelogUserPrompt,
} from "@/lib/ai";
import { auth } from "@/lib/auth";
import { getActiveOrganization } from "@/lib/organizations";
import { formatUsageResetDate, getPlanUsageSnapshot } from "@/lib/plan-usage";
import { trackMeteredUsage } from "@/lib/metered-usage";
import { streamText } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const audiences = new Set(["users", "developers", "stakeholders"]);
const details = new Set(["concise", "balanced", "detailed"]);
const tones = new Set(["professional", "friendly", "technical"]);
const technicalDetails = new Set(["minimal", "balanced", "include"]);

function normalizeGenerationOptions(value: unknown): ChangelogGenerationOptions {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const instructions = typeof input.instructions === "string" ? input.instructions.trim().slice(0, 1200) : "";

  return {
    audience: typeof input.audience === "string" && audiences.has(input.audience) ? input.audience as ChangelogGenerationOptions["audience"] : "users",
    detail: typeof input.detail === "string" && details.has(input.detail) ? input.detail as ChangelogGenerationOptions["detail"] : "balanced",
    tone: typeof input.tone === "string" && tones.has(input.tone) ? input.tone as ChangelogGenerationOptions["tone"] : "professional",
    technicalDetails: typeof input.technicalDetails === "string" && technicalDetails.has(input.technicalDetails) ? input.technicalDetails as ChangelogGenerationOptions["technicalDetails"] : "balanced",
    instructions,
  };
}

function normalizeCommits(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const commit = entry as Record<string, unknown>;
    const sha = typeof commit.sha === "string" ? commit.sha.trim() : "";
    const message = typeof commit.message === "string" ? commit.message.trim() : "";
    const changeSummary = typeof commit.changeSummary === "string" ? commit.changeSummary.trim().slice(0, 2000) : null;

    return sha && message ? [{ sha: sha.slice(0, 80), message: message.slice(0, 4000), changeSummary }] : [];
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const usage = await getPlanUsageSnapshot(session.user, organization);

  if (!usage.generations.canGenerate) {
    return NextResponse.json(
      { error: `Monthly generation limit reached. Your ${usage.planLabel} plan resets on ${formatUsageResetDate(usage.resetAt)}.` },
      { status: 402 },
    );
  }

  const body = await request.json() as Record<string, unknown>;
  const commits = normalizeCommits(body.commits);
  const options = normalizeGenerationOptions(body.options);
  const usageEventId = crypto.randomUUID();

  if (!Array.isArray(commits) || commits.length === 0) {
    return NextResponse.json(
      { error: "Invalid request: no commits provided." },
      { status: 400 },
    );
  }

  if (commits.length > 60) {
    return NextResponse.json(
      { error: "Too many commits. Maximum is 60." },
      { status: 400 },
    );
  }

  const result = streamText({
    model: changelogModel,
    system: changelogSystemPrompt,
    prompt: changelogUserPrompt(commits, options),
    async onFinish({ text }) {
      console.log("Changelog generated", { length: text.length });
      try {
        await trackMeteredUsage({
          userId: session.user.id,
          organizationId: organization.id,
          type: "generation",
          idempotencyKey: usageEventId,
          metadata: {
            commit_count: commits.length,
            output_length: text.length,
            audience: options.audience ?? "users",
            detail: options.detail ?? "balanced",
            generation_path: "streaming_api",
          },
        });
      } catch (error) {
        console.error("Failed to track changelog generation usage", error);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
