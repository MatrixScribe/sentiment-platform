import { NextResponse } from "next/server";

export async function POST() {
  // TODO: tomorrow:
  // 1) Call Reloadly APIs
  // 2) Store operators/products with operatorCost in DB
  // 3) Map to internal operatorId/productType
  return NextResponse.json({ status: "reloadly sync stub" });
}
