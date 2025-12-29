import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format numbers in Indian numeric system (lakhs, crores)
export function formatIndianNumber(num: number): string {
  if (num === 0) return "0";

  const absoluteNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absoluteNum < 1000) {
    return sign + absoluteNum.toString();
  } else if (absoluteNum < 100000) {
    // Thousands (1,000 to 99,999)
    return sign + absoluteNum.toLocaleString("en-IN");
  } else if (absoluteNum < 10000000) {
    // Lakhs (1,00,000 to 99,99,999)
    return sign + absoluteNum.toLocaleString("en-IN");
  } else {
    // Crores (1,00,00,000 and above)
    return sign + absoluteNum.toLocaleString("en-IN");
  }
}

// Format currency in Indian numeric system
export function formatIndianCurrency(amount: number): string {
  return `₹${formatIndianNumber(amount)}`;
}
