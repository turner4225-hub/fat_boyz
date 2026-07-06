import { NextRequest, NextResponse } from "next/server";
import { sendWeighInReminders, sendWinnerAnnouncements } from "@/lib/push";

/**
 * Daily cron:
 *  - remind members who haven't weighed in on their challenge's weigh-in day
 *  - announce winners for challenges that ended yesterday
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reminders = await sendWeighInReminders();
    const winners = await sendWinnerAnnouncements();
    return NextResponse.json({ ok: true, reminders, winners });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
