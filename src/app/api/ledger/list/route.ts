import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const entries = await db.ledgerEntry.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return NextResponse.json(entries);
}
