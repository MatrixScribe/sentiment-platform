import { NextResponse } from "next/server";
import { computeFinalPrice } from "@/lib/pricingEngine";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await computeFinalPrice({
    countryCode: body.countryCode,
    operatorId: body.operatorId,
    productType: body.productType,
    operatorCost: body.operatorCost,
    amount: body.amount,
    fxRate: body.fxRate,
  });

  return NextResponse.json(result);
}
