import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const products = await db.productMarkup.findMany({
    orderBy: { productType: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();

  const product = await db.productMarkup.upsert({
    where: { productType: body.productType },
    update: { markupPercent: body.markupPercent },
    create: {
      productType: body.productType,
      markupPercent: body.markupPercent,
    },
  });

  return NextResponse.json(product);
}
