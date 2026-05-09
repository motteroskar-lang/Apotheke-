import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain, data } = await req.json();

  const systemPrompt = `You are an analytical performance coach analyzing behavioral data.
Be direct, brief, and non-motivational. Report patterns as observed facts.
No affirmations. No generic encouragement. No filler.
Output format:
- 2-3 factual observations (1 sentence each)
- 1 actionable recommendation (specific, not generic)
Total response: under 150 words.`;

  const userMessage = `Analyze this ${domain} performance data for the past 30 days:\n${JSON.stringify(data, null, 2)}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ insight: content.text });
}
