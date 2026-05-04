import {
  changelogModel,
  changelogSystemPrompt,
  changelogUserPrompt,
} from "@/lib/ai";
import { auth } from "@/lib/auth";
import { streamText } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commits } = (await request.json()) as {
    commits: Array<{ sha: string; message: string }>;
  };

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
    prompt: changelogUserPrompt(commits),
    onFinish({ text }) {
      console.log("Changelog generated", { length: text.length });
    },
  });

  return result.toUIMessageStreamResponse();
}
