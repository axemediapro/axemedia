export interface ServiceTierConfig {
  id?: number;
  name: string;
  defaultPrice: number;
  unit?: string | null;
  price1h?: number | null;
  price2to5h?: number | null;
  price5to8h?: number | null;
}

/**
 * Checks if a service has tiered pricing configured or is an hourly lift service.
 */
export function hasTierPricing(service: ServiceTierConfig): boolean {
  return (
    (service.price1h != null && service.price1h > 0) ||
    (service.price2to5h != null && service.price2to5h > 0) ||
    (service.price5to8h != null && service.price5to8h > 0) ||
    /lift/i.test(service.name)
  );
}

/**
 * Calculates the unit price for a given quantity (hours) based on service tier pricing.
 * Rules:
 * - 1 hour (quantity <= 1): price1h (default 70€/ora)
 * - 2-5 hours (1 < quantity <= 5): price2to5h (default 60€/ora)
 * - 5-8 hours / > 5 hours: price5to8h (default 50€/ora)
 */
export function calculateServiceUnitPrice(
  service: ServiceTierConfig,
  quantity: number
): number {
  const q = Number(quantity) || 0;
  const isLift = /lift/i.test(service.name);

  const p1 = service.price1h ?? (isLift ? 70 : service.defaultPrice);
  const p2to5 = service.price2to5h ?? (isLift ? 60 : service.defaultPrice);
  const p5to8 = service.price5to8h ?? (isLift ? 50 : service.defaultPrice);

  const hasTiers =
    (service.price1h != null && service.price1h > 0) ||
    (service.price2to5h != null && service.price2to5h > 0) ||
    (service.price5to8h != null && service.price5to8h > 0) ||
    isLift;

  if (hasTiers) {
    if (q <= 1) {
      return p1 || 70;
    } else if (q <= 5) {
      return p2to5 || 60;
    } else {
      return p5to8 || 50;
    }
  }

  return service.defaultPrice || 0;
}
