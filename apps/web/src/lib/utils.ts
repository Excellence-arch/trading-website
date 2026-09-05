import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, symbol: string = 'BTCUSDT'): string {
  if (price === undefined || price === null || isNaN(price)) return '$0.00';

  let minDecimals = 2;
  let maxDecimals = 2;

  if (price < 0.0001) {
    minDecimals = 6;
    maxDecimals = 8;
  } else if (price < 0.01) {
    minDecimals = 5;
    maxDecimals = 6;
  } else if (price < 1) {
    minDecimals = 4;
    maxDecimals = 6;
  } else if (price < 10) {
    minDecimals = 3;
    maxDecimals = 4;
  } else if (price < 100) {
    minDecimals = 2;
    maxDecimals = 3;
  } else {
    minDecimals = 2;
    maxDecimals = 2;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(price);
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}

export function formatRMultiple(r: number | undefined | null): string {
  if (r === undefined || r === null || isNaN(r)) return '0.00R';
  const prefix = r > 0 ? '+' : '';
  return `${prefix}${r.toFixed(2)}R`;
}

export function formatDate(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${month} ${day}, ${year} ${hours}:${minutes} UTC`;
}

export function formatShortDate(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatDateTime(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} UTC`;
}

