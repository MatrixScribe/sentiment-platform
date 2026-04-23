import { NextResponse } from "next/server";

export async function GET() {
  // This will be called by an external cron (e.g. GitHub Actions, Railway, etc.)
  // It should:
  // - Trigger Reloadly sync
  // - Trigger Ding sync
  // - Refresh FX if needed

  // For now, just a stub.
  return NextResponse.json({ status: "cron stub" });
}
