import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();

  const entry = await db.ledgerEntry.create({
    data: {
      id: body.id,
      type: body.type,
      amount: body.amount,
      currency: body.currency || "USD",
      description: body.description,
      timestamp: new Date(body.timestamp),

      operatorCost: body.operatorCost ?? null,
      corridorMarkup: body.corridorMarkup ?? null,
      operatorMarkup: body.operatorMarkup ?? null,
      productMarkup: body.productMarkup ?? null,
      tierMarkup: body.tierMarkup ?? null,
      totalMarkupPct: body.totalMarkupPct ?? null,
      markupAmount: body.markupAmount ?? null,
      feeAmount: body.feeAmount ?? null,
      fxRate: body.fxRate ?? null,
      fxSpreadAmount: body.fxSpreadAmount ?? null,
      runningBalance: body.runningBalance ?? null,
    },
  });

  return NextResponse.json(entry);
}
