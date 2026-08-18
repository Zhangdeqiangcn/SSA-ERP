const VENDOR_RATING_LABELS = {
  quality: "质量合格率",
  delivery: "交期达成率",
  price: "价格竞争力"
};
function computeVendorRating(input, config) {
  const indicators = [
    { key: "quality", label: VENDOR_RATING_LABELS.quality, value: input.qualityPassRate, available: input.qualityPassRate !== null },
    { key: "delivery", label: VENDOR_RATING_LABELS.delivery, value: input.onTimeDeliveryRate, available: input.onTimeDeliveryRate !== null },
    { key: "price", label: VENDOR_RATING_LABELS.price, value: input.priceCompetitiveness, available: input.priceCompetitiveness !== null }
  ];
  const available = indicators.filter((i) => i.available);
  if (available.length === 0) {
    return { score: null, grade: "数据不足", indicators };
  }
  const weightSum = available.reduce((s, i) => s + (config.weights[i.key] || 0), 0);
  const sum = available.reduce((s, i) => s + (i.value ?? 0) * (config.weights[i.key] || 0), 0);
  const score = weightSum > 0 ? Math.round(sum / weightSum) : 0;
  let grade;
  if (score >= config.thresholds.A) grade = "A";
  else if (score >= config.thresholds.B) grade = "B";
  else if (score >= config.thresholds.C) grade = "C";
  else grade = "D";
  return { score, grade, indicators };
}
function buildVendorRatingInput(params) {
  const { inspectionTasks, purchaseOrders, priceList, vendorId } = params;
  const vendorInspections = inspectionTasks.filter((t) => t.vendorId === vendorId);
  const qualityPassRate = vendorInspections.length === 0 ? null : Math.round(
    vendorInspections.filter((t) => t.status === "passed").length / vendorInspections.length * 100
  );
  const delivered = purchaseOrders.filter(
    (o) => o.vendorId === vendorId && !!o.actualDeliveryDate
  );
  const onTimeDeliveryRate = delivered.length === 0 ? null : Math.round(
    delivered.filter((o) => o.actualDeliveryDate <= o.expectedDeliveryDate).length / delivered.length * 100
  );
  const vendorPrices = priceList.filter((p) => p.vendorId === vendorId && p.status === "active");
  let priceCompetitiveness = null;
  if (vendorPrices.length > 0) {
    const scores = vendorPrices.map((vp) => {
      const minForMaterial = Math.min(
        ...priceList.filter((p) => p.materialId === vp.materialId && p.status === "active").map((p) => p.unitPrice)
      );
      if (minForMaterial <= 0) return 100;
      return Math.min(100, Math.round(minForMaterial / vp.unitPrice * 100));
    });
    priceCompetitiveness = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  return { qualityPassRate, onTimeDeliveryRate, priceCompetitiveness };
}
export {
  buildVendorRatingInput as b,
  computeVendorRating as c
};
