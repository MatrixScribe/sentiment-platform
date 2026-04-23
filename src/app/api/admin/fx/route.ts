import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const fx = await db.fxSpread.findFirst();
  return NextResponse.json(fx || {});
}

export async function POST(req: Request) {
  const body = await req.json();
  const existing = await db.fxSpread.findFirst();

  const data = {
    spreadPercent: body.spreadPercent,
  };

  const fx = existing
    ? await db.fxSpread.update({ where: { id: existing.id }, data })
    : await db.fxSpread.create({ data });

  return NextResponse.json(fx);
}
