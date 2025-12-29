// Shared utility functions for the Invoice feature

export const getSupportedFormats = () => [
  "PDF files (.pdf)",
  "Excel files (.xlsx, .xls)",
  "Image files (.jpg, .jpeg, .png)",
];

export const normalizeName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

export const numberToWords = (num: number) => {
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const thousands = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero";

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return `${tens[Math.floor(n / 10)]} ${units[n % 10]}`.trim();
    return `${units[Math.floor(n / 100)]} Hundred ${convertLessThanThousand(
      n % 100
    )}`.trim();
  };

  let result = "";
  let place = 0;
  while (num > 0) {
    if (num % 1000 !== 0) {
      let part = convertLessThanThousand(num % 1000);
      if (place > 0) part += ` ${thousands[place]}`;
      result = `${part} ${result}`.trim();
    }
    num = Math.floor(num / 1000);
    place++;
  }
  return `${result} Rupees Only`.toUpperCase();
};

export const formatCurrency = (
  amount: number | string | null | undefined
): string => {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || amount === null || amount === undefined) {
    return "₹0";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase?.()) {
    case "paid":
      return "bg-green-100 text-green-800 border-green-200";
    case "sent":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};
