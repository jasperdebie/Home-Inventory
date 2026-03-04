export const APP_NAME = 'Home Inventory';
export const PIN_COOKIE_NAME = 'home-inventory-auth';
export const PIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const STOCK_STATUS = {
  OK: 'ok',
  LOW: 'low',
  OUT: 'out',
} as const;

export type StockStatus = (typeof STOCK_STATUS)[keyof typeof STOCK_STATUS];

export function getStockStatus(current: number, min: number): StockStatus {
  if (current <= 0) return STOCK_STATUS.OUT;
  if (current < min) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}

export const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'bottle', 'can', 'box', 'bag'] as const;
