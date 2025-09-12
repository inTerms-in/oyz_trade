import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
// Removed html2canvas and jsPDF imports
// Removed supabase import as it's no longer used in this file

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateItemCode(categoryName: string | undefined, itemId: number, existingItemCode?: string | null): string {
  if (existingItemCode) {
    return existingItemCode;
  }

  if (!categoryName) {
    return `ITEM-${itemId}`;
  }
  
  const words = categoryName.trim().split(/\s+/);
  let prefix = '';

  if (words.length > 1) {
    // For multiple words, e.g., "Gift Item" -> "GI"
    prefix = (words[0][0] + (words[1][0] || '')).toUpperCase();
  } else if (words[0].length > 1) {
    // For a single word, e.g., "Grocery" -> "GR"
    prefix = words[0].substring(0, 2).toUpperCase();
  } else if (words[0].length === 1) {
    // For a single-letter word
    prefix = words[0][0].toUpperCase() + 'X';
  } else {
    // Fallback
    prefix = 'XX';
  }

  return `${prefix}${itemId}`;
}

// Removed generateAndUploadPdf function