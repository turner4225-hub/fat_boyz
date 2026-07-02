import { NextRequest, NextResponse } from "next/server";
import { sendWeighInReminders } from "@/lib/push";

/** Daily cron: remind members who haven't weighed in on their challenge's weigh-in day. */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeighInReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
