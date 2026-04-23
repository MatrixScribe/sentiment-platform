// src/lib/pricingEngine.ts
import { db } from "@/lib/db";

type PricingInput = {
  countryCode: string;
  operatorId: string;
  productType: string; // "airtime" | "data" | "utilities"
  operatorCost: number;
  amount: number;
  fxRate: number;
};

export async function computeFinalPrice(input: PricingInput) {
  const {
    countryCode,
    operatorId,
    productType,
    operatorCost,
    amount,
    fxRate,
  } = input;

  const [corridor, operator, product, tier, fee, fx] = await Promise.all([
    db.corridorMarkup.findFirst({ where: { countryCode } }),
    db.operatorMarkup.findFirst({ where: { operatorId } }),
    db.productMarkup.findFirst({ where: { productType } }),
    db.tierMarkup.findFirst({
      where: {
        minAmount: { lte: amount },
        maxAmount: { gte: amount },
      },
    }),
    db.platformFee.findFirst(),
    db.fxSpread.findFirst(),
  ]);

  const corridorMarkup = Number(corridor?.markupPercent || 0);
  const operatorMarkup = Number(operator?.markupPercent || 0);
  const productMarkup = Number(product?.markupPercent || 0);
  const tierMarkup = Number(tier?.markupPercent || 0);

  const totalMarkupPercent =
    corridorMarkup + operatorMarkup + productMarkup + tierMarkup;

  const markupAmount = operatorCost * totalMarkupPercent;
  const fxSpreadPercent = Number(fx?.spreadPercent || 0);
  const fxSpreadAmount = operatorCost * fxSpreadPercent;

  const feeFlat = Number(fee?.feeFlat || 0);
  const feePercent = Number(fee?.feePercent || 0);
  const feeAmount = feeFlat + operatorCost * feePercent;

  const finalPrice = operatorCost + markupAmount + fxSpreadAmount + feeAmount;

  return {
    operatorCost,
    corridorMarkup,
    operatorMarkup,
    productMarkup,
    tierMarkup,
    totalMarkupPercent,
    markupAmount,
    feeAmount,
    fxSpreadAmount,
    fxRate,
    finalPrice,
  };
}
