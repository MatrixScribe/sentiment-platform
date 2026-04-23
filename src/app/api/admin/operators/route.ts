import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const operators = await db.operatorMarkup.findMany({
    orderBy: { operatorId: "asc" },
  });
  return NextResponse.json(operators);
}

export async function POST(req: Request) {
  const body = await req.json();

  const operator = await db.operatorMarkup.upsert({
    where: { operatorId: body.operatorId },
    update: { markupPercent: body.markupPercent },
    create: {
      operatorId: body.operatorId,
      markupPercent: body.markupPercent,
    },
  });

  return NextResponse.json(operator);
}
