import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const fee = await db.platformFee.findFirst();
  return NextResponse.json(fee || {});
}

export async function POST(req: Request) {
  const body = await req.json();
  const existing = await db.platformFee.findFirst();

  const data = {
    feeFlat: body.feeFlat,
    feePercent: body.feePercent,
  };

  const fee = existing
    ? await db.platformFee.update({ where: { id: existing.id }, data })
    : await db.platformFee.create({ data });

  return NextResponse.json(fee);
}
