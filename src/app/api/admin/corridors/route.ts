import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const corridors = await db.corridorMarkup.findMany({
    orderBy: { countryCode: "asc" },
  });
  return NextResponse.json(corridors);
}

export async function POST(req: Request) {
  const body = await req.json();

  const corridor = await db.corridorMarkup.upsert({
    where: { countryCode: body.countryCode },
    update: { markupPercent: body.markupPercent },
    create: {
      countryCode: body.countryCode,
      markupPercent: body.markupPercent,
    },
  });

  return NextResponse.json(corridor);
}
