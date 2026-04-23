import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tiers = await db.tierMarkup.findMany({
    orderBy: { minAmount: "asc" },
  });
  return NextResponse.json(tiers);
}

export async function POST(req: Request) {
  const body = await req.json();

  const tier = await db.tierMarkup.create({
    data: {
      minAmount: body.minAmount,
      maxAmount: body.maxAmount,
      markupPercent: body.markupPercent,
    },
  });

  return NextResponse.json(tier);
}
